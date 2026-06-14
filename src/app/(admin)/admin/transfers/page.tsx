import { getTransfers } from "@/actions/admin/transfers";
import { ADMIN_PAGE_SIZE } from "@/lib/config";
import { TransfersFilters } from "@/components/admin/transfers/transfers-filters";
import { TransfersHeader } from "@/components/admin/transfers/transfers-header";
import { TransfersTable } from "@/components/admin/transfers/transfers-table";

interface TransfersPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function TransfersPage({
  searchParams,
}: TransfersPageProps) {
  const { status, page, pageSize } = await searchParams;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || ADMIN_PAGE_SIZE;

  const { transfers, totalCount } = await getTransfers({
    status,
    page: currentPage,
    pageSize: currentPageSize,
  });

  const pageCount = Math.ceil(totalCount / currentPageSize);

  return (
    <div className="flex flex-1 flex-col space-y-4 sm:space-y-6">
      <TransfersHeader totalCount={totalCount} />
      <div className="flex flex-col gap-4">
        <TransfersFilters />
        <TransfersTable
          transfers={transfers}
          totalCount={totalCount}
          pageCount={pageCount}
        />
      </div>
    </div>
  );
}
