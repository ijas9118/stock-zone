"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

import { getLocations, LocationWithWarehouse } from "@/actions/admin/locations";
import {
  getStockLocations,
  StockWithDetails,
  updateStockLocations,
} from "@/actions/admin/stock";
import { ACCENT } from "@/lib/chart-colors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { LocationMultiSelect } from "./location-multi-select";

interface LocationEditDialogProps {
  stock: StockWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationEditDialog({
  stock,
  open,
  onOpenChange,
}: LocationEditDialogProps) {
  const [selected, setSelected] = useState<LocationWithWarehouse[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasAnyLocations, setHasAnyLocations] = useState(true);

  useEffect(() => {
    if (!open) return;
    getStockLocations(stock.id).then((locs) => {
      if (locs.length > 0) {
        setSelected(locs as unknown as LocationWithWarehouse[]);
      } else if (stock.locations) {
        setSelected([stock.locations as unknown as LocationWithWarehouse]);
      } else {
        setSelected([]);
      }
    });
    getLocations({ warehouseId: stock.warehouse_id, pageSize: 1 }).then((r) => {
      setHasAnyLocations(r.totalCount > 0);
    });
  }, [open, stock.id, stock.warehouse_id, stock.locations]);

  async function handleSave() {
    setIsSaving(true);
    const result = await updateStockLocations(
      stock.id,
      selected.map((s) => s.id)
    );
    setIsSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Location updated");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: ACCENT[500] }} />
            Edit Location
          </DialogTitle>
          <DialogDescription>
            {stock.products?.name} · {stock.warehouses?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label className="text-sm font-medium">Bin Location(s)</Label>
          {!hasAnyLocations ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              No locations defined for this warehouse. Add some from the{" "}
              <a href="/admin/locations" className="underline">
                Locations
              </a>{" "}
              page first.
            </p>
          ) : (
            <LocationMultiSelect
              warehouseId={stock.warehouse_id}
              selected={selected}
              onChange={setSelected}
              placeholder="Search and select locations…"
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
