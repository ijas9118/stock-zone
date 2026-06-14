"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { getLocations } from "@/actions/admin/locations";
import { completeTransfer } from "@/actions/admin/transfers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  destLocationId: z.string().min(1, "Destination location is required"),
});

type FormValues = z.infer<typeof schema>;

interface CompleteTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferId: string;
  destWarehouseId: string;
  currentDestLocationId: string | null;
  onSuccess: () => void;
}

export function CompleteTransferDialog({
  open,
  onOpenChange,
  transferId,
  destWarehouseId,
  currentDestLocationId,
  onSuccess,
}: CompleteTransferDialogProps) {
  const [locations, setLocations] = useState<
    { id: string; location_code: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { destLocationId: currentDestLocationId ?? "" },
  });

  useEffect(() => {
    if (!open) return;
    getLocations({ warehouseId: destWarehouseId, pageSize: 200 }).then((r) =>
      setLocations(r.locations)
    );
  }, [open, destWarehouseId]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const result = await completeTransfer(transferId, values.destLocationId);
    setLoading(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Transfer completed — stock moved");
      onSuccess();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Transfer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-2"
          >
            <FormField
              control={form.control}
              name="destLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Bin Location</FormLabel>
                  {locations.length > 0 ? (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a bin location..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.location_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No locations defined for the destination warehouse.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || locations.length === 0}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Transfer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
