"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import {
  createUnitOfMeasure,
  UnitOfMeasure,
  updateUnitOfMeasure,
} from "@/actions/admin/uom";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const uomSchema = z.object({
  uom_code: z.string().min(1, "Code is required").max(10, "Code too long"),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  example: z.string().optional(),
});

type UOMFormValues = z.infer<typeof uomSchema>;

interface UOMDialogProps {
  uom?: UnitOfMeasure;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UOMDialog({ uom, open, onOpenChange }: UOMDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<UOMFormValues>({
    resolver: zodResolver(uomSchema),
    defaultValues: {
      uom_code: uom?.uom_code || "",
      full_name: uom?.full_name || "",
      example: uom?.example || "",
    },
  });

  async function onSubmit(values: UOMFormValues) {
    startTransition(async () => {
      try {
        let result;
        if (uom) {
          result = await updateUnitOfMeasure(uom.id, values);
        } else {
          result = await createUnitOfMeasure(values);
        }

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(
            uom
              ? "Unit of measure updated successfully"
              : "Unit of measure created successfully"
          );
          onOpenChange(false);
          if (!uom) form.reset();
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
            {uom ? "Edit Unit of Measure" : "Create Unit of Measure"}
          </DialogTitle>
          <DialogDescription>
            {uom
              ? "Update the details of the measurement unit."
              : "Add a new measurement unit for products."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="uom_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UOM Code</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. KG, PCS, LTR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g. Kilogram, Pieces, Liter"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="example"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Example (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g. Weight, Quantity, Volume"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
                  ? uom
                    ? "Saving..."
                    : "Creating..."
                  : uom
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
