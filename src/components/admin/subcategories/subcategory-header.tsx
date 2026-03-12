"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { SubcategoryDialog } from "./subcategory-dialog";

export function SubcategoryHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-between space-y-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subcategories</h1>
        <p className="text-muted-foreground">
          Define subcategories for more granular product classification.
        </p>
      </div>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Add Subcategory
      </Button>
      <SubcategoryDialog open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
}
