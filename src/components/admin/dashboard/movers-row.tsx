import { ACCENT_RAMP } from "@/lib/chart-colors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Mover {
  name: string;
  sku: string | null;
  outQty: number;
}

interface MoversRowProps {
  fastMovers: Mover[];
  slowMovers: Mover[];
  title?: string;
}

function MoverList({ movers }: { movers: Mover[] }) {
  const maxQty = Math.max(...movers.map((m) => m.outQty), 1);
  return (
    <ul className="space-y-3">
      {movers.map((p, i) => (
        <li key={`${p.sku}-${i}`} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate">{p.name}</span>
            <span className="shrink-0 font-semibold">
              {p.outQty.toLocaleString()}
            </span>
          </div>
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(p.outQty / maxQty) * 100}%`,
                background: ACCENT_RAMP[i % ACCENT_RAMP.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MoversRow({ fastMovers, slowMovers, title }: MoversRowProps) {
  return (
    <div className="space-y-3">
      {title && (
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium">Fast Movers</CardTitle>
            <CardDescription>
              Highest OUT quantity, last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fastMovers.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No outbound movement recorded.
              </p>
            ) : (
              <MoverList movers={fastMovers} />
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium">Slow Movers</CardTitle>
            <CardDescription>
              Least OUT quantity, last 30 days — review for overstock
            </CardDescription>
          </CardHeader>
          <CardContent>
            {slowMovers.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No stocked products to show.
              </p>
            ) : (
              <MoverList movers={slowMovers} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
