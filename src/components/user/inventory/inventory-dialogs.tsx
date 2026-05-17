"use client";

import { UserStockWithDetails } from "@/actions/user/stock";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StockMovementDialog } from "@/components/admin/stock/movement-dialog";
import { StockTransferDialog } from "@/components/admin/stock/transfer-dialog";

interface InventoryDialogsProps {
  activeDialog: {
    type: "transfer" | "adjustment" | "in" | "out" | "return";
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {activeDialog?.type === "in"
              ? "Stock In"
              : activeDialog?.type === "out"
                ? "Stock Out"
                : activeDialog?.type}
            : {activeDialog?.stock.products?.name}
          </DialogTitle>
          <DialogDescription>
            Process a{" "}
            {activeDialog?.type === "in"
              ? "Stock In"
              : activeDialog?.type === "out"
                ? "Stock Out"
                : activeDialog?.type}{" "}
            transaction for this inventory item.
          </DialogDescription>
        </DialogHeader>

        {activeDialog?.type === "transfer" ? (
          <StockTransferDialog
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialData={activeDialog.stock as any}
            onSuccess={() => {
              onClose();
              onRefresh();
            }}
          />
        ) : activeDialog ? (
          <StockMovementDialog
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mode={activeDialog.type as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialData={activeDialog.stock as any}
            onSuccess={() => {
              onClose();
              onRefresh();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
