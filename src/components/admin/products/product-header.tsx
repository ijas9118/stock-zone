"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ProductDialog } from "./product-dialog";

export function ProductHeader() {
  const [isOpen, setIsOpen] = useState(false);

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
      <Button
        size="sm"
        className="sm:size-default w-fit"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
        <span>Add Product</span>
      </Button>
      <ProductDialog open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
}
