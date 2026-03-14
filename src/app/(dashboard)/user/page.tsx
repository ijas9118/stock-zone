import { Suspense } from "react";
import { getWarehouses } from "@/actions/admin/warehouses";
import { getMyAssignedShops } from "@/actions/user/stock";

import { UserInventoryView } from "@/components/user/inventory/user-inventory-view";

export default async function UserDashboardPage() {
  const [assignedShops, warehousesData] = await Promise.all([
    getMyAssignedShops(),
    getWarehouses({ pageSize: 100 }),
  ]);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <Suspense fallback={<InventorySkeleton />}>
        <UserInventoryView
          assignedShops={assignedShops}
          warehouses={warehousesData.warehouses}
        />
      </Suspense>
    </div>
  );
}

function InventorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-muted h-11 w-full animate-pulse rounded-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-muted h-48 animate-pulse rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
