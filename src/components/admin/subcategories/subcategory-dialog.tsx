"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Category,
  createSubcategory,
  getCategories,
  SubcategoryWithCategory,
  updateSubcategory,
} from "@/actions/admin/categories";
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

const subcategorySchema = z.object({
  category_id: z.string().min(1, "Parent category is required"),
  subcategory_name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

type SubcategoryFormValues = z.infer<typeof subcategorySchema>;

interface SubcategoryDialogProps {
  subcategory?: SubcategoryWithCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubcategoryDialog({
  subcategory,
  open,
  onOpenChange,
}: SubcategoryDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (open) {
      getCategories({ pageSize: 100 }).then((res) => {
        setCategories(res.categories);
      });
    }
  }, [open]);

  const form = useForm<SubcategoryFormValues>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: {
      category_id: subcategory?.category_id || "",
      subcategory_name: subcategory?.subcategory_name || "",
      description: subcategory?.description || "",
    },
  });

  // Reset form when subcategory prop changes (important for edit mode)
  useEffect(() => {
    if (subcategory) {
      form.reset({
        category_id: subcategory.category_id,
        subcategory_name: subcategory.subcategory_name,
        description: subcategory.description || "",
      });
    } else {
      form.reset({
        category_id: "",
        subcategory_name: "",
        description: "",
      });
    }
  }, [subcategory, form, open]);

  async function onSubmit(values: SubcategoryFormValues) {
    startTransition(async () => {
      try {
        let result;
        if (subcategory) {
          result = await updateSubcategory(subcategory.id, values);
        } else {
          result = await createSubcategory(values);
        }

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(
            subcategory
              ? "Subcategory updated successfully"
              : "Subcategory created successfully"
          );
          onOpenChange(false);
          if (!subcategory) form.reset();
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
            {subcategory ? "Edit Subcategory" : "Create Subcategory"}
          </DialogTitle>
          <DialogDescription>
            {subcategory
              ? "Update the details of the subcategory."
              : "Add a new product subcategory."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a parent category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.category_name}
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
              name="subcategory_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategory Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="E.g. Smartphones, T-Shirts"
                      {...field}
                    />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional details about this subcategory..."
                      className="resize-none"
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
                  ? subcategory
                    ? "Saving..."
                    : "Creating..."
                  : subcategory
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
