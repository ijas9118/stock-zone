"use client";

import { useTransition } from "react";
import {
  createWarehouse,
  updateWarehouse,
  Warehouse,
} from "@/actions/admin/warehouses";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const warehouseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

interface WarehouseDialogProps {
  warehouse?: Warehouse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WarehouseDialog({
  warehouse,
  open,
  onOpenChange,
}: WarehouseDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: warehouse?.name || "",
      location: warehouse?.location || "",
      description: warehouse?.description || "",
      is_active: warehouse?.is_active ?? true,
    },
  });

  async function onSubmit(values: WarehouseFormValues) {
    startTransition(async () => {
      try {
        let result;
        if (warehouse) {
          result = await updateWarehouse(warehouse.id, values);
        } else {
          result = await createWarehouse(values);
        }

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(
            warehouse
              ? "Warehouse updated successfully"
              : "Warehouse created successfully"
          );
          onOpenChange(false);
          form.reset();
        }
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {warehouse ? "Edit Warehouse" : "Create Warehouse"}
          </DialogTitle>
          <DialogDescription>
            {warehouse
              ? "Update the details of the warehouse."
              : "Add a new warehouse to manage your stock."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g. Main Warehouse, North Hub"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. New York, London" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional details about this warehouse..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Is Active</FormLabel>
                    <DialogDescription>
                      Only active warehouses can be used for stock transfers.
                    </DialogDescription>
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? warehouse
                    ? "Saving..."
                    : "Creating..."
                  : warehouse
                    ? "Save Changes"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
