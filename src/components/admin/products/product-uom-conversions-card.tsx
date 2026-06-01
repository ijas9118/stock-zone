"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createProductUomConversion,
  deleteProductUomConversion,
  getProductUomConversions,
  ProductUomConversionWithUom,
} from "@/actions/admin/product-uom-conversions";
import { getUnitsOfMeasure, UnitOfMeasure } from "@/actions/admin/uom";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const addUomSchema = z.object({
  uom_id: z.string().min(1, "UOM is required"),
  conversion_factor: z.coerce
    .number()
    .positive("Factor must be greater than 0"),
  is_purchase_default: z.boolean().default(false),
  is_sales_default: z.boolean().default(false),
});

type AddUomFormValues = z.infer<typeof addUomSchema>;

interface ProductUomConversionsCardProps {
  productId: string;
  baseUomId: string | null;
}

export function ProductUomConversionsCard({
  productId,
  baseUomId,
}: ProductUomConversionsCardProps) {
  const [conversions, setConversions] = useState<ProductUomConversionWithUom[]>(
    []
  );
  const [allUoms, setAllUoms] = useState<UnitOfMeasure[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<AddUomFormValues>({
    resolver: zodResolver(addUomSchema),
    defaultValues: {
      uom_id: "",
      conversion_factor: 1,
      is_purchase_default: false,
      is_sales_default: false,
    },
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [convRes, uomRes] = await Promise.all([
        getProductUomConversions(productId),
        getUnitsOfMeasure({ pageSize: 1000 }),
      ]);
      setConversions(convRes);
      setAllUoms(uomRes.unitsOfMeasure);
    } catch {
      toast.error("Failed to load UOM data");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableUoms = allUoms.filter(
    (u) => u.id !== baseUomId && !conversions.some((c) => c.uom_id === u.id)
  );

  async function onAdd(values: AddUomFormValues) {
    const result = await createProductUomConversion({
      product_id: productId,
      ...values,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Alternate UOM added");
      form.reset();
      setIsAddOpen(false);
      await loadData();
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    const result = await deleteProductUomConversion(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Alternate UOM removed");
      await loadData();
    }
    setDeletingId(null);
  }

  return (
    <Card className="border-border/50 bg-background/40 shadow-sm backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Alternate Units of Measure
        </CardTitle>
        <CardDescription>
          Define other units this product can be transacted in. All quantities
          convert to the base unit when recorded.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <>
            {conversions.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UOM</TableHead>
                    <TableHead>Factor</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Defaults
                    </TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">
                            {c.units_of_measure?.uom_code ?? "—"}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {c.units_of_measure?.full_name ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        1 {c.units_of_measure?.uom_code} ={" "}
                        {Number(c.conversion_factor)} base
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex gap-1">
                          {c.is_purchase_default && (
                            <Badge variant="outline" className="text-[10px]">
                              Purchase
                            </Badge>
                          )}
                          {c.is_sales_default && (
                            <Badge variant="outline" className="text-[10px]">
                              Sales
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={deletingId === c.id}
                          onClick={() => onDelete(c.id)}
                        >
                          {deletingId === c.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="text-destructive h-3 w-3" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isAddOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={availableUoms.length === 0}
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add Alternate UOM
              </Button>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onAdd)}
                  className="space-y-3 rounded-md border p-3"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="uom_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">UOM</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select UOM" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableUoms.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.uom_code} — {u.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="conversion_factor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Conversion Factor
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              min="0.000001"
                              placeholder="e.g. 12"
                              className="h-8 text-xs"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-4">
                    <FormField
                      control={form.control}
                      name="is_purchase_default"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-normal">
                            Purchase default
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_sales_default"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-normal">
                            Sales default
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting && (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      )}
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        form.reset();
                        setIsAddOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
