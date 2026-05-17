"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";

const movementSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  shopTypeId: z.string().min(1, "Shop type is required"),
  quantityDelta: z.number().refine((n) => n !== 0, "Quantity cannot be zero"),
  notes: z.string().optional(),
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
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      productId: initialData?.product_id || "",
      warehouseId: initialData?.warehouse_id || "",
      shopTypeId: initialData?.shop_type_id || "",
      quantityDelta: mode === "out" ? -1 : 1,
      notes: "",
    },
  });

  useEffect(() => {
    if (mode === "initial") {
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
    }
  }, [mode]);

  async function onSubmit(values: MovementFormValues) {
    setLoading(true);
    try {
      // For sale, we ensure delta is negative if user entered positive.
      // But let's just trust our UI logic or enforce it here.
      let delta = values.quantityDelta;
      if (mode === "out" && delta > 0) delta = -delta;
      if (mode === "return" && delta < 0) delta = Math.abs(delta);
      if (mode === "in" && delta < 0) delta = Math.abs(delta);

      const result = await processStockMovement({
        productId: values.productId,
        warehouseId: values.warehouseId,
        shopTypeId: values.shopTypeId,
        quantityDelta: delta,
        type: mode === "initial" ? "initial_stock" : mode,
        notes: values.notes,
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
                                onSelect={() => {
                                  form.setValue("productId", p.id);
                                }}
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
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="quantityDelta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {mode === "out"
                    ? "Quantity to Deduct"
                    : mode === "in"
                      ? "Quantity to Add"
                      : mode === "return"
                        ? "Quantity to Return"
                        : "Quantity Delta"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Current stock: {initialData?.quantity || 0}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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
        </div>

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
