import { notFound } from "next/navigation";

import { getTransferById } from "@/actions/admin/transfers";
import { TransferDetailView } from "@/components/admin/transfers/transfer-detail-view";

interface Props {
  params: Promise<{ transferId: string }>;
}

export default async function TransferDetailPage({ params }: Props) {
  const { transferId } = await params;
  const transfer = await getTransferById(transferId);

  if (!transfer) {
    notFound();
  }

  return <TransferDetailView transfer={transfer} />;
}
