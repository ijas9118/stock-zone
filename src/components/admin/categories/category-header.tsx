"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { CategoryDialog } from "./category-dialog";

export function CategoryHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-between space-y-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">
          Manage product categories for better organization.
        </p>
      </div>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Add Category
      </Button>
      <CategoryDialog open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
}
