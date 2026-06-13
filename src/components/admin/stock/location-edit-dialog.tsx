"use client";

import { useEffect, useState } from "react";
import { getLocations, LocationWithWarehouse } from "@/actions/admin/locations";
import { StockWithDetails, updateStockLocation } from "@/actions/admin/stock";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

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
  const [locations, setLocations] = useState<LocationWithWarehouse[]>([]);
  const [selectedId, setSelectedId] = useState(stock.location_id ?? NONE);
  const [isSaving, setIsSaving] = useState(false);

  // Derived-state reset: when `open` transitions to true, sync selectedId from
  // the current stock prop. Called during render (not in an effect) so React
  // re-renders immediately with the correct initial value.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setSelectedId(stock.location_id ?? NONE);
    }
  }

  useEffect(() => {
    if (!open) return;
    getLocations({ warehouseId: stock.warehouse_id, pageSize: 100 }).then((r) =>
      setLocations(r.locations)
    );
  }, [open, stock.warehouse_id]);

  async function handleSave() {
    setIsSaving(true);
    const locationId = selectedId === NONE ? null : selectedId;
    const result = await updateStockLocation(stock.id, locationId);
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
          <DialogTitle>Edit Location</DialogTitle>
          <DialogDescription>
            {stock.products?.name} · {stock.warehouses?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <Label>Location</Label>
          {locations.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No locations defined for this warehouse. Add some from the{" "}
              <a href="/admin/locations" className="underline">
                Locations
              </a>{" "}
              page first.
            </p>
          ) : (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Select location..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  <span className="text-muted-foreground">— None —</span>
                </SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    <span className="font-mono">{loc.location_code}</span>
                    {(loc.zone || loc.aisle || loc.rack || loc.bin) && (
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {[loc.zone, loc.aisle, loc.rack, loc.bin]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
