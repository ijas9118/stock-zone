"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brand, createBrand, getBrands } from "@/actions/admin/brands";
import {
  Category,
  getCategories,
  getSubcategories,
  Subcategory,
} from "@/actions/admin/categories";
import {
  createProduct,
  ProductWithDetails,
  updateProduct,
} from "@/actions/admin/products";
import { getUnitsOfMeasure, UnitOfMeasure } from "@/actions/admin/uom";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ProductUomConversionsCard } from "@/components/admin/products/product-uom-conversions-card";

const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().optional(),
  brand_id: z.string().optional(),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  sub_category: z.string().optional(),
  uom: z.string().min(1, "Unit of measure is required"),
  is_active: z.boolean().default(true),
  minimum_stock_quantity: z.coerce
    .number()
    .min(0, "Minimum stock must be 0 or more")
    .default(10),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: ProductWithDetails;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Quick Brand Modal State
  const [isQuickBrandOpen, setIsQuickBrandOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      sku: product?.sku || "",
      brand_id: product?.brand_id || "",
      description: product?.description || "",
      category: product?.category || "",
      sub_category: product?.sub_category || "",
      uom: product?.uom || "",
      is_active: product?.is_active ?? true,
      minimum_stock_quantity: product?.minimum_stock_quantity ?? 10,
    },
  });

  const selectedCategory = form.watch("category");

  // Initial Data Fetch
  useEffect(() => {
    Promise.all([
      getCategories({ pageSize: 100 }),
      getUnitsOfMeasure({ pageSize: 100 }),
      getBrands({ pageSize: 100 }),
    ]).then(([catRes, uomRes, brandRes]) => {
      setCategories(catRes.categories);
      setUoms(uomRes.unitsOfMeasure);
      setBrands(brandRes.brands);
    });
  }, []);

  // Fetch Subcategories on Category Change
  useEffect(() => {
    if (selectedCategory) {
      getSubcategories({ categoryId: selectedCategory, pageSize: 100 }).then(
        (res) => {
          setSubcategories(res.subcategories);
        }
      );
    } else {
      setSubcategories([]);
    }
  }, [selectedCategory]);

  // Sync Form values with product prop changes
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku || "",
        brand_id: product.brand_id || "",
        description: product.description || "",
        category: product.category || "",
        sub_category: product.sub_category || "",
        uom: product.uom || "",
        is_active: product.is_active,
        minimum_stock_quantity: product.minimum_stock_quantity ?? 10,
      });
    }
  }, [product, form]);

  async function handleQuickBrandSubmit() {
    if (!newBrandName.trim()) return;
    try {
      setIsCreatingBrand(true);
      const res = await createBrand({ name: newBrandName });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Brand added successfully");
        // Reload brand list
        const brandRes = await getBrands({ pageSize: 100 });
        setBrands(brandRes.brands);

        // Select the newly added brand automatically
        const newBrand = brandRes.brands.find(
          (b) => b.name.toLowerCase() === newBrandName.trim().toLowerCase()
        );
        if (newBrand) {
          form.setValue("brand_id", newBrand.id);
        }

        setIsQuickBrandOpen(false);
        setNewBrandName("");
      }
    } catch {
      toast.error("Failed to create brand");
    } finally {
      setIsCreatingBrand(false);
    }
  }

  async function onSubmit(values: ProductFormValues) {
    startTransition(async () => {
      try {
        let result;
        if (product) {
          result = await updateProduct(product.id, values);
        } else {
          result = await createProduct(values);
        }

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(
            product
              ? "Product updated successfully"
              : "Product created successfully"
          );
          router.push("/admin/products");
          router.refresh();
        }
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 pb-10">
      {/* Top Header Row */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="-ml-2">
          <Link href="/admin/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            {product ? "Edit Product" : "Add Product"}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {product
              ? "Update catalog metadata and product attributes."
              : "Add a new inventory catalog item to StockZone."}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Left Main Details Column (2/3 width) */}
            <div className="space-y-6 md:col-span-2">
              <Card className="border-border/50 bg-background/40 shadow-sm backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Catalog Details
                  </CardTitle>
                  <CardDescription>
                    Primary identification details of the product.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g. Apple iPhone 15 Pro Max"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU / Model Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="E.g. IPH15PM-256-BLK"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="uom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base / Stock UOM</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select UOM" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {uoms.map((uom) => (
                                <SelectItem key={uom.id} value={uom.id}>
                                  {uom.full_name} ({uom.uom_code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[11px]">
                            All stock quantities are stored in this unit.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val);
                              form.setValue("sub_category", "");
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id}
                                >
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
                      name="sub_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcategory (Optional)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            disabled={!selectedCategory}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Subcategory" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subcategories.map((sub) => (
                                <SelectItem key={sub.id} value={sub.id}>
                                  {sub.subcategory_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Write a brief overview of features, specs, or product notes..."
                            className="min-h-[120px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Attributes Column (1/3 width) */}
            <div className="space-y-6">
              {/* Branding & Status Card */}
              <Card className="border-border/50 bg-background/40 shadow-sm backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Branding & Attributes
                  </CardTitle>
                  <CardDescription>
                    Product brand and catalog listing status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Brand select with dynamic "+" inline button */}
                  <FormField
                    control={form.control}
                    name="brand_id"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="flex items-center justify-between">
                          <span>Brand (Optional)</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary/80 h-5 w-5"
                            onClick={() => setIsQuickBrandOpen(true)}
                            title="Add new brand"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Brand" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>
                                {brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Minimum Stock Alert input */}
                  <FormField
                    control={form.control}
                    name="minimum_stock_quantity"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Min. Stock Alert Threshold</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="E.g. 10"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-[11px] leading-snug">
                          Triggers alerts when stock quantities drop below this
                          number.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Status Toggle Switch */}
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="border-border/50 bg-muted/20 flex flex-row items-center justify-between rounded-xl border p-4 shadow-inner">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-semibold">
                            Active Status
                          </FormLabel>
                          <FormDescription className="text-[11px] leading-snug">
                            Visible to inventory managers and stock counts.
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
                </CardContent>
              </Card>

              {/* Form Actions (Sticky Desktop Card) */}
              <Card className="border-border/50 bg-background/40 shadow-sm backdrop-blur-md">
                <CardContent className="flex flex-col gap-3 p-4">
                  <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {product ? "Saving Changes..." : "Adding Product..."}
                      </>
                    ) : product ? (
                      "Save Changes"
                    ) : (
                      "Create Product"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/admin/products")}
                    className="w-full"
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>

      {product?.id && (
        <ProductUomConversionsCard
          productId={product.id}
          baseUomId={product.uom}
        />
      )}

      {/* Inline Quick Brand Creation Modal */}
      <Dialog open={isQuickBrandOpen} onOpenChange={setIsQuickBrandOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-base">Quick Add Brand</DialogTitle>
            <DialogDescription className="text-xs">
              Add a brand directly without losing your product progress.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Brand Name</Label>
              <Input
                placeholder="E.g. Apple, Google, Sony"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                disabled={isCreatingBrand}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsQuickBrandOpen(false)}
              disabled={isCreatingBrand}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleQuickBrandSubmit}
              disabled={isCreatingBrand || !newBrandName.trim()}
            >
              {isCreatingBrand ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Brand"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
