"use client";

import { useState, useTransition } from "react";
import {
  deleteLocation,
  LocationWithWarehouse,
} from "@/actions/admin/locations";
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { LocationDialog } from "./location-dialog";

interface LocationActionsProps {
  location: LocationWithWarehouse;
}

export function LocationActions({ location }: LocationActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !confirm(
        `Delete location "${location.location_code}"? This cannot be undone.`
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteLocation(location.id);
      if (result.error) toast.error(result.error);
      else toast.success("Location deleted");
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LocationDialog
        location={location}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </>
  );
}
