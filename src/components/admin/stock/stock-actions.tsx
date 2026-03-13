"use client";

import { useState } from "react";
import { StockWithDetails } from "@/actions/admin/stock";
import {
  ArrowLeftRight,
  Edit2,
  MoreHorizontal,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { StockMovementDialog } from "./movement-dialog";
import { StockTransferDialog } from "./transfer-dialog";

interface StockActionsProps {
  stock: StockWithDetails;
}

export function StockActions({ stock }: StockActionsProps) {
  const [movementMode, setMovementMode] = useState<
    "adjustment" | "purchase" | "sale" | "return" | null
  >(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setMovementMode("adjustment")}>
            <Edit2 className="mr-2 h-4 w-4" />
            Adjustment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsTransferOpen(true)}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Transfer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setMovementMode("sale")}>
            <TrendingDown className="text-destructive mr-2 h-4 w-4" />
            Sale
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMovementMode("return")}>
            <RotateCcw className="text-primary mr-2 h-4 w-4" />
            Return
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMovementMode("purchase")}>
            <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
            Purchase
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={!!movementMode}
        onOpenChange={(open) => !open && setMovementMode(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {movementMode} Stock
            </DialogTitle>
            <DialogDescription>
              {stock.products?.name} ({stock.warehouses?.name})
            </DialogDescription>
          </DialogHeader>
          <StockMovementDialog
            mode={movementMode!}
            initialData={stock}
            onSuccess={() => setMovementMode(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transfer Stock</DialogTitle>
            <DialogDescription>
              Move {stock.products?.name} from {stock.warehouses?.name} to
              another warehouse.
            </DialogDescription>
          </DialogHeader>
          <StockTransferDialog
            initialData={stock}
            onSuccess={() => setIsTransferOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
