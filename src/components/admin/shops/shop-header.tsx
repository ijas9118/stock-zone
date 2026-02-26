"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ShopDialog } from "./shop-dialog";

export function ShopHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Shop Management</h2>
          <p className="text-muted-foreground">
            Manage your shop types and organize how your users are grouped.
          </p>
        </div>
        <div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Shop Type
          </Button>
        </div>
      </div>
      <ShopDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
