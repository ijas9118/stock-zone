"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ProfileWithShopType,
  updateUserShopTypes,
} from "@/actions/admin/users";
import { Loader2, Save, Store } from "lucide-react";
import { toast } from "sonner";

import { Database } from "@/lib/supabase/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AccessLevel = Database["public"]["Enums"]["access_level"];

interface UserShopsManagerProps {
  user: ProfileWithShopType;
  allShopTypes: {
    id: string;
    name: string;
    is_active: boolean;
  }[];
}

export function UserShopsManager({
  user,
  allShopTypes,
}: UserShopsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedShops, setSelectedShops] = useState<{
    [shopTypeId: string]: {
      enabled: boolean;
      accessLevel: AccessLevel;
    };
  }>(() => {
    const initial: {
      [key: string]: { enabled: boolean; accessLevel: AccessLevel };
    } = {};
    user.profile_shop_types.forEach((st) => {
      if (st.shop_types) {
        initial[st.shop_types.id] = {
          enabled: true,
          accessLevel: st.access_level,
        };
      }
    });
    return initial;
  });

  const toggleShop = (shopId: string) => {
    setSelectedShops((prev) => ({
      ...prev,
      [shopId]: {
        enabled: !prev[shopId]?.enabled,
        accessLevel: prev[shopId]?.accessLevel || "read_only",
      },
    }));
  };

  const updateAccessLevel = (shopId: string, accessLevel: AccessLevel) => {
    setSelectedShops((prev) => ({
      ...prev,
      [shopId]: {
        ...prev[shopId],
        accessLevel,
      },
    }));
  };

  const handleSave = () => {
    const shopTypeData = Object.entries(selectedShops)
      .filter(([, data]) => data.enabled)
      .map(([shopTypeId, data]) => ({
        shopTypeId,
        accessLevel: data.accessLevel,
      }));

    startTransition(async () => {
      const result = await updateUserShopTypes(user.id, shopTypeData);
      if (result.success) {
        toast.success("User shop types updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update shop types");
      }
    });
  };

  const hasChanges = () => {
    const currentShopIds = user.profile_shop_types
      .map((st) => st.shop_types?.id)
      .filter(Boolean)
      .sort();

    const selectedShopIds = Object.entries(selectedShops)
      .filter(([, data]) => data.enabled)
      .map(([id]) => id)
      .sort();

    if (JSON.stringify(currentShopIds) !== JSON.stringify(selectedShopIds))
      return true;

    // Check access levels for enabled shops
    return selectedShopIds.some((id) => {
      const current = user.profile_shop_types.find(
        (st) => st.shop_types?.id === id
      );
      return current?.access_level !== selectedShops[id!].accessLevel;
    });
  };

  return (
    <Card className="bg-background/50 border-none shadow-sm backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Store className="text-primary h-5 w-5" />
            Assigned Shop Types
          </CardTitle>
          <CardDescription>
            Assign visibility and write access for specific shops.
          </CardDescription>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges() || isPending}
          size="sm"
          className="gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Update Shops
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allShopTypes.map((shop) => {
            const selection = selectedShops[shop.id];
            const isEnabled = selection?.enabled;

            return (
              <div
                key={shop.id}
                className={`flex flex-col space-y-4 rounded-lg border p-4 transition-all duration-200 ${
                  isEnabled
                    ? "bg-accent/30 border-primary/30 ring-primary/20 shadow-sm ring-1"
                    : !shop.is_active && !isEnabled
                      ? "bg-muted/50 border-dashed opacity-60"
                      : "border-border hover:border-primary/20 bg-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`shop-${shop.id}`}
                      checked={isEnabled}
                      onCheckedChange={() => toggleShop(shop.id)}
                      disabled={!shop.is_active && !isEnabled}
                      className="h-5 w-5"
                    />
                    <Label
                      htmlFor={`shop-${shop.id}`}
                      className={`text-sm font-semibold tracking-tight ${
                        !shop.is_active && !isEnabled
                          ? "text-muted-foreground cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      {shop.name}
                      {!shop.is_active && (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 text-destructive ml-2 py-0 text-[10px]"
                        >
                          Inactive
                        </Badge>
                      )}
                    </Label>
                  </div>
                </div>

                {isEnabled && (
                  <div className="animate-in fade-in slide-in-from-top-2 flex flex-col space-y-2 pt-1 duration-300">
                    <Separator className="opacity-30" />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                        Access Level
                      </span>
                      <Select
                        value={selection.accessLevel}
                        onValueChange={(val) =>
                          updateAccessLevel(shop.id, val as AccessLevel)
                        }
                      >
                        <SelectTrigger className="bg-background h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read_only">Read Only</SelectItem>
                          <SelectItem value="write">Read & Write</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Separator({ className = "" }: { className?: string }) {
  return <div className={`bg-border h-[1px] w-full ${className}`} />;
}
