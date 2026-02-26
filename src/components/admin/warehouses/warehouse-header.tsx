"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { WarehouseDialog } from "./warehouse-dialog";

export function WarehouseHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-between space-y-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Warehouses</h1>
        <p className="text-muted-foreground">
          Manage your physical storage locations.
        </p>
      </div>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Add Warehouse
      </Button>
      <WarehouseDialog open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
}
