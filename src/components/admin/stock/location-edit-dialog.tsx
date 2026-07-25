"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

import { getLocations, LocationWithWarehouse } from "@/actions/admin/locations";
import { StockWithDetails, updateStockLocation } from "@/actions/admin/stock";
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

  // Derived-state reset: when `open` transitions to true, sync the selection
  // from the current stock prop. Called during render (not in an effect) so
  // React re-renders immediately with the correct initial value.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open && stock.locations) {
      setSelected([stock.locations as unknown as LocationWithWarehouse]);
    } else if (open) {
      setSelected([]);
    }
  }

  useEffect(() => {
    if (!open) return;
    getLocations({ warehouseId: stock.warehouse_id, pageSize: 1 }).then((r) => {
      setHasAnyLocations(r.totalCount > 0);
    });
  }, [open, stock.warehouse_id]);

  async function handleSave() {
    setIsSaving(true);
    // Only one location can be persisted today — the schema stores a single
    // location_id per stock row. Saving the first pick keeps this safe (no
    // silent data loss) until multi-location storage is added.
    const primary = selected[0] ?? null;
    const result = await updateStockLocation(stock.id, primary?.id ?? null);
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
            <>
              <LocationMultiSelect
                warehouseId={stock.warehouse_id}
                selected={selected}
                onChange={setSelected}
                placeholder="Search and select locations…"
              />
              {selected.length > 1 && (
                <p
                  className="rounded-md border p-2 text-xs"
                  style={{
                    borderColor: `${ACCENT[300]}80`,
                    color: ACCENT[700],
                    background: `${ACCENT[100]}40`,
                  }}
                >
                  Only{" "}
                  <span className="font-mono">{selected[0].location_code}</span>{" "}
                  will be saved for now — storing multiple locations per item
                  needs a small database update that hasn&apos;t been applied
                  yet. The rest are kept here so you don&apos;t lose the pick.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            style={{ background: ACCENT[900] }}
            className="text-white hover:opacity-90"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
