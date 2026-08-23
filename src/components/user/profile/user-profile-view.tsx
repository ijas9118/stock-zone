"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  LogOut,
  Mail,
  Package,
  RotateCcw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react";

import { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { logout } from "@/app/auth/actions";

import { PasswordSection } from "./password-section";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AssignedShop {
  id: string;
  name: string;
  accessLevel: string;
}

interface UserProfileViewProps {
  profile: Profile;
  assignedShops: AssignedShop[];
}

function InfoCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted/30 border-border/50 rounded-xl border p-3 sm:p-4",
        className
      )}
    >
      <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1.5 text-sm font-semibold sm:text-base">{value}</p>
    </div>
  );
}

const permissionItems = [
  {
    key: "perm_do_purchase",
    label: "Stock In",
    icon: TrendingUp,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "perm_do_sale",
    label: "Stock Out",
    icon: TrendingDown,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-600 dark:text-red-400",
  },
  {
    key: "perm_do_transfer",
    label: "Stock Transfer",
    icon: ArrowRightLeft,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "perm_do_adjustment",
    label: "Stock Adjustment",
    icon: Edit,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "perm_do_return",
    label: "Process Returns",
    icon: RotateCcw,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    key: "perm_stock_read_all",
    label: "View All Stock",
    icon: Package,
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
];

export function UserProfileView({
  profile,
  assignedShops,
}: UserProfileViewProps) {
  const [isPending] = useTransition();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero */}
      <div className="bg-background/40 border-border/50 rounded-2xl border p-5 shadow-sm backdrop-blur-md sm:p-6">
        <div className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
          <Avatar className="border-background ring-border h-20 w-20 border-4 shadow-xl ring-2 sm:h-24 sm:w-24">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-muted text-2xl font-bold">
              {(profile.full_name || profile.email || "?")
                .charAt(0)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {profile.full_name || "No name set"}
            </h1>
            <div className="text-muted-foreground flex items-center justify-center gap-1.5 text-sm sm:justify-start">
              <Mail className="h-3.5 w-3.5" />
              {profile.email}
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
              {/* Status badge */}
              <Badge
                variant="secondary"
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  profile.status === "active"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                )}
              >
                {profile.status === "active" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {profile.status.charAt(0).toUpperCase() +
                  profile.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <InfoCard
          icon={User}
          label="Role"
          value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
        />
        <InfoCard
          icon={Calendar}
          label="Member Since"
          value={format(new Date(profile.created_at), "MMM yyyy")}
        />
        <InfoCard
          icon={ShoppingBag}
          label="Shops"
          value={`${assignedShops.length} assigned`}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Assigned Shops section */}
      {assignedShops.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-muted-foreground/70 text-xs font-bold tracking-wider uppercase">
            Assigned Shops
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {assignedShops.map((shop) => (
              <div
                key={shop.id}
                className="bg-muted/20 border-border/40 flex items-center justify-between rounded-xl border px-4 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                    <ShoppingBag className="text-primary h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{shop.name}</span>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] font-semibold",
                    shop.accessLevel === "write"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                  )}
                >
                  {shop.accessLevel === "write" ? "Read & Write" : "Read Only"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions section */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground/70 text-xs font-bold tracking-wider uppercase">
          Permissions
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {permissionItems.map((perm) => {
            const enabled = profile[
              perm.key as keyof typeof profile
            ] as boolean;
            return (
              <div
                key={perm.key}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                  enabled
                    ? "bg-muted/20 border-border/40"
                    : "bg-muted/10 border-border/20 opacity-50"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    enabled ? perm.iconBg : "bg-muted"
                  )}
                >
                  <perm.icon
                    className={cn(
                      "h-3.5 w-3.5",
                      enabled ? perm.iconColor : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{perm.label}</p>
                </div>
                {enabled ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="text-muted-foreground/40 h-3.5 w-3.5 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Password section */}
      <PasswordSection />

      {/* Sign Out section */}
      <div className="pt-2">
        <Separator className="mb-6 opacity-50" />
        <form action={logout}>
          <Button
            type="submit"
            variant="outline"
            className="hover:bg-destructive/5 hover:border-destructive/30 hover:text-destructive w-full gap-2 transition-colors sm:w-auto"
            disabled={isPending}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  );
}
