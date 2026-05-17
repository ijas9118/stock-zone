"use client";

import { useRouter } from "next/navigation";
import { ProfileWithShopType } from "@/actions/admin/users";

import { DataTable } from "@/components/admin/data-table";

import { columns } from "./columns";
import { UserFilters } from "./user-filters";

interface UserTableProps {
  users: ProfileWithShopType[];
  totalCount: number;
  pageSize: number;
  shopTypes: {
    id: string;
    name: string;
    is_active: boolean;
  }[];
}

export function UserTable({
  users,
  totalCount,
  pageSize,
  shopTypes,
}: UserTableProps) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={users}
      totalCount={totalCount}
      pageCount={Math.ceil(totalCount / pageSize)}
      searchPlaceholder="Search name or email..."
      additionalFilters={
        <UserFilters key="user-filters" shopTypes={shopTypes} />
      }
      meta={{ shopTypes }}
      onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
    />
  );
}
