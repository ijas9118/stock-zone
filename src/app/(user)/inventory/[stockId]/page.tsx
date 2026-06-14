import { notFound } from "next/navigation";

import { getMyProfile, getPendingTransfers, getUserStockById } from "@/actions/user/stock";
import { InventoryDetailView } from "@/components/user/inventory/inventory-detail-view";

interface InventoryDetailPageProps {
  params: Promise<{ stockId: string }>;
}

export default async function InventoryDetailPage({
  params,
}: InventoryDetailPageProps) {
  const { stockId } = await params;

  const [stock, profile] = await Promise.all([
    getUserStockById(stockId),
    getMyProfile(),
  ]);

  if (!stock) notFound();

  const pendingTransfers = await getPendingTransfers(
    stock.product_id,
    stock.warehouse_id,
    stock.shop_type_id
  );

  const permissions = {
    perm_do_transfer: profile.perm_do_transfer,
    perm_do_adjustment: profile.perm_do_adjustment,
    perm_do_purchase: profile.perm_do_purchase,
    perm_do_sale: profile.perm_do_sale,
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <InventoryDetailView
        stock={stock}
        permissions={permissions}
        pendingTransfers={pendingTransfers}
      />
    </div>
  );
}
