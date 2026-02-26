"use client";

import { useTransition } from "react";
import { createShop, ShopType, updateShop } from "@/actions/admin/shops";
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

const shopSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type ShopFormValues = z.infer<typeof shopSchema>;

interface ShopDialogProps {
  shop?: ShopType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopDialog({ shop, open, onOpenChange }: ShopDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: shop?.name || "",
      description: shop?.description || "",
      is_active: shop?.is_active ?? true,
    },
  });

  async function onSubmit(values: ShopFormValues) {
    startTransition(async () => {
      try {
        let result;
        if (shop) {
          result = await updateShop(shop.id, values);
        } else {
          result = await createShop(values);
        }

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(
            shop
              ? "Shop type updated successfully"
              : "Shop type created successfully"
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
            {shop ? "Edit Shop Type" : "Create Shop Type"}
          </DialogTitle>
          <DialogDescription>
            {shop
              ? "Update the details of the shop type."
              : "Add a new shop type to organize your users."}
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
                    <Input placeholder="E.g. Retail, Wholesale" {...field} />
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
                      placeholder="Optional details about this shop type..."
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
                      Users can only be assigned to active shop types.
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
                  ? shop
                    ? "Saving..."
                    : "Creating..."
                  : shop
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
