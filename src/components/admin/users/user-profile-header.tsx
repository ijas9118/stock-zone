"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  ShieldAlert,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { updateUserRole, updateUserStatus } from "@/actions/admin/users";
import { Database } from "@/lib/supabase/database.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface UserProfileHeaderProps {
  user: Profile;
}

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (role: Database["public"]["Enums"]["app_role"]) => {
    startTransition(async () => {
      const result = await updateUserRole(user.id, role);
      if (result.success) {
        toast.success("User role updated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleStatusChange = (
    status: Database["public"]["Enums"]["account_status"]
  ) => {
    startTransition(async () => {
      const result = await updateUserStatus(user.id, status);
      if (result.success) {
        toast.success("User status updated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case "pending":
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/admin/users")}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Users
      </Button>

      <div className="bg-background/40 border-border/50 flex flex-col gap-6 rounded-2xl border p-6 shadow-sm backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <Avatar className="border-primary/10 ring-background h-20 w-20 border-2 shadow-xl ring-4">
            <AvatarImage src={user.avatar_url || ""} />
            <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
              {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1.5 py-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {user.full_name || "Unstructured User"}
              </h1>
              <Badge
                variant="secondary"
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ${
                  user.status === "active"
                    ? "border-green-500/20 bg-green-500/10 text-green-600"
                    : user.status === "pending"
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                      : "border-red-500/20 bg-red-500/10 text-red-600"
                }`}
              >
                {getStatusIcon(user.status)}
                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
              </Badge>
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Joined {format(new Date(user.created_at), "MMM d, yyyy")}
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                ID: {user.id.slice(0, 8)}...
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 border-border/30 flex flex-wrap items-center gap-3 rounded-xl border p-4">
          <div className="space-y-1.5">
            <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
              Account Role
            </label>
            <Select
              value={user.role}
              onValueChange={handleRoleChange}
              disabled={isPending}
            >
              <SelectTrigger className="bg-background h-9 w-[140px] shadow-sm">
                <div className="flex items-center gap-2">
                  <UserIcon className="text-primary h-3.5 w-3.5" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground ml-1 text-[10px] font-bold tracking-wider uppercase">
              Account Status
            </label>
            <Select
              value={user.status}
              onValueChange={handleStatusChange}
              disabled={isPending}
            >
              <SelectTrigger className="bg-background h-9 w-[140px] shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
