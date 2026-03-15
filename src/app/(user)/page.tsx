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
      <UserInventoryView
        assignedShops={assignedShops}
        warehouses={warehousesData.warehouses}
      />
    </div>
  );
}
