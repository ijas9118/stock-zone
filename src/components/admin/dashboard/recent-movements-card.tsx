import { format } from "date-fns";

import { ACCENT } from "@/lib/chart-colors";
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

// Same accent family throughout, no other hues — shade signals the type.
const TYPE_STYLES: Record<string, string> = {
  in: "bg-[#441D49]/10 text-[#441D49] dark:bg-[#441D49]/40 dark:text-[#DDB6E2]",
  out: "bg-[#7A3483]/10 text-[#7A3483] dark:bg-[#7A3483]/40 dark:text-[#DDB6E2]",
  transfer_in:
    "bg-[#A346AF]/10 text-[#A346AF] dark:bg-[#A346AF]/40 dark:text-[#DDB6E2]",
  transfer_out:
    "bg-[#A346AF]/10 text-[#A346AF] dark:bg-[#A346AF]/40 dark:text-[#DDB6E2]",
  adjustment:
    "bg-[#C78AD0]/25 text-[#7A3483] dark:bg-[#C78AD0]/25 dark:text-[#DDB6E2]",
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
                        TYPE_STYLES[m.type] ?? "bg-muted text-muted-foreground"
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
                </div>
                <span
                  className="shrink-0 text-sm font-semibold"
                  style={{
                    color: m.quantityDelta >= 0 ? ACCENT[900] : ACCENT[500],
                  }}
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
