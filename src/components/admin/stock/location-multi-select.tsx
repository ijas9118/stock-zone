"use client";

import { useEffect, useRef, useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { X } from "lucide-react";

import { getLocations, LocationWithWarehouse } from "@/actions/admin/locations";
import { ACCENT } from "@/lib/chart-colors";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface LocationMultiSelectProps {
  warehouseId: string;
  selected: LocationWithWarehouse[];
  onChange: (locations: LocationWithWarehouse[]) => void;
  placeholder?: string;
}

export function LocationMultiSelect({
  warehouseId,
  selected,
  onChange,
  placeholder,
}: LocationMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<LocationWithWarehouse[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      getLocations({
        warehouseId,
        query: search || undefined,
        pageSize: 50,
      }).then((r) => setOptions(r.locations));
    }, 200);
    return () => clearTimeout(timeout);
  }, [warehouseId, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectableOptions = options.filter(
    (o) => !selected.some((s) => s.id === o.id)
  );

  function handleSelect(loc: LocationWithWarehouse) {
    onChange([...selected, loc]);
    setSearch("");
  }

  function handleRemove(id: string) {
    onChange(selected.filter((s) => s.id !== id));
  }

  return (
    <div ref={containerRef} className="relative">
      <Command shouldFilter={false} className="overflow-visible bg-transparent">
        <div
          className="focus-within:border-ring focus-within:ring-ring/50 flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 focus-within:ring-[3px]"
          onClick={() => inputRef.current?.focus()}
        >
          {selected.map((loc) => (
            <Badge
              key={loc.id}
              className="gap-1 border-none text-white"
              style={{ background: ACCENT[700] }}
            >
              <span className="font-mono">{loc.location_code}</span>
              <button
                type="button"
                onClick={() => handleRemove(loc.id)}
                className="rounded-full hover:opacity-80"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <CommandPrimitive.Input
            ref={inputRef}
            value={search}
            onValueChange={setSearch}
            onFocus={() => setOpen(true)}
            placeholder={
              selected.length === 0 ? (placeholder ?? "Search location…") : ""
            }
            className="text-foreground placeholder:text-muted-foreground min-w-[120px] flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        {open && (
          <CommandList className="bg-popover text-popover-foreground absolute top-[calc(100%+4px)] z-20 max-h-[240px] w-full rounded-md border shadow-md">
            <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
              No location found.
            </CommandEmpty>
            <CommandGroup>
              {selectableOptions.map((loc) => (
                <CommandItem
                  key={loc.id}
                  value={loc.id}
                  onSelect={() => handleSelect(loc)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="cursor-pointer"
                >
                  <span className="font-mono">{loc.location_code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  );
}
