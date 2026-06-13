"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

import { BrandDialog } from "./brand-dialog";

export function BrandHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          Brands
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
          Manage product brands for inventory cataloging.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="sm:size-default w-fit"
        >
          <Link href="/admin/brands/import">
            <Upload className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
            <span>Import</span>
          </Link>
        </Button>
        <Button
          size="sm"
          className="sm:size-default w-fit"
          onClick={() => setIsOpen(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
          <span>Add Brand</span>
        </Button>
      </div>
      <BrandDialog open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
}
