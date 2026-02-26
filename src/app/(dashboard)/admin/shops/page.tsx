import { getShops } from "@/actions/admin/shops";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { columns } from "@/components/admin/shops/columns";
import { DataTable } from "@/components/admin/shops/data-table";
import { ShopHeader } from "@/components/admin/shops/shop-header";

export default async function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;
  const query = params.q;

  const { shops, totalCount } = await getShops({ query, page, pageSize });

  return (
    <div className="flex-1 space-y-6">
      <ShopHeader />

      <Card>
        <CardHeader>
          <CardTitle>Shops</CardTitle>
          <CardDescription>
            A list of all shop types configured in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={shops}
            totalCount={totalCount}
            pageCount={Math.ceil(totalCount / pageSize)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
