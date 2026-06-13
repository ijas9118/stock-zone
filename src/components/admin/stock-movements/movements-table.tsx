"use client";

import { useRouter } from "next/navigation";

import { StockMovementWithDetails } from "@/actions/admin/stock-movements";
import { DataTable } from "@/components/admin/data-table";

import { columns } from "./columns";

interface MovementsTableProps {
  movements: StockMovementWithDetails[];
  totalCount: number;
  pageCount: number;
}

export function MovementsTable({
  movements,
  totalCount,
  pageCount,
}: MovementsTableProps) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={movements}
      totalCount={totalCount}
      pageCount={pageCount}
      searchPlaceholder="Search products by name or SKU..."
      onRowClick={(row) => router.push(`/admin/stock-movements/${row.id}`)}
    />
  );
}
