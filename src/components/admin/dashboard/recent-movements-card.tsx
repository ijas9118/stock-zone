import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RecentMovement {
  id: string;
  type: string;
  quantityDelta: number;
  createdAt: string;
  productName: string;
  productSku: string | null;
  warehouseName: string;
  userName: string;
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

const TYPE_STYLES: Record<string, string> = {
  in: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  out: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  transfer_in: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  transfer_out: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  adjustment: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

export function RecentMovementsCard({ movements }: RecentMovementsCardProps) {
  return (
    <Card className="border shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-medium">Recent Stock Movements</CardTitle>
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
                        TYPE_STYLES[m.type] ?? "bg-muted text-muted-foreground"
                      )}
                    >
                      {TYPE_LABELS[m.type] ?? m.type}
                    </span>
                    <p className="truncate text-sm font-medium">{m.productName}</p>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {m.warehouseName} · {m.userName} ·{" "}
                    {format(new Date(m.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold",
                    m.quantityDelta >= 0 ? "text-indigo-600" : "text-rose-600"
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
