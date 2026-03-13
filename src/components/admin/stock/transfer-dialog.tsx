"use client";

import { useEffect, useState } from "react";
import { StockWithDetails, transferStock } from "@/actions/admin/stock";
import { getWarehouses } from "@/actions/admin/warehouses";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const transferSchema = z.object({
  destWarehouseId: z.string().min(1, "Destination warehouse is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

interface StockTransferDialogProps {
  initialData: StockWithDetails;
  onSuccess: () => void;
}

export function StockTransferDialog({
  initialData,
  onSuccess,
}: StockTransferDialogProps) {
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      destWarehouseId: "",
      quantity: 1,
      notes: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      setFetching(true);
      try {
        const result = await getWarehouses({ pageSize: 100 });
        // Filter out original warehouse
        setWarehouses(
          result.warehouses.filter((w) => w.id !== initialData.warehouse_id)
        );
      } catch {
        toast.error("Failed to fetch warehouses");
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [initialData.warehouse_id]);

  async function onSubmit(values: TransferFormValues) {
    if (values.quantity > initialData.quantity) {
      toast.error("Transfer quantity exceeds available stock");
      return;
    }

    setLoading(true);
    try {
      const result = await transferStock({
        productId: initialData.product_id,
        sourceWarehouseId: initialData.warehouse_id,
        destWarehouseId: values.destWarehouseId,
        shopTypeId: initialData.shop_type_id,
        quantity: values.quantity,
        notes: values.notes,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Stock transfer successful");
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <FormLabel>Source Warehouse</FormLabel>
            <div className="border-input bg-muted h-10 w-full rounded-md border px-3 py-2 text-sm">
              {initialData.warehouses?.name} (Current: {initialData.quantity})
            </div>
          </div>

          <FormField
            control={form.control}
            name="destWarehouseId"
            render={({ field }) => (
              <FormItem className="flex flex-col text-sm">
                <FormLabel>Destination Warehouse</FormLabel>
                <select
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  {...field}
                  disabled={fetching}
                >
                  <option value="">Select destination...</option>
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
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity to Transfer</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    max={initialData.quantity}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
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
                  <Textarea placeholder="Reason for transfer..." {...field} />
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
            Confirm Transfer
          </Button>
        </div>
      </form>
    </Form>
  );
}
