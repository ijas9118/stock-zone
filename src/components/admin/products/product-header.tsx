"use client";

import Link from "next/link";
import { Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ProductHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          Products
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
          Manage your product catalog, categories, and inventory items.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="sm:size-default animate-fade-in w-fit"
          asChild
        >
          <Link href="/admin/products/import">
            <Upload className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
            <span>Import CSV</span>
          </Link>
        </Button>
        <Button size="sm" className="sm:size-default w-fit" asChild>
          <Link href="/admin/products/new">
            <Plus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
            <span>Add Product</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
