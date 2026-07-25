"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import {
  getProductUomOptions,
  UomOption,
} from "@/actions/admin/product-uom-conversions";
import { processStockMovement, transferStock } from "@/actions/admin/stock";
import { getWarehouses } from "@/actions/admin/warehouses";
import { UserStockWithDetails } from "@/actions/user/stock";
import { Database } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type MovementSubType = Database["public"]["Enums"]["movement_sub_type"];

export type MovementActionType = "in" | "out" | "transfer" | "adjustment";

const IN_SUB_TYPES: { value: MovementSubType; label: string }[] = [
  { value: "supplier_delivery", label: "Received from Supplier" },
  { value: "customer_return", label: "Customer Return" },
  { value: "sent_from_shop", label: "Transfer from Shop" },
  { value: "initial_stock", label: "Opening Stock" },
];

const OUT_SUB_TYPES: { value: MovementSubType; label: string }[] = [
  { value: "sent_to_customer", label: "Customer Delivery" },
  { value: "sent_to_shop", label: "Transfer to Shop" },
  { value: "supplier_return", label: "Return to Supplier" },
];

const ADJUSTMENT_SUB_TYPES: { value: MovementSubType; label: string }[] = [
  { value: "stock_count_correction", label: "Stock Count Correction" },
  { value: "system_mistake", label: "System Mistake" },
  { value: "damaged_goods", label: "Damaged Goods" },
  { value: "expired_goods", label: "Expired Goods" },
  { value: "missing_lost", label: "Missing / Lost" },
  { value: "found_extra_stock", label: "Found Extra Stock" },
];

// ── Schemas ──────────────────────────────────────────────────────────────────

const inOutSchema = z.object({
  subType: z.string().min(1, "Movement type is required"),
  transactUomId: z.string().min(1, "UOM is required"),
  transactQty: z.coerce.number().positive("Quantity must be greater than 0"),
  notes: z.string().optional(),
});

const transferSchema = z.object({
  destWarehouseId: z.string().min(1, "Destination warehouse is required"),
  transactUomId: z.string().min(1, "UOM is required"),
  transactQty: z.coerce.number().positive("Quantity must be greater than 0"),
  notes: z.string().optional(),
});

const adjustmentSchema = z.object({
  subType: z.string().min(1, "Adjustment type is required"),
  direction: z.enum(["add", "remove"]),
  transactUomId: z.string().min(1, "UOM is required"),
  transactQty: z.coerce.number().positive("Quantity must be greater than 0"),
  notes: z.string().optional(),
});

type InOutValues = z.infer<typeof inOutSchema>;
type TransferValues = z.infer<typeof transferSchema>;
type AdjustmentValues = z.infer<typeof adjustmentSchema>;

// ── IN Form ───────────────────────────────────────────────────────────────────

interface InFormProps {
  stock: UserStockWithDetails;
  uomOptions: UomOption[];
  onSuccess: () => void;
}

