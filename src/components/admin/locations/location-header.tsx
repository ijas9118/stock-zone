"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LocationDialog } from "./location-dialog";

export function LocationHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Locations
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage bin locations (Zone → Aisle → Rack → Bin) within warehouses.
        </p>
      </div>
      <Button size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        Add Location
      </Button>

      <LocationDialog open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
}
