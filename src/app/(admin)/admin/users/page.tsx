import { getShopTypes, getUsers } from "@/actions/admin/users";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserTable } from "@/components/admin/users/user-table";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    shop_type?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 8;
  const query = params.q;
  const shopTypeId = params.shop_type;

  const [{ users, totalCount }, shopTypes] = await Promise.all([
    getUsers({ query, shopTypeId, page, pageSize }),
    getShopTypes(),
  ]);

  return (
    <div className="flex-1 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            User Management
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
            View and manage users, their roles, and account status.
          </p>
        </div>
        <Button size="sm" className="sm:size-default w-fit">
          <UserPlus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
          <span>Add User</span>
        </Button>
      </div>

      <UserTable
        users={users}
        totalCount={totalCount}
        pageSize={pageSize}
        shopTypes={shopTypes}
      />
    </div>
  );
}
