"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Category } from "@/actions/admin/categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SubcategoryFiltersProps {
  categories: Category[];
}

export function SubcategoryFilters({ categories }: SubcategoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentCategory = searchParams.get("category_id") ?? "all";

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("category_id");
    } else {
      params.set("category_id", value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={currentCategory} onValueChange={handleCategoryChange}>
      <SelectTrigger className="w-[200px]">
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
  );
}
