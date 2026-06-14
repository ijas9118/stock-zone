"use client";

import { useRouter } from "next/navigation";

import { TransferWithDetails } from "@/actions/admin/transfers";
import { DataTable } from "@/components/admin/data-table";

import { columns } from "./columns";

interface TransfersTableProps {
  transfers: TransferWithDetails[];
  totalCount: number;
  pageCount: number;
}

export function TransfersTable({
  transfers,
  totalCount,
  pageCount,
}: TransfersTableProps) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={transfers}
      totalCount={totalCount}
      pageCount={pageCount}
      searchPlaceholder="Search products by name or SKU..."
      onRowClick={(row) => router.push(`/admin/transfers/${row.id}`)}
    />
  );
}
