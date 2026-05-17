"use client";

import { useEffect, useTransition } from "react";
import { Brand, createBrand, updateBrand } from "@/actions/admin/brands";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const brandSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  is_active: z.boolean().default(true),
});

type BrandFormValues = z.infer<typeof brandSchema>;

interface BrandDialogProps {
  brand?: Brand;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrandDialog({ brand, open, onOpenChange }: BrandDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: brand?.name || "",
      is_active: brand?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (brand) {
      form.reset({
        name: brand.name,
        is_active: brand.is_active,
      });
    } else {
      form.reset({
        name: "",
        is_active: true,
      });
    }
  }, [brand, form, open]);

  async function onSubmit(values: BrandFormValues) {
    startTransition(async () => {
      try {
        let result;
        if (brand) {
          result = await updateBrand(brand.id, values);
        } else {
          result = await createBrand(values);
        }

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(
            brand ? "Brand updated successfully" : "Brand created successfully"
          );
          onOpenChange(false);
          if (!brand) form.reset();
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
          <DialogTitle>{brand ? "Edit Brand" : "Create Brand"}</DialogTitle>
          <DialogDescription>
            {brand
              ? "Update the details of the brand."
              : "Add a new product brand to the catalog."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. Apple, Samsung, Nike" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <FormDescription>
                      Inactive brands will be hidden in catalog dropdowns.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                  ? brand
                    ? "Saving..."
                    : "Creating..."
                  : brand
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
