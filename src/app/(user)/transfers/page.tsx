import { getTransfers } from "@/actions/user/transfers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/server";
import { TransfersList } from "@/components/user/transfers/transfers-list";

export default async function TransfersPage() {
  const auth = await getAuthContext();

  let canAct = auth.role === "admin";

  if (!canAct && auth.userId) {
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("perm_do_transfer")
      .eq("id", auth.userId)
      .single();
    canAct = profile?.perm_do_transfer ?? false;
  }

  const { transfers } = await getTransfers({ pageSize: 50 });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold tracking-tight sm:text-xl">
          Pending Transfers
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          All open warehouse transfers awaiting completion.
        </p>
      </div>
      <TransfersList transfers={transfers} canAct={canAct} />
    </div>
  );
}
