import { getShopTypes, getUsers } from "@/actions/admin/users";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const pageSize = Number(params.pageSize) || 10;
  const query = params.q;
  const shopTypeId = params.shop_type;

  const [{ users, totalCount }, shopTypes] = await Promise.all([
    getUsers({ query, shopTypeId, page, pageSize }),
    getShopTypes(),
  ]);

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            View and manage users, their roles, and account status.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            A list of all users in the system including their name, email, role
            and status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserTable
            users={users}
            totalCount={totalCount}
            pageSize={pageSize}
            shopTypes={shopTypes}
          />
        </CardContent>
      </Card>
    </div>
  );
}
