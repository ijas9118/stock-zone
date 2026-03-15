"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Category,
  getSubcategories,
  Subcategory,
} from "@/actions/admin/categories";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProductFilters({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [categories] = useState<Category[]>(initialCategories);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const currentCategory = searchParams.get("category_id") ?? "all";
  const currentSubCategory = searchParams.get("sub_category_id") ?? "all";

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

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("category_id");
      params.delete("sub_category_id");
    } else {
      params.set("category_id", value);
      params.delete("sub_category_id");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSubCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("sub_category_id");
    } else {
      params.set("sub_category_id", value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentCategory} onValueChange={handleCategoryChange}>
        <SelectTrigger className="">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.category_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentSubCategory}
        onValueChange={handleSubCategoryChange}
        disabled={currentCategory === "all"}
      >
        <SelectTrigger className="">
          <SelectValue placeholder="All Subcategories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Subcategories</SelectItem>
          {subcategories.map((sub) => (
            <SelectItem key={sub.id} value={sub.id}>
              {sub.subcategory_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
