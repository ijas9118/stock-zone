"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowRightLeft, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  cancelTransfer,
  UserTransferWithDetails,
} from "@/actions/user/transfers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { CompleteTransferDialog } from "./complete-transfer-dialog";

interface TransferCardProps {
  transfer: UserTransferWithDetails;
  canAct: boolean;
}

export function TransferCard({ transfer, canAct }: TransferCardProps) {
  const router = useRouter();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const srcName = (transfer.source_warehouse as { name: string } | null)?.name;
  const dstName = (transfer.dest_warehouse as { name: string } | null)?.name;

  function handleCancel() {
    startTransition(() => {
      void cancelTransfer(transfer.id).then((result) => {
        if ("error" in result && result.error) {
          toast.error(result.error);
        } else {
          toast.success("Transfer cancelled");
          router.refresh();
        }
      });
    });
  }

  return (
    <>
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">
                  {transfer.products?.name || "Unknown Product"}
                </p>
                <p className="text-muted-foreground font-mono text-[11px]">
                  {transfer.products?.sku || "No SKU"}
                </p>
              </div>
              <p className="text-muted-foreground shrink-0 text-[11px]">
                {format(new Date(transfer.transferred_at), "MMM d, hh:mm a")}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium">{srcName || "—"}</span>
              <ArrowRightLeft className="text-muted-foreground h-3 w-3 shrink-0" />
              <span className="font-medium">{dstName || "—"}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-muted-foreground">
                  Qty:{" "}
                  <span className="text-foreground font-mono font-semibold">
                    {transfer.quantity}
                  </span>
                </span>
                {transfer.shop_types?.name && (
                  <span className="text-muted-foreground">
                    {transfer.shop_types.name}
                  </span>
                )}
              </div>
              {transfer.profiles && (
                <span className="text-muted-foreground text-[11px]">
                  by {transfer.profiles.full_name || transfer.profiles.email}
                </span>
              )}
            </div>

            {transfer.notes && (
              <p className="text-muted-foreground text-[11px] italic">
                {transfer.notes}
              </p>
            )}

            {canAct && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={() => setCompleteOpen(true)}
                  disabled={isPending}
                >
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs text-red-600 hover:text-red-700"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CompleteTransferDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        transferId={transfer.id}
        destWarehouseId={transfer.dest_warehouse_id}
        currentDestLocationId={transfer.dest_location_id}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
