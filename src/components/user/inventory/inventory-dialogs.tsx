"use client";

import { UserStockWithDetails } from "@/actions/user/stock";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { MovementActionType, StockMovementModal } from "./stock-movement-modal";

const TITLES: Record<MovementActionType, string> = {
  in: "Stock In",
  out: "Stock Out",
  transfer: "Transfer Stock",
  adjustment: "Stock Adjustment",
};

const DESCRIPTIONS: Record<MovementActionType, string> = {
  in: "Record incoming inventory for this item.",
  out: "Record outgoing inventory for this item.",
  transfer:
    "Move this item to another warehouse. Transfer will be pending until completed.",
  adjustment: "Correct the stock quantity for this item.",
};

interface InventoryDialogsProps {
  activeDialog: {
    type: MovementActionType;
    stock: UserStockWithDetails;
  } | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function InventoryDialogs({
  activeDialog,
  onClose,
  onRefresh,
}: InventoryDialogsProps) {
  return (
    <Dialog
      open={activeDialog !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {activeDialog ? TITLES[activeDialog.type] : ""}:{" "}
            {activeDialog?.stock.products?.name}
          </DialogTitle>
          <DialogDescription>
            {activeDialog ? DESCRIPTIONS[activeDialog.type] : ""}
          </DialogDescription>
        </DialogHeader>
        {activeDialog && (
          <StockMovementModal
            actionType={activeDialog.type}
            stock={activeDialog.stock}
            onSuccess={() => {
              onClose();
              onRefresh();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
