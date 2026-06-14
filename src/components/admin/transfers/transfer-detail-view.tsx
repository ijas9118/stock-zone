"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
  MapPin,
  Package,
  Store,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { cancelTransfer, TransferWithDetails } from "@/actions/admin/transfers";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { CompleteTransferDialog } from "./complete-transfer-dialog";

const statusConfig = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-400",
  },
};

interface TransferDetailViewProps {
  transfer: TransferWithDetails;
}

export function TransferDetailView({ transfer }: TransferDetailViewProps) {
  const router = useRouter();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPendingStatus = transfer.status === "pending";
  const statusCfg = statusConfig[transfer.status];

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/transfers")}
          className="h-9 w-9 border"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Transfer Details
          </h1>
          <p className="text-muted-foreground font-mono text-[11px] sm:text-xs">
            {transfer.id}
          </p>
        </div>
        <div className="ml-auto">
          <Badge
            variant="outline"
            className={cn(
              "rounded-full border border-current/20 px-3 py-1 text-xs font-semibold shadow-none",
              statusCfg.className
            )}
          >
            {statusCfg.label}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4 opacity-70" /> Product
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-base font-semibold">
                {transfer.products?.name || "Unknown Product"}
              </p>
              <p className="text-muted-foreground font-mono text-xs">
                {transfer.products?.sku || "No SKU"}
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ArrowRightLeft className="h-4 w-4 opacity-70" /> Route &
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Source Warehouse
                  </p>
                  <p className="text-sm font-semibold">
                    {(transfer.source_warehouse as { name: string } | null)
                      ?.name || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Destination Warehouse
                  </p>
                  <p className="text-sm font-semibold">
                    {(transfer.dest_warehouse as { name: string } | null)
                      ?.name || "—"}
                  </p>
                </div>
              </div>
              <Separator className="opacity-60" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Quantity
                  </p>
                  <p className="font-mono font-semibold">{transfer.quantity}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    <Store className="h-3 w-3" /> Shop Type
                  </p>
                  <p className="text-sm font-medium">
                    {transfer.shop_types?.name || "—"}
                  </p>
                </div>
              </div>
              {transfer.dest_location_id && (
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    <MapPin className="h-3 w-3" /> Destination Bin
                  </p>
                  <p className="font-mono text-sm font-semibold">
                    {(
                      transfer.dest_location as { location_code: string } | null
                    )?.location_code || "—"}
                  </p>
                </div>
              )}
              {transfer.notes && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Notes
                  </p>
                  <p className="text-muted-foreground text-sm italic">
                    {transfer.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="flex items-start gap-2 text-sm">
                <User className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                    Initiated by
                  </p>
                  <p className="font-medium">
                    {transfer.profiles?.full_name ||
                      transfer.profiles?.email ||
                      "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CalendarDays className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                    Initiated at
                  </p>
                  <p className="font-medium">
                    {format(
                      new Date(transfer.transferred_at),
                      "MMM d, yyyy · hh:mm a"
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isPendingStatus && (
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => setCompleteOpen(true)}
                disabled={isPending}
              >
                Complete Transfer
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 text-red-600 hover:text-red-700"
                onClick={handleCancel}
                disabled={isPending}
              >
                <XCircle className="h-4 w-4" />
                Cancel Transfer
              </Button>
            </div>
          )}
        </div>
      </div>

      <CompleteTransferDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        transferId={transfer.id}
        destWarehouseId={transfer.dest_warehouse_id}
        currentDestLocationId={transfer.dest_location_id}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
