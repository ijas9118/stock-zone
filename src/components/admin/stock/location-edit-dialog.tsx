"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { toast } from "sonner";

import { getLocations, LocationWithWarehouse } from "@/actions/admin/locations";
import { StockWithDetails, updateStockLocation } from "@/actions/admin/stock";
import { ACCENT } from "@/lib/chart-colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const NONE = "__none__";

function locationLabel(loc: {
  location_code: string;
  zone: string | null;
  rack: string | null;
  level: string | null;
  slot: string | null;
}) {
  const detail = [loc.zone, loc.rack, loc.level, loc.slot]
    .filter(Boolean)
    .join(" · ");
  return detail ? `${loc.location_code} — ${detail}` : loc.location_code;
}

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
  const [comboOpen, setComboOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hasAnyLocations, setHasAnyLocations] = useState(true);

  // Derived-state reset: when `open` transitions to true, sync selectedId from
  // the current stock prop. Called during render (not in an effect) so React
  // re-renders immediately with the correct initial value.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setSelectedId(stock.location_id ?? NONE);
      setSearch("");
    }
  }

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      getLocations({
        warehouseId: stock.warehouse_id,
        query: search || undefined,
        pageSize: 50,
      }).then((r) => {
        // Belt-and-braces de-dupe by id in case of any overlapping fetches.
        const unique = Array.from(
          new Map(r.locations.map((l) => [l.id, l])).values()
        );
        setLocations(unique);
        if (!search) setHasAnyLocations(r.totalCount > 0);
      });
    }, 200);
    return () => clearTimeout(timeout);
  }, [open, stock.warehouse_id, search]);

  const selectedFromList = locations.find((l) => l.id === selectedId);
  const selectedLabel =
    selectedId === NONE
      ? "No location assigned"
      : selectedFromList
        ? locationLabel(selectedFromList)
        : stock.locations && stock.locations.id === selectedId
          ? locationLabel(stock.locations)
          : "Selected location";

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
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: ACCENT[500] }} />
            Edit Location
          </DialogTitle>
          <DialogDescription>
            {stock.products?.name} · {stock.warehouses?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label className="text-sm font-medium">Bin Location</Label>
          {!hasAnyLocations ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              No locations defined for this warehouse. Add some from the{" "}
              <a href="/admin/locations" className="underline">
                Locations
              </a>{" "}
              page first.
            </p>
          ) : (
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="h-11 w-full justify-between px-3 font-normal"
                >
                  <span
                    className={cn(
                      "truncate",
                      selectedId === NONE && "text-muted-foreground"
                    )}
                  >
                    {selectedLabel}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="w-[360px] p-0"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search location…"
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No location found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value={NONE}
                        onSelect={() => {
                          setSelectedId(NONE);
                          setComboOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            selectedId === NONE ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="text-muted-foreground">
                          No location
                        </span>
                      </CommandItem>
                      {locations.map((loc) => (
                        <CommandItem
                          key={loc.id}
                          value={loc.id}
                          onSelect={() => {
                            setSelectedId(loc.id);
                            setComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedId === loc.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <span className="font-mono">{loc.location_code}</span>
                          {(loc.zone || loc.rack || loc.level || loc.slot) && (
                            <span className="text-muted-foreground ml-1.5 text-xs">
                              {[loc.zone, loc.rack, loc.level, loc.slot]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
