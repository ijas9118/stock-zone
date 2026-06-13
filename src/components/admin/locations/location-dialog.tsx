"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createLocation,
  LocationWithWarehouse,
  updateLocation,
} from "@/actions/admin/locations";
import { buildLocationCode } from "@/lib/locations";
import { getWarehouses } from "@/actions/admin/warehouses";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const locationSchema = z
  .object({
    warehouse_id: z.string().min(1, "Warehouse is required"),
    zone: z.string().max(20).optional(),
    aisle: z.string().max(20).optional(),
    rack: z.string().max(20).optional(),
    bin: z.string().max(20).optional(),
  })
  .refine((d) => d.zone || d.aisle || d.rack || d.bin, {
    message: "At least one of zone, aisle, rack, or bin is required",
    path: ["zone"],
  });

type LocationFormValues = z.infer<typeof locationSchema>;

interface LocationDialogProps {
  location?: LocationWithWarehouse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationDialog({
  location,
  open,
  onOpenChange,
}: LocationDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>(
    []
  );

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      warehouse_id: location?.warehouse_id ?? "",
      zone: location?.zone ?? "",
      aisle: location?.aisle ?? "",
      rack: location?.rack ?? "",
      bin: location?.bin ?? "",
    },
  });

  const watchedZone = form.watch("zone");
  const watchedAisle = form.watch("aisle");
  const watchedRack = form.watch("rack");
  const watchedBin = form.watch("bin");
  const previewCode = buildLocationCode(
    watchedZone,
    watchedAisle,
    watchedRack,
    watchedBin
  );

  useEffect(() => {
    getWarehouses({ pageSize: 100 }).then((r) => setWarehouses(r.warehouses));
  }, []);

  useEffect(() => {
    if (open) {
      form.reset({
        warehouse_id: location?.warehouse_id ?? "",
        zone: location?.zone ?? "",
        aisle: location?.aisle ?? "",
        rack: location?.rack ?? "",
        bin: location?.bin ?? "",
      });
    }
  }, [open, location, form]);

  function onSubmit(values: LocationFormValues) {
    startTransition(async () => {
      const result = location
        ? await updateLocation(location.id, values)
        : await createLocation(values);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(location ? "Location updated" : "Location created");
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {location ? "Edit Location" : "Create Location"}
          </DialogTitle>
          <DialogDescription>
            {location
              ? "Update zone, aisle, rack, or bin details."
              : "Define a new bin location inside a warehouse."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="warehouse_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warehouse</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aisle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aisle</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rack"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rack</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. R2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bin</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. B03" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted/50 rounded-md border px-3 py-2">
              <p className="text-muted-foreground text-[11px] font-medium uppercase">
                Location Code Preview
              </p>
              <p className="font-mono text-sm font-semibold">{previewCode}</p>
              <FormDescription className="mt-0.5 text-[10px]">
                Auto-generated from zone, aisle, rack, and bin.
              </FormDescription>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? location
                    ? "Saving..."
                    : "Creating..."
                  : location
                    ? "Save Changes"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
