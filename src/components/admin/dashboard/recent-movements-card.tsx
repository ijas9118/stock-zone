import { format } from "date-fns";

import { DELTA_COLOR_CLASS, MOVEMENT_BADGE_CLASS } from "@/lib/movement-colors";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RecentMovement {
  id: string;
  type: string;
  quantityDelta: number;
  createdAt: string;
  productName: string;
  productSku: string | null;
  warehouseName: string;
  userName: string;
  notes?: string | null;
}

interface RecentMovementsCardProps {
  movements: RecentMovement[];
}

const TYPE_LABELS: Record<string, string> = {
  in: "IN",
  out: "OUT",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
  adjustment: "Adjustment",
};

export function RecentMovementsCard({ movements }: RecentMovementsCardProps) {
  return (
    <Card className="border shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Recent Stock Movements
        </CardTitle>
        <CardDescription>Latest activity for this selection</CardDescription>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            No recent movements to show.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {movements.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        MOVEMENT_BADGE_CLASS[m.type] ??
                          "bg-muted text-muted-foreground"
                      )}
                    >
                      {TYPE_LABELS[m.type] ?? m.type}
                    </span>
                    <p className="truncate text-sm font-medium">
                      {m.productName}
                    </p>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {m.warehouseName} · {m.userName} ·{" "}
                    {format(new Date(m.createdAt), "MMM d, h:mm a")}
                  </p>
                  {m.notes && (
                    <p className="text-muted-foreground/80 truncate text-xs italic">
                      &ldquo;{m.notes}&rdquo;
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold",
                    m.quantityDelta >= 0
                      ? DELTA_COLOR_CLASS.positive
                      : DELTA_COLOR_CLASS.negative
                  )}
                >
                  {m.quantityDelta >= 0 ? "+" : ""}
                  {m.quantityDelta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
