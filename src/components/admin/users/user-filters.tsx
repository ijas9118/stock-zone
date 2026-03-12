"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserFiltersProps {
  shopTypes: { id: string; name: string; is_active: boolean }[];
}

export function UserFilters({ shopTypes }: UserFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentShopType = searchParams.get("shop_type") ?? "all";

  const handleShopTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("shop_type");
    } else {
      params.set("shop_type", value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={currentShopType} onValueChange={handleShopTypeChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Shop Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Shops</SelectItem>
        <SelectItem value="none">Unassigned</SelectItem>
        {shopTypes.map((type) => (
          <SelectItem key={type.id} value={type.id}>
            {type.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
