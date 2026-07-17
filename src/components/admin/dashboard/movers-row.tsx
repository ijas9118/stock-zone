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
              <ul className="space-y-2">
                {fastMovers.map((p, i) => (
                  <li
                    key={`${p.sku}-${i}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="font-medium text-indigo-600">
                      {p.outQty.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
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
              <ul className="space-y-2">
                {slowMovers.map((p, i) => (
                  <li
                    key={`${p.sku}-${i}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-muted-foreground font-medium">
                      {p.outQty.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
