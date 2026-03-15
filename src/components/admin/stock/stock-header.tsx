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
    <div className="border-muted flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between sm:pb-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          Inventory Command Center
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
          Precision management of your stock network.
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="sm:size-default w-fit">
            <PackagePlus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
            <span>Add Stock</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Initial Stock</DialogTitle>
            <DialogDescription>
              Enter initial stock levels for a product in a specific warehouse.
            </DialogDescription>
          </DialogHeader>
          <StockMovementDialog
            mode="initial"
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
