"use client";

import { useState } from "react";
import { Edit2, MoreHorizontal, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteLocation,
  LocationWithWarehouse,
  toggleLocationStatus,
} from "@/actions/admin/locations";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  function handleDelete() {
    if (
      !confirm(
        `Delete location "${location.location_code}"? This cannot be undone.`
      )
    )
      return;
    setIsDeleting(true);
    deleteLocation(location.id)
      .then((result) => {
        if (result.error) toast.error(result.error);
        else toast.success("Location deleted");
      })
      .finally(() => setIsDeleting(false));
  }

  function handleToggle() {
    setIsToggling(true);
    toggleLocationStatus(location.id, !location.is_active)
      .then((result) => {
        if (result.error) toast.error(result.error);
        else
          toast.success(
            location.is_active ? "Location deactivated" : "Location activated"
          );
      })
      .finally(() => setIsToggling(false));
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            disabled={isDeleting || isToggling}
          >
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
          <DropdownMenuItem
            onClick={handleToggle}
            disabled={isToggling || isDeleting}
          >
            <Power className="mr-2 h-4 w-4" />
            {location.is_active ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
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
