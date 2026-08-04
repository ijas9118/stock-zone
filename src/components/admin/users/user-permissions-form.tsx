"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Shield } from "lucide-react";
import { toast } from "sonner";

import { updateUserPermissions } from "@/actions/admin/users";
import { Database } from "@/lib/supabase/database.types";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface UserPermissionsFormProps {
  user: Profile;
}

export function UserPermissionsForm({ user }: UserPermissionsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [permissions, setPermissions] = useState({
    perm_stock_read_all: user.perm_stock_read_all,
    perm_stock_own_shop: user.perm_stock_own_shop,
    perm_add_products: user.perm_add_products,
    perm_do_transfer: user.perm_do_transfer,
    perm_do_adjustment: user.perm_do_adjustment,
    perm_do_purchase: user.perm_do_purchase,
    perm_do_sale: user.perm_do_sale,
    perm_do_return: user.perm_do_return,
  });

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setVisibility = (value: string) => {
    setPermissions((prev) => ({
      ...prev,
      perm_stock_read_all: value === "all",
      perm_stock_own_shop: value === "assigned",
    }));
  };

  const hasChanges = Object.keys(permissions).some(
    (key) =>
      permissions[key as keyof typeof permissions] !==
      user[key as keyof Profile]
  );

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateUserPermissions(user.id, permissions);
      if (result.success) {
        toast.success("Permissions updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update permissions");
      }
    });
  };

  const permissionGroups = [
    {
      title: "Stock Visibility",
      description: "Control what stock data the user can see.",
      items: [
        {
          key: "perm_stock_read_all",
          label: "View All Stock",
          description:
            "Allow viewing stock across all shop types and warehouses.",
        },
        {
          key: "perm_stock_own_shop",
          label: "View Assigned Shops Only",
          description: "Limit viewing to only assigned shop types.",
        },
      ],
    },
    {
      title: "Inventory Actions",
      description: "Granular control over stock movements.",
      items: [
        {
          key: "perm_do_transfer",
          label: "Stock Transfer",
          description: "Allow moving stock between warehouses.",
        },
        {
          key: "perm_do_adjustment",
          label: "Stock Adjustment",
          description:
            "Allow manual quantity corrections and initial stock entry.",
        },
        {
          key: "perm_do_purchase",
          label: "Stock In",
          description:
            "Allow adding stock (supplier delivery, customer return, initial stock).",
        },
        {
          key: "perm_do_sale",
          label: "Stock Out",
          description:
            "Allow removing stock (customer delivery, sent to shop, supplier return).",
        },
        {
          key: "perm_do_return",
          label: "Process Returns",
          description: "Allow recording customer/supplier returns.",
        },
      ],
    },
    {
      title: "Catalog Management",
      description: "Product and catalog related permissions.",
      items: [
        {
          key: "perm_add_products",
          label: "Manage Products",
          description: "Allow creating and editing product definitions.",
        },
      ],
    },
  ];

  return (
    <Card className="bg-background/50 border-none shadow-sm backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Shield className="text-primary h-5 w-5" />
            Granular Permissions
          </CardTitle>
          <CardDescription>
            Configure specific access rights for this user.
          </CardDescription>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isPending}
          size="sm"
          className="gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        {permissionGroups.map((group, groupIdx) => (
          <div key={group.title} className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                {group.title}
              </h4>
              <p className="text-muted-foreground/70 text-xs">
                {group.description}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {groupIdx === 0 ? (
                <RadioGroup
                  value={permissions.perm_stock_read_all ? "all" : "assigned"}
                  onValueChange={setVisibility}
                  className="grid gap-4 sm:col-span-2 sm:grid-cols-2"
                >
                  {group.items.map((item) => (
                    <div
                      key={item.key}
                      className="hover:bg-accent/50 flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4 transition-colors"
                    >
                      <RadioGroupItem
                        value={
                          item.key === "perm_stock_read_all"
                            ? "all"
                            : "assigned"
                        }
                        id={item.key}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor={item.key}
                          className="cursor-pointer text-sm leading-none font-medium"
                        >
                          {item.label}
                        </Label>
                        <p className="text-muted-foreground text-xs">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                group.items.map((item) => (
                  <div
                    key={item.key}
                    className="hover:bg-accent/50 flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4 transition-colors"
                  >
                    <Checkbox
                      id={item.key}
                      checked={
                        permissions[item.key as keyof typeof permissions]
                      }
                      onCheckedChange={() =>
                        togglePermission(item.key as keyof typeof permissions)
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor={item.key}
                        className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {item.label}
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {groupIdx < permissionGroups.length - 1 && (
              <Separator className="mt-8 opacity-50" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
