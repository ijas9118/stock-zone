"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { StockMovementDialog } from "./movement-dialog";

export function StockHeader() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-muted flex flex-col gap-4 border-b pb-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Inventory Command Center
        </h1>
        <p className="text-muted-foreground mt-1">
          Precision management of your stock network.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PackagePlus className="h-4 w-4" />
              Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Initial Stock</DialogTitle>
              <DialogDescription>
                Enter initial stock levels for a product in a specific
                warehouse.
              </DialogDescription>
            </DialogHeader>
            <StockMovementDialog
              mode="initial"
              onSuccess={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
