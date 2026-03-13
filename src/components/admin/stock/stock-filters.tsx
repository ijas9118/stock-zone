"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Category,
  getSubcategories,
  Subcategory,
} from "@/actions/admin/categories";
import { ShopType } from "@/actions/admin/shops";
import { Warehouse } from "@/actions/admin/warehouses";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface StockFiltersProps {
  initialWarehouses: Warehouse[];
  initialShopTypes: ShopType[];
  initialCategories: Category[];
}

export function StockFilters({
  initialWarehouses,
  initialShopTypes,
  initialCategories,
}: StockFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const currentCategory = searchParams.get("category_id") || "all";

  const hasFilters =
    searchParams.get("warehouse_id") ||
    searchParams.get("shop_type_id") ||
    searchParams.get("category_id") ||
    searchParams.get("sub_category_id") ||
    searchParams.get("q");

  useEffect(() => {
    if (currentCategory && currentCategory !== "all") {
      getSubcategories({ categoryId: currentCategory, pageSize: 100 }).then(
        (res) => setSubcategories(res.subcategories)
      );
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubcategories([]);
    }
  }, [currentCategory]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // If category changes, reset subcategory
    if (key === "category_id") {
      params.delete("sub_category_id");
    }

    params.set("page", "1"); // Reset to first page
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Warehouse
          </Label>
          <Select
            value={searchParams.get("warehouse_id") || "all"}
            onValueChange={(v) => updateFilter("warehouse_id", v)}
          >
            <SelectTrigger className="bg-background border-muted-foreground/20 w-full">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {initialWarehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Shop Type
          </Label>
          <Select
            value={searchParams.get("shop_type_id") || "all"}
            onValueChange={(v) => updateFilter("shop_type_id", v)}
          >
            <SelectTrigger className="bg-background border-muted-foreground/20 w-full">
              <SelectValue placeholder="All Shop Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shop Types</SelectItem>
              {initialShopTypes.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-2 opacity-50" />

        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Category
          </Label>
          <Select
            value={searchParams.get("category_id") || "all"}
            onValueChange={(v) => updateFilter("category_id", v)}
          >
            <SelectTrigger className="bg-background border-muted-foreground/20 w-full">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {initialCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Subcategory
          </Label>
          <Select
            value={searchParams.get("sub_category_id") || "all"}
            onValueChange={(v) => updateFilter("sub_category_id", v)}
            disabled={currentCategory === "all"}
          >
            <SelectTrigger className="bg-background border-muted-foreground/20 w-full">
              <SelectValue placeholder="All Subcategories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subcategories</SelectItem>
              {subcategories.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.subcategory_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="text-muted-foreground hover:text-foreground w-full gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Filters
        </Button>
      )}
    </div>
  );
}
