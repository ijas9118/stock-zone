import { Suspense } from "react";

import { getDashboardAccess } from "@/actions/admin/dashboard";
import { AdminDashboard } from "@/components/admin/dashboard/admin-dashboard";
import { DashboardSkeleton } from "@/components/admin/dashboard/dashboard-skeleton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const access = await getDashboardAccess();
  return <AdminDashboard access={access} />;
}
