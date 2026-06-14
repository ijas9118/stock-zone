import { UserTransferWithDetails } from "@/actions/user/transfers";

import { TransferCard } from "./transfer-card";

interface TransfersListProps {
  transfers: UserTransferWithDetails[];
  canAct: boolean;
}

export function TransfersList({ transfers, canAct }: TransfersListProps) {
  if (transfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm font-medium">
          No pending transfers
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          When stock transfers are initiated, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transfers.map((t) => (
        <TransferCard key={t.id} transfer={t} canAct={canAct} />
      ))}
    </div>
  );
}
