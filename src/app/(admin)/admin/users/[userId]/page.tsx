import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Shield, Store } from "lucide-react";

import { getShopTypes, getUserById } from "@/actions/admin/users";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPermissionsForm } from "@/components/admin/users/user-permissions-form";
import { UserProfileHeader } from "@/components/admin/users/user-profile-header";
import { UserShopsManager } from "@/components/admin/users/user-shops-manager";

interface UserPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function UserDetailPage({ params }: UserPageProps) {
  const { userId } = await params;

  // Initial data fetch
  const [user, allShopTypes] = await Promise.all([
    getUserById(userId),
    getShopTypes(),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-8 pb-10">
      <Suspense fallback={<HeaderSkeleton />}>
        <UserProfileHeader user={user} />
      </Suspense>

      <Tabs defaultValue="permissions" className="space-y-6">
        <TabsList className="bg-background/40 border-border/50 h-12 rounded-xl border p-1 shadow-sm backdrop-blur-sm">
          <TabsTrigger
            value="permissions"
            className="data-[state=active]:bg-background h-10 gap-2 rounded-lg px-6 data-[state=active]:shadow-sm"
          >
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger
            value="shops"
            className="data-[state=active]:bg-background h-10 gap-2 rounded-lg px-6 data-[state=active]:shadow-sm"
          >
            <Store className="h-4 w-4" />
            Shop Access
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="permissions"
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <UserPermissionsForm user={user} />
        </TabsContent>

        <TabsContent
          value="shops"
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <UserShopsManager user={user} allShopTypes={allShopTypes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="h-40 w-full rounded-2xl" />
    </div>
  );
}
