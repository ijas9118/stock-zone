"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ProfileWithShopType,
  updateUserShopTypes,
} from "@/actions/admin/users";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Database } from "@/lib/supabase/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AccessLevel = Database["public"]["Enums"]["access_level"];

interface UserShopsDialogProps {
  user: ProfileWithShopType;
  allShopTypes: {
    id: string;
    name: string;
    is_active: boolean;
  }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserShopsDialog({
  user,
  allShopTypes,
  open,
  onOpenChange,
}: UserShopsDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Initialize selected shops from user's current data
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
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update shop types");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Shops</DialogTitle>
          <DialogDescription>
            Assign multiple shop types and access levels to{" "}
            <b>{user.full_name || user.email}</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-4 py-4">
            {allShopTypes.map((shop) => {
              const selection = selectedShops[shop.id];
              const isEnabled = selection?.enabled;

              return (
                <div
                  key={shop.id}
                  className={`flex flex-col space-y-2 rounded-lg border p-3 transition-colors ${
                    isEnabled
                      ? "bg-accent/30 border-primary/30"
                      : !shop.is_active && !isEnabled
                        ? "bg-muted/50 border-dashed opacity-60"
                        : "border-border bg-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`shop-${shop.id}`}
                        checked={isEnabled}
                        onCheckedChange={() => toggleShop(shop.id)}
                        disabled={!shop.is_active && !isEnabled}
                      />
                      <Label
                        htmlFor={`shop-${shop.id}`}
                        className={`font-medium ${
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
                    <div className="animate-in fade-in slide-in-from-left-2 flex items-center justify-between pl-6 duration-200">
                      <span className="text-muted-foreground text-xs">
                        Access Level:
                      </span>
                      <Select
                        value={selection.accessLevel}
                        onValueChange={(val) =>
                          updateAccessLevel(shop.id, val as AccessLevel)
                        }
                      >
                        <SelectTrigger className="h-8 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read_only">Read Only</SelectItem>
                          <SelectItem value="write">Read & Write</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
