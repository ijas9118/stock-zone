"use client";

import { format } from "date-fns";

import { UserRecentMovement } from "@/actions/user/stock-movements";
import {
  DELTA_COLOR_CLASS,
  MOVEMENT_BADGE_CLASS,
  MOVEMENT_SUB_TYPE_LABELS,
  MOVEMENT_TYPE_LABELS,
} from "@/lib/movement-colors";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MovementsFeedProps {
  movements: UserRecentMovement[];
}

export function MovementsFeed({ movements }: MovementsFeedProps) {
  if (movements.length === 0) {
    return (
      <div className="border-border/60 rounded-lg border border-dashed py-14 text-center">
        <p className="text-muted-foreground text-sm">
          No stock movements in the last 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border/60 overflow-hidden rounded-lg border">
      <Table className="min-w-[680px] table-fixed">
        <colgroup>
          <col />
          <col className="w-[140px]" />
          <col className="w-[72px]" />
          <col className="w-[160px]" />
          <col className="w-[140px]" />
        </colgroup>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-4">Item</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="pl-6">Owner</TableHead>
            <TableHead className="pr-4 pl-6">Date &amp; Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="py-3 pl-4 whitespace-normal">
                <p className="truncate text-sm font-medium">{m.product_name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {m.product_sku ? `${m.product_sku} · ` : ""}
                  {m.warehouse_name} · {m.shop_type_name}
                </p>
                {m.notes && (
                  <p className="text-muted-foreground/80 truncate text-xs italic">
                    &ldquo;{m.notes}&rdquo;
                  </p>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                      MOVEMENT_BADGE_CLASS[m.type] ??
                        "bg-muted text-muted-foreground"
                    )}
                  >
                    {MOVEMENT_TYPE_LABELS[m.type] ?? m.type}
                  </span>
                  {m.sub_type && MOVEMENT_SUB_TYPE_LABELS[m.sub_type] && (
                    <span className="text-muted-foreground text-[10px]">
                      {MOVEMENT_SUB_TYPE_LABELS[m.sub_type]}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell
                className={cn(
                  "text-right text-sm font-semibold whitespace-nowrap",
                  m.quantity_delta >= 0
                    ? DELTA_COLOR_CLASS.positive
                    : DELTA_COLOR_CLASS.negative
                )}
              >
                {m.quantity_delta >= 0 ? "+" : ""}
                {m.quantity_delta}
              </TableCell>
              <TableCell className="truncate pl-6 text-sm">
                {m.owner_name}
              </TableCell>
              <TableCell className="text-muted-foreground pr-4 pl-6 text-xs whitespace-nowrap">
                <div>{format(new Date(m.created_at), "MMM d, yyyy")}</div>
                <div>{format(new Date(m.created_at), "hh:mm a")}</div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
