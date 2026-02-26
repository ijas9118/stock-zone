"use client";

import { useState, useTransition } from "react";
import {
  ProfileWithShopType,
  updateUserRole,
  updateUserStatus,
} from "@/actions/admin/users";
import { Table } from "@tanstack/react-table";
import {
  Clock,
  MoreHorizontal,
  Shield,
  Store,
  UserCheck,
  UserCog,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Database } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { UserShopsDialog } from "./user-shops-dialog";

interface UserActionsProps {
  user: ProfileWithShopType;
  table: Table<ProfileWithShopType>;
}

type AccountStatus = Database["public"]["Enums"]["account_status"];
type AppRole = Database["public"]["Enums"]["app_role"];

interface TableMeta {
  shopTypes: {
    id: string;
    name: string;
    is_active: boolean;
  }[];
}

export function UserActions({ user, table }: UserActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showShopsDialog, setShowShopsDialog] = useState(false);

  const allShopTypes = (table.options.meta as TableMeta)?.shopTypes || [];

  const handleStatusChange = (newStatus: AccountStatus) => {
    startTransition(async () => {
      const result = await updateUserStatus(user.id, newStatus);
      if (result.success) {
        toast.success(`User status updated to ${newStatus}`);
      } else {
        toast.error(result.error || "Failed to update status");
      }
    });
  };

  const handleRoleChange = (newRole: AppRole) => {
    startTransition(async () => {
      const result = await updateUserRole(user.id, newRole);
      if (result.success) {
        toast.success(`User role updated to ${newRole}`);
      } else {
        toast.error(result.error || "Failed to update role");
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(user.email);
              toast.success("Email copied to clipboard");
            }}
          >
            Copy Email
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Shield className="mr-2 h-4 w-4" />
              <span>Change Role</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={user.role}
                onValueChange={(value) => handleRoleChange(value as AppRole)}
              >
                <DropdownMenuRadioItem value="admin">
                  Admin
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="manager">
                  Manager
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="user">User</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={() => setShowShopsDialog(true)}>
            <Store className="mr-2 h-4 w-4" />
            <span>Manage Shops</span>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UserCog className="mr-2 h-4 w-4" />
              <span>Change Status</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={user.status}
                onValueChange={(value) =>
                  handleStatusChange(value as AccountStatus)
                }
              >
                <DropdownMenuRadioItem value="active">
                  <UserCheck className="mr-2 h-4 w-4 text-emerald-500" />
                  Active
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="pending">
                  <Clock className="mr-2 h-4 w-4 text-amber-500" />
                  Pending
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="inactive">
                  <UserX className="text-muted-foreground mr-2 h-4 w-4" />
                  Inactive
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="rejected">
                  <UserX className="text-destructive mr-2 h-4 w-4" />
                  Rejected
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserShopsDialog
        user={user}
        allShopTypes={allShopTypes}
        open={showShopsDialog}
        onOpenChange={setShowShopsDialog}
      />
    </>
  );
}
