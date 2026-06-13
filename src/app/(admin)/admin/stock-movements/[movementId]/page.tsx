import { notFound } from "next/navigation";

import { getStockMovementById } from "@/actions/admin/stock-movements";
import { StockMovementDetailView } from "@/components/admin/stock-movements/stock-movement-detail-view";

interface Props {
  params: Promise<{ movementId: string }>;
}

export default async function StockMovementDetailPage({ params }: Props) {
  const { movementId } = await params;
  const movement = await getStockMovementById(movementId);

  if (!movement) {
    notFound();
  }

  return <StockMovementDetailView movement={movement} />;
}
