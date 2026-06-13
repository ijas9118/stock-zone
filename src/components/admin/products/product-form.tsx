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
import { ArrowLeft, Info, Loader2, Plus } from "lucide-react";
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
        const brandRes = await getBrands({ pageSize: 100 });
        setBrands(brandRes.brands);
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
    <div className="mx-auto w-full max-w-5xl flex-1 pb-10">
      <Form {...form}>
        {/* Sticky Header */}
        <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-10 -mx-4 mb-8 border-b px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="h-8 w-8 shrink-0"
              >
                <Link href="/admin/products">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground hidden sm:inline">
                    Products
                  </span>
                  <span className="text-muted-foreground hidden sm:inline">
                    /
                  </span>
                  <span className="truncate font-medium">
                    {product?.name || "New Product"}
                  </span>
                </div>
                <p className="text-muted-foreground hidden text-[11px] sm:block">
                  {product
                    ? "Update catalog metadata and product attributes"
                    : "Add a new inventory catalog item to StockZone"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/products")}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="product-form"
                size="sm"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    {product ? "Saving..." : "Creating..."}
                  </>
                ) : product ? (
                  "Save Changes"
                ) : (
                  "Create Product"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <form id="product-form" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Left Column (2/3) */}
            <div className="space-y-6 md:col-span-2">
              {/* Product Identity */}
              <Card className="border-border/50 bg-background/40 shadow-sm backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Product Identity
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Description{" "}
                          <span className="text-muted-foreground font-normal">
                            (Optional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Features, specs, or product notes..."
                            className="min-h-18 resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Classification */}
              <Card className="border-border/50 bg-background/40 shadow-sm backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Classification
                  </CardTitle>
                  <CardDescription>
                    Catalog organization and brand association.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              {/* Inventory Settings */}
              <Card className="border-border/50 bg-background/40 shadow-sm backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Inventory Settings
                  </CardTitle>
                  <CardDescription>
                    Base unit of measure for stock tracking. Alternate units can
                    be configured below.
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar (1/3) */}
            <div className="space-y-4">
              {/* Listing Status */}
              <Card className="border-border/50 bg-background/40 shadow-sm backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Listing Status
                  </CardTitle>
                  <CardDescription>
                    Control visibility across inventory views.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium">
                            Active
                          </FormLabel>
                          <p className="text-muted-foreground text-[11px] leading-snug">
                            Visible to managers and stock counts
                          </p>
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

              {/* Stock Alert */}
              <Card className="border-border/50 bg-background/40 shadow-sm backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Stock Alert
                  </CardTitle>
                  <CardDescription>
                    Set a low-stock warning threshold.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="minimum_stock_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="E.g. 10"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-[11px] leading-snug">
                          Alert triggers when stock drops below this number.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>

        {/* Alternate UOM Conversions — aligned to left 2/3 column */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            {product?.id ? (
              <ProductUomConversionsCard
                productId={product.id}
                baseUomId={product.uom}
              />
            ) : (
              <Card className="border-border/50 bg-background/40 shadow-sm backdrop-blur-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <Info className="text-muted-foreground h-4 w-4 shrink-0" />
                  <p className="text-muted-foreground text-sm">
                    Save this product first to configure alternate units of
                    measure.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Brand Creation Modal */}
        <Dialog open={isQuickBrandOpen} onOpenChange={setIsQuickBrandOpen}>
          <DialogContent className="sm:max-w-90">
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
      </Form>
    </div>
  );
}
