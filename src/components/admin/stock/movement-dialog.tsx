"use client";

import { useEffect, useState } from "react";
import {
  getProductUomOptions,
  UomOption,
} from "@/actions/admin/product-uom-conversions";
import { getLocations } from "@/actions/admin/locations";
import { getProducts } from "@/actions/admin/products";
import { getShops } from "@/actions/admin/shops";
import { processStockMovement, StockWithDetails } from "@/actions/admin/stock";
import { getWarehouses } from "@/actions/admin/warehouses";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const movementSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  shopTypeId: z.string().min(1, "Shop type is required"),
  transactUomId: z.string().min(1, "UOM is required"),
  transactQty: z.coerce.number().positive("Quantity must be greater than 0"),
  adjustmentDirection: z.enum(["add", "remove"]).default("add"),
  notes: z.string().optional(),
  locationId: z.string().optional(),
});

type MovementFormValues = z.infer<typeof movementSchema>;

interface StockMovementDialogProps {
  mode: "initial" | "adjustment" | "in" | "out" | "return";
  initialData?: StockWithDetails;
  onSuccess: () => void;
}

export function StockMovementDialog({
  mode,
  initialData,
  onSuccess,
}: StockMovementDialogProps) {
  const [products, setProducts] = useState<
    { id: string; name: string; sku: string | null }[]
  >([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>(
    []
  );
  const [shopTypes, setShopTypes] = useState<{ id: string; name: string }[]>(
    []
  );
  const [uomOptions, setUomOptions] = useState<UomOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [locations, setLocations] = useState<{ id: string; location_code: string }[]>([]);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      productId: initialData?.product_id || "",
      warehouseId: initialData?.warehouse_id || "",
      shopTypeId: initialData?.shop_type_id || "",
      transactUomId: "",
      transactQty: 1,
      adjustmentDirection: "add",
      notes: "",
    },
  });

  const watchedProductId = form.watch("productId");
  const watchedUomId = form.watch("transactUomId");
  const watchedQty = form.watch("transactQty");

  // Fetch reference data for initial mode
  useEffect(() => {
    if (mode !== "initial") return;
    const fetchData = async () => {
      setFetching(true);
      try {
        const [pResult, wResult, sResult] = await Promise.all([
          getProducts({ pageSize: 1000 }),
          getWarehouses({ pageSize: 100 }),
          getShops({ pageSize: 100 }),
        ]);
        setProducts(pResult.products);
        setWarehouses(wResult.warehouses);
        setShopTypes(sResult.shops);
      } catch {
        toast.error("Failed to fetch reference data");
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [mode]);

  // Fetch UOM options whenever the product ID is known
  useEffect(() => {
    const effectiveProductId = initialData?.product_id || watchedProductId;
    if (!effectiveProductId) return;

    getProductUomOptions(effectiveProductId)
      .then((result) => {
        setUomOptions(result.allOptions);
        // Pre-select the appropriate default UOM for this mode
        const defaultOption =
          mode === "in" || mode === "initial"
            ? (result.allOptions.find((u) => u.is_purchase_default) ??
              result.baseUom)
            : mode === "out" || mode === "return"
              ? (result.allOptions.find((u) => u.is_sales_default) ??
                result.baseUom)
              : result.baseUom;
        form.setValue("transactUomId", defaultOption.id);
      })
      .catch(() => toast.error("Failed to fetch UOM options"));
  }, [initialData?.product_id, watchedProductId, mode, form]);

  const watchedWarehouseId = form.watch("warehouseId");

  useEffect(() => {
    if (mode !== "initial" || !watchedWarehouseId) return;
    getLocations({ warehouseId: watchedWarehouseId, pageSize: 200 }).then((r) =>
      setLocations(r.locations)
    );
  }, [mode, watchedWarehouseId]);

  const selectedUomOption = uomOptions.find((u) => u.id === watchedUomId);
  const conversionHint =
    selectedUomOption && !selectedUomOption.is_base && watchedQty > 0
      ? `= ${Math.round(watchedQty * selectedUomOption.conversion_factor * 1_000_000) / 1_000_000} base units`
      : null;

  async function onSubmit(values: MovementFormValues) {
    setLoading(true);
    try {
      const isSubtraction =
        mode === "out" ||
        (mode === "adjustment" && values.adjustmentDirection === "remove");

      const signedTransactQty = isSubtraction
        ? -values.transactQty
        : values.transactQty;

      const result = await processStockMovement({
        productId: values.productId,
        warehouseId: values.warehouseId,
        shopTypeId: values.shopTypeId,
        quantityDelta: signedTransactQty,
        type: mode === "initial" ? "initial_stock" : mode,
        notes: values.notes,
        transactUomId: values.transactUomId,
        transactQuantity: signedTransactQty,
        locationId: values.locationId ?? null,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Stock ${mode} processed successfully`);
        onSuccess();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        {mode === "initial" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Product</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={fetching}
                        >
                          {field.value
                            ? products.find((p) => p.id === field.value)?.name
                            : "Select product..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search product..." />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {products.map((p) => (
                              <CommandItem
                                value={p.name}
                                key={p.id}
                                onSelect={() =>
                                  form.setValue("productId", p.id)
                                }
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    p.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {p.name}
                                {p.sku && (
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    ({p.sku})
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem className="flex flex-col text-sm">
                  <FormLabel>Warehouse</FormLabel>
                  <select
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                    disabled={fetching}
                  >
                    <option value="">Select warehouse...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shopTypeId"
              render={({ field }) => (
                <FormItem className="flex flex-col text-sm">
                  <FormLabel>Shop Type</FormLabel>
                  <select
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                    disabled={fetching}
                  >
                    <option value="">Select shop type...</option>
                    {shopTypes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedWarehouseId && (
              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem className="flex flex-col text-sm md:col-span-2">
                    <FormLabel>
                      Location{" "}
                      <span className="text-muted-foreground font-normal">
                        (Optional)
                      </span>
                    </FormLabel>
                    {locations.length > 0 ? (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bin location..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.location_code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-muted-foreground text-[11px]">
                        No locations defined for this warehouse.{" "}
                        <a href="/admin/locations" className="underline">
                          Create locations
                        </a>{" "}
                        first.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* UOM selector */}
          <FormField
            control={form.control}
            name="transactUomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={uomOptions.length === 0}>
                      <SelectValue placeholder="Loading..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {uomOptions.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.uom_code}
                        {u.is_base
                          ? " (base)"
                          : ` (1 = ${u.conversion_factor} base)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quantity */}
          <FormField
            control={form.control}
            name="transactQty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Quantity
                  {selectedUomOption ? ` (${selectedUomOption.uom_code})` : ""}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.000001"
                    step="any"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                {conversionHint ? (
                  <FormDescription className="text-xs text-blue-600 dark:text-blue-400">
                    {conversionHint}
                  </FormDescription>
                ) : (
                  <FormDescription>
                    Current stock: {initialData?.quantity ?? 0}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Adjustment direction toggle */}
        {mode === "adjustment" && (
          <FormField
            control={form.control}
            name="adjustmentDirection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Direction</FormLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={field.value === "add" ? "default" : "outline"}
                    size="sm"
                    onClick={() => field.onChange("add")}
                  >
                    + Add
                  </Button>
                  <Button
                    type="button"
                    variant={
                      field.value === "remove" ? "destructive" : "outline"
                    }
                    size="sm"
                    onClick={() => field.onChange("remove")}
                  >
                    − Remove
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Reason for adjustment, invoice number, etc."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm {mode}
          </Button>
        </div>
      </form>
    </Form>
  );
}
