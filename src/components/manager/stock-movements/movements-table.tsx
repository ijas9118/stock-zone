"use client";

import { StockMovementWithDetails } from "@/actions/admin/stock-movements";
import { columns } from "@/components/admin/stock-movements/columns";
import { DataTable } from "@/components/admin/data-table";

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
  return (
    <DataTable
      columns={columns}
      data={movements}
      totalCount={totalCount}
      pageCount={pageCount}
      searchPlaceholder="Search products by name or SKU..."
    />
  );
}
