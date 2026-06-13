"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LocationDialog } from "./location-dialog";

export function LocationHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Locations
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage bin locations (Zone → Aisle → Rack → Bin) within warehouses.
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link href="/admin/locations/import">
            <Upload className="mr-1.5 h-4 w-4" />
            Import
          </Link>
        </Button>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Location
        </Button>
      </div>

      <LocationDialog open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
}
