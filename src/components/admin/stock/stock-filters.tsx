"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import {
  Category,
  getSubcategories,
  Subcategory,
} from "@/actions/admin/categories";
import { ShopType } from "@/actions/admin/shops";
import { Warehouse } from "@/actions/admin/warehouses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface StockFiltersProps {
  initialWarehouses: Warehouse[];
  initialShopTypes: ShopType[];
  initialCategories: Category[];
}

const SORT_OPTIONS = [
  { value: "none", label: "Default" },
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
  { value: "sku_asc", label: "SKU (A-Z)" },
  { value: "sku_desc", label: "SKU (Z-A)" },
  { value: "quantity_asc", label: "Quantity (Low-High)" },
  { value: "quantity_desc", label: "Quantity (High-Low)" },
] as const;

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentCategory = searchParams.get("category_id") || "all";

  const activeFiltersArr = {
    warehouse_id: searchParams.get("warehouse_id"),
    shop_type_id: searchParams.get("shop_type_id"),
    category_id: searchParams.get("category_id"),
    sub_category_id: searchParams.get("sub_category_id"),
    stock_status: searchParams.get("stock_status"),
    q: searchParams.get("q"),
  };

  const activeFilterCount =
    Object.values(activeFiltersArr).filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;

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

    if (key === "category_id") {
      params.delete("sub_category_id");
    }

    params.set("page", "1");
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  const currentSort = (() => {
    const sortBy = searchParams.get("sort_by");
    const sortDir = searchParams.get("sort_dir");
    if (!sortBy) return "none";
    return `${sortBy}_${sortDir ?? "asc"}`;
  })();

  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "none") {
      params.delete("sort_by");
      params.delete("sort_dir");
    } else {
      const [sortBy, sortDir] = value.split("_");
      params.set("sort_by", sortBy);
      params.set("sort_dir", sortDir);
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <>
      <div className="border-muted-foreground/10 bg-muted/30 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 backdrop-blur-sm">
        {/* Mobile Trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDrawerOpen(true)}
          className="bg-background border-muted-foreground/15 h-8 gap-1.5 text-xs md:hidden"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasFilters && (
            <span className="bg-primary text-primary-foreground flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Desktop Controls */}
        <div className="hidden md:contents">
          {/* Warehouse */}
          <Select
            value={searchParams.get("warehouse_id") || "all"}
            onValueChange={(v) => updateFilter("warehouse_id", v)}
          >
            <SelectTrigger className="bg-background border-muted-foreground/15 h-8 w-[140px] rounded-lg text-xs shadow-none">
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

          {/* Shop Type */}
          <Select
            value={searchParams.get("shop_type_id") || "all"}
            onValueChange={(v) => updateFilter("shop_type_id", v)}
          >
            <SelectTrigger className="bg-background border-muted-foreground/15 h-8 w-[130px] rounded-lg text-xs shadow-none">
              <SelectValue placeholder="All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shops</SelectItem>
              {initialShopTypes.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select
            value={searchParams.get("category_id") || "all"}
            onValueChange={(v) => updateFilter("category_id", v)}
          >
            <SelectTrigger className="bg-background border-muted-foreground/15 h-8 w-[130px] rounded-lg text-xs shadow-none">
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

          {/* Subcategory */}
          <Select
            value={searchParams.get("sub_category_id") || "all"}
            onValueChange={(v) => updateFilter("sub_category_id", v)}
            disabled={currentCategory === "all"}
          >
            <SelectTrigger className="bg-background border-muted-foreground/15 h-8 w-[140px] rounded-lg text-xs shadow-none">
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

          {/* Sort */}
          <Select value={currentSort} onValueChange={handleSortChange}>
            <SelectTrigger className="bg-background border-muted-foreground/15 h-8 w-[170px] rounded-lg text-xs shadow-none">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reset (Desktop) */}
        {hasFilters && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground hidden h-8 gap-1.5 text-xs font-medium md:flex"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="flex w-[300px] flex-col gap-0 p-0 sm:w-[320px]"
        >
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="text-left text-base font-semibold">
              Filters
            </SheetTitle>
            <SheetDescription className="text-left text-xs">
              Refine your stock view
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
            {/* Search */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
                Search
              </Label>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  placeholder="Search products..."
                  value={searchParams.get("q") || ""}
                  onChange={(e) => updateFilter("q", e.target.value)}
                  className="bg-background border-muted-foreground/15 h-9 rounded-lg pl-9 text-sm shadow-none"
                />
              </div>
            </div>

            {/* Warehouse */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
                Warehouse
              </Label>
              <Select
                value={searchParams.get("warehouse_id") || "all"}
                onValueChange={(v) => updateFilter("warehouse_id", v)}
              >
                <SelectTrigger className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg text-sm shadow-none">
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

            {/* Shop Type */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
                Shop Type
              </Label>
              <Select
                value={searchParams.get("shop_type_id") || "all"}
                onValueChange={(v) => updateFilter("shop_type_id", v)}
              >
                <SelectTrigger className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg text-sm shadow-none">
                  <SelectValue placeholder="All Shops" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {initialShopTypes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
                Sort By
              </Label>
              <Select value={currentSort} onValueChange={handleSortChange}>
                <SelectTrigger className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg text-sm shadow-none">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-1 opacity-50" />

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
                Category
              </Label>
              <Select
                value={searchParams.get("category_id") || "all"}
                onValueChange={(v) => updateFilter("category_id", v)}
              >
                <SelectTrigger className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg text-sm shadow-none">
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

            {/* Subcategory */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
                Subcategory
              </Label>
              <Select
                value={searchParams.get("sub_category_id") || "all"}
                onValueChange={(v) => updateFilter("sub_category_id", v)}
                disabled={currentCategory === "all"}
              >
                <SelectTrigger className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg text-sm shadow-none">
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
            <div className="border-t px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleReset();
                  setDrawerOpen(false);
                }}
                className="text-muted-foreground hover:text-foreground w-full gap-2 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset All Filters
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
