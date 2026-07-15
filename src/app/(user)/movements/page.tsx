import { getUserRecentMovements } from "@/actions/user/stock-movements";
import { MovementsFeed } from "@/components/user/movements/movements-feed";

export default async function MovementsPage() {
  const movements = await getUserRecentMovements();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold tracking-tight sm:text-xl">
          Recent Activity
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Stock movements from the last 24 hours across your warehouses and
          shops.
        </p>
      </div>
      <MovementsFeed movements={movements} />
    </div>
  );
}