function InForm({ stock, uomOptions, onSuccess }: InFormProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm<InOutValues>({
    resolver: zodResolver(inOutSchema),
    defaultValues: {
      subType: "",
      transactUomId: "",
      transactQty: undefined as unknown as number,
      notes: "",
    },
  });

  useEffect(() => {
    if (uomOptions.length > 0) {
      const def =
        uomOptions.find((u) => u.is_purchase_default) ??
        uomOptions.find((u) => u.is_base);
      if (def) form.setValue("transactUomId", def.id);
    }
  }, [uomOptions, form]);

  const watchedUomId = form.watch("transactUomId");
  const watchedQty = form.watch("transactQty");
  const selectedUom = uomOptions.find((u) => u.id === watchedUomId);
  const hint =
    selectedUom && !selectedUom.is_base && Number(watchedQty) > 0
      ? `= ${Math.round(Number(watchedQty) * selectedUom.conversion_factor * 1_000_000) / 1_000_000} base units`
      : null;

  async function onSubmit(values: InOutValues) {
    setLoading(true);
    const result = await processStockMovement({
      productId: stock.product_id,
      warehouseId: stock.warehouse_id,
      shopTypeId: stock.shop_type_id,
      quantityDelta: values.transactQty,
      type: "in",
      subType: values.subType as MovementSubType,
      notes: values.notes,
      transactUomId: values.transactUomId,
      transactQuantity: values.transactQty,
    });
    setLoading(false);
    if (result.error) return toast.error(result.error);
    toast.success("Stock In recorded");
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <FormField
          control={form.control}
          name="subType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Movement Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {IN_SUB_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transactUomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={uomOptions.length === 0}>
                      <SelectValue placeholder="Select UOM..." />
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
          <FormField
            control={form.control}
            name="transactQty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Quantity{selectedUom ? ` (${selectedUom.uom_code})` : ""}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.000001"
                    step="any"
                    placeholder="0"
                    className="[appearance:textfield] border-violet-600 bg-black text-white placeholder:text-zinc-500 focus-visible:ring-violet-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        (e.target.value === ""
                          ? ""
                          : Number(e.target.value)) as number
                      )
                    }
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                {hint ? (
                  <FormDescription className="text-xs text-[#7A3483] dark:text-[#C78AD0]">
                    {hint}
                  </FormDescription>
                ) : (
                  <FormDescription>
                    Current stock: {stock.quantity}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Invoice number, supplier name, etc."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Stock In
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── OUT Form ──────────────────────────────────────────────────────────────────

interface OutFormProps {
  stock: UserStockWithDetails;
  uomOptions: UomOption[];
  onSuccess: () => void;
}

function OutForm({ stock, uomOptions, onSuccess }: OutFormProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm<InOutValues>({
    resolver: zodResolver(inOutSchema),
    defaultValues: {
      subType: "",
      transactUomId: "",
      transactQty: undefined as unknown as number,
      notes: "",
    },
  });

  useEffect(() => {
    if (uomOptions.length > 0) {
      const def =
        uomOptions.find((u) => u.is_sales_default) ??
        uomOptions.find((u) => u.is_base);
      if (def) form.setValue("transactUomId", def.id);
    }
  }, [uomOptions, form]);

  const watchedUomId = form.watch("transactUomId");
  const watchedQty = form.watch("transactQty");
  const selectedUom = uomOptions.find((u) => u.id === watchedUomId);
  const hint =
    selectedUom && !selectedUom.is_base && Number(watchedQty) > 0
      ? `= ${Math.round(Number(watchedQty) * selectedUom.conversion_factor * 1_000_000) / 1_000_000} base units`
      : null;

  async function onSubmit(values: InOutValues) {
    setLoading(true);
    const result = await processStockMovement({
      productId: stock.product_id,
      warehouseId: stock.warehouse_id,
      shopTypeId: stock.shop_type_id,
      quantityDelta: -values.transactQty,
      type: "out",
      subType: values.subType as MovementSubType,
      notes: values.notes,
      transactUomId: values.transactUomId,
      transactQuantity: values.transactQty,
    });
    setLoading(false);
    if (result.error) return toast.error(result.error);
    toast.success("Stock Out recorded");
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <FormField
          control={form.control}
          name="subType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Movement Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {OUT_SUB_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transactUomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={uomOptions.length === 0}>
                      <SelectValue placeholder="Select UOM..." />
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
          <FormField
            control={form.control}
            name="transactQty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Quantity{selectedUom ? ` (${selectedUom.uom_code})` : ""}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.000001"
                    step="any"
                    placeholder="0"
                    className="[appearance:textfield] border-violet-600 bg-black text-white placeholder:text-zinc-500 focus-visible:ring-violet-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        (e.target.value === ""
                          ? ""
                          : Number(e.target.value)) as number
                      )
                    }
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                {hint ? (
                  <FormDescription className="text-xs text-[#7A3483] dark:text-[#C78AD0]">
                    {hint}
                  </FormDescription>
                ) : (
                  <FormDescription>
                    Current stock: {stock.quantity}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Customer name, order number, etc."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Stock Out
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── TRANSFER Form ─────────────────────────────────────────────────────────────

interface TransferFormProps {
  stock: UserStockWithDetails;
  uomOptions: UomOption[];
  onSuccess: () => void;
}

function TransferForm({ stock, uomOptions, onSuccess }: TransferFormProps) {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>(
    []
  );
  const form = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      destWarehouseId: "",
      transactUomId: "",
      transactQty: undefined as unknown as number,
      notes: "",
    },
  });

  useEffect(() => {
    getWarehouses({ pageSize: 100 }).then((r) =>
      setWarehouses(r.warehouses.filter((w) => w.id !== stock.warehouse_id))
    );
  }, [stock.warehouse_id]);

  useEffect(() => {
    if (uomOptions.length > 0) {
      const def =
        uomOptions.find((u) => u.is_purchase_default) ??
        uomOptions.find((u) => u.is_base);
      if (def) form.setValue("transactUomId", def.id);
    }
  }, [uomOptions, form]);

  const watchedUomId = form.watch("transactUomId");
  const watchedQty = form.watch("transactQty");
  const selectedUom = uomOptions.find((u) => u.id === watchedUomId);
  const hint =
    selectedUom && !selectedUom.is_base && Number(watchedQty) > 0
      ? `= ${Math.round(Number(watchedQty) * selectedUom.conversion_factor * 1_000_000) / 1_000_000} base units`
      : null;

  async function onSubmit(values: TransferValues) {
    setLoading(true);
    const result = await transferStock({
      productId: stock.product_id,
      sourceWarehouseId: stock.warehouse_id,
      destWarehouseId: values.destWarehouseId,
      shopTypeId: stock.shop_type_id,
      quantity: values.transactQty,
      notes: values.notes,
      transactUomId: values.transactUomId,
      transactQty: values.transactQty,
    });
    setLoading(false);
    if (result.error) return toast.error(result.error);
    toast.success("Transfer created — pending completion");
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <FormLabel>Source Warehouse</FormLabel>
            <div className="border-input bg-muted min-h-10 rounded-md border px-3 py-2 text-sm">
              <p className="truncate font-medium">{stock.warehouses?.name}</p>
              <p className="text-muted-foreground text-xs">
                Qty: {stock.quantity}
              </p>
            </div>
          </div>
          <FormField
            control={form.control}
            name="destWarehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination Warehouse</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        className="truncate"
                        placeholder="Select destination..."
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="transactUomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger
                      className="w-full"
                      disabled={uomOptions.length === 0}
                    >
                      <SelectValue placeholder="Select UOM..." />
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
          <FormField
            control={form.control}
            name="transactQty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Quantity{selectedUom ? ` (${selectedUom.uom_code})` : ""}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.000001"
                    step="any"
                    placeholder="0"
                    className="[appearance:textfield] border-violet-600 bg-black text-white placeholder:text-zinc-500 focus-visible:ring-violet-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        (e.target.value === ""
                          ? ""
                          : Number(e.target.value)) as number
                      )
                    }
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                {hint ? (
                  <FormDescription className="text-xs text-[#7A3483] dark:text-[#C78AD0]">
                    {hint}
                  </FormDescription>
                ) : (
                  <FormDescription>
                    Current stock: {stock.quantity}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea placeholder="Reason for transfer..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Transfer
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── ADJUSTMENT Form ───────────────────────────────────────────────────────────

interface AdjustmentFormProps {
  stock: UserStockWithDetails;
  uomOptions: UomOption[];
  onSuccess: () => void;
}

function AdjustmentForm({ stock, uomOptions, onSuccess }: AdjustmentFormProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm<AdjustmentValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      subType: "",
      direction: "add",
      transactUomId: "",
      transactQty: undefined as unknown as number,
      notes: "",
    },
  });

  useEffect(() => {
    if (uomOptions.length > 0) {
      const def = uomOptions.find((u) => u.is_base);
      if (def) form.setValue("transactUomId", def.id);
    }
  }, [uomOptions, form]);

  const watchedUomId = form.watch("transactUomId");
  const watchedQty = form.watch("transactQty");
  const direction = form.watch("direction");
  const selectedUom = uomOptions.find((u) => u.id === watchedUomId);
  const hint =
    selectedUom && !selectedUom.is_base && Number(watchedQty) > 0
      ? `= ${Math.round(Number(watchedQty) * selectedUom.conversion_factor * 1_000_000) / 1_000_000} base units`
      : null;

  async function onSubmit(values: AdjustmentValues) {
    setLoading(true);
    const delta =
      values.direction === "add" ? values.transactQty : -values.transactQty;
    const result = await processStockMovement({
      productId: stock.product_id,
      warehouseId: stock.warehouse_id,
      shopTypeId: stock.shop_type_id,
      quantityDelta: delta,
      type: "adjustment",
      subType: values.subType as MovementSubType,
      notes: values.notes,
      transactUomId: values.transactUomId,
      transactQuantity: delta,
    });
    setLoading(false);
    if (result.error) return toast.error(result.error);
    toast.success("Adjustment recorded");
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <FormField
          control={form.control}
          name="subType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adjustment Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select adjustment type..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ADJUSTMENT_SUB_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="direction"
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
                  variant={field.value === "remove" ? "destructive" : "outline"}
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
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transactUomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={uomOptions.length === 0}>
                      <SelectValue placeholder="Select UOM..." />
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
          <FormField
            control={form.control}
            name="transactQty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Quantity{selectedUom ? ` (${selectedUom.uom_code})` : ""}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.000001"
                    step="any"
                    placeholder="0"
                    className="[appearance:textfield] border-violet-600 bg-black text-white placeholder:text-zinc-500 focus-visible:ring-violet-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        (e.target.value === ""
                          ? ""
                          : Number(e.target.value)) as number
                      )
                    }
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                {hint ? (
                  <FormDescription className="text-xs text-[#7A3483] dark:text-[#C78AD0]">
                    {hint}
                  </FormDescription>
                ) : (
                  <FormDescription>
                    Current stock: {stock.quantity}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea placeholder="Reason for adjustment..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={direction === "remove" ? "destructive" : "default"}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Adjustment
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

interface StockMovementModalProps {
  actionType: MovementActionType;
  stock: UserStockWithDetails;
  onSuccess: () => void;
}

export function StockMovementModal({
  actionType,
  stock,
  onSuccess,
}: StockMovementModalProps) {
  const [uomOptions, setUomOptions] = useState<UomOption[]>([]);

  useEffect(() => {
    if (!stock.product_id) return;
    getProductUomOptions(stock.product_id)
      .then((r) => setUomOptions(r.allOptions))
      .catch(() => toast.error("Failed to load UOM options"));
  }, [stock.product_id]);

  if (actionType === "in")
    return (
      <InForm stock={stock} uomOptions={uomOptions} onSuccess={onSuccess} />
    );
  if (actionType === "out")
    return (
      <OutForm stock={stock} uomOptions={uomOptions} onSuccess={onSuccess} />
    );
  if (actionType === "transfer")
    return (
      <TransferForm
        stock={stock}
        uomOptions={uomOptions}
        onSuccess={onSuccess}
      />
    );
  return (
    <AdjustmentForm
      stock={stock}
      uomOptions={uomOptions}
      onSuccess={onSuccess}
    />
  );
}
