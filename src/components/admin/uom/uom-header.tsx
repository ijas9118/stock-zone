"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { UOMDialog } from "./uom-dialog";

export function UOMHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-between space-y-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Units of Measure</h1>
        <p className="text-muted-foreground">
          Define standard measurement units for your products.
        </p>
      </div>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Add Unit
      </Button>
      <UOMDialog open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
}
