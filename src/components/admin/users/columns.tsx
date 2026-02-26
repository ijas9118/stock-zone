"use client";

import { ProfileWithShopType } from "@/actions/admin/users";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Store } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { UserActions } from "./user-actions";

export const columns: ColumnDef<ProfileWithShopType>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "full_name",
    header: "User",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.avatar_url || undefined}
              alt={user.full_name || ""}
            />
            <AvatarFallback>
              {user.full_name?.substring(0, 2).toUpperCase() || "OZ"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{user.full_name || "N/A"}</span>
            <span className="text-muted-foreground text-xs">{user.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      return (
        <Badge
          variant={
            role === "admin"
              ? "destructive"
              : role === "manager"
                ? "default"
                : "secondary"
          }
          className="capitalize"
        >
          {role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant={
            status === "active"
              ? "success"
              : status === "pending"
                ? "warning"
                : "outline"
          }
          className="capitalize"
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: "shop_types",
    header: "Shop Types",
    cell: ({ row }) => {
      const shopTypes = row.original.profile_shop_types;
      if (!shopTypes || shopTypes.length === 0) {
        return (
          <span className="text-muted-foreground text-xs italic">No shops</span>
        );
      }

      return (
        <div className="flex max-w-[220px] flex-wrap gap-1.5">
          {shopTypes.map((st) => {
            const isWrite = st.access_level === "write";
            return (
              <Badge
                key={st.shop_types?.id}
                variant="secondary"
                className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium ${
                  isWrite
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"
                    : "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400"
                } border transition-all hover:scale-105`}
              >
                <Store className="h-2.5 w-2.5 opacity-70" />
                <span className="max-w-[80px] truncate">
                  {st.shop_types?.name}
                </span>
                <span
                  className={`ml-0.5 flex h-3.5 items-center rounded-sm px-1 text-[9px] font-bold uppercase ${
                    isWrite
                      ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                      : "bg-blue-500/20 text-blue-800 dark:text-blue-200"
                  } `}
                >
                  {isWrite ? "Write" : "Read"}
                </span>
              </Badge>
            );
          })}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return true;
      return row.original.profile_shop_types.some((st) =>
        value.includes(st.shop_types?.id)
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Joined At",
    cell: ({ row }) => {
      return (
        <span className="text-muted-foreground">
          {format(new Date(row.getValue("created_at")), "MMM dd, yyyy")}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => <UserActions user={row.original} table={table} />,
  },
];
