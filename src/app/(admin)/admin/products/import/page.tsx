"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { importProductsAction } from "@/actions/admin/import";
import { ImportResult } from "@/lib/imports/product-import/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ImportProductsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.type !== "text/csv" && !selected.name.endsWith(".csv")) {
        toast.error("Please upload a valid CSV file");
        return;
      }
      setFile(selected);
      setResult(null); // Reset result when a new file is selected
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.type !== "text/csv" && !dropped.name.endsWith(".csv")) {
        toast.error("Please upload a valid CSV file");
        return;
      }
      setFile(dropped);
      setResult(null);
    }
  };

  const startImport = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const response = await importProductsAction(text);

      if (!response.success) {
        toast.error(response.error || "Import failed");
      } else if (response.result) {
        setResult(response.result);
        if (response.result.errors.length > 0) {
          toast.warning("Import completed with some errors.");
        } else {
          toast.success("Import completed successfully!");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred reading the file.");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadErrorsCsv = () => {
    if (!result || result.errors.length === 0) return;

    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Row,Error Message\n" +
      result.errors
        .map((e) => `"${e.row}","${e.error.replace(/"/g, '""')}"`)
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "import_errors.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Import Products</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>CSV Upload</CardTitle>
            <CardDescription>
              Upload a CSV file to bulk import or update products and initial
              stock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div
                className={`flex flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed p-10 transition-colors ${
                  file
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={isUploading}
                />

                {file ? (
                  <>
                    <FileSpreadsheet className="text-primary h-10 w-10" />
                    <div className="text-center">
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="text-muted-foreground h-10 w-10" />
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        Click or drag file to this area to upload
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Must be a valid CSV file
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Alert
                  variant={result.errors.length > 0 ? "destructive" : "default"}
                  className={
                    result.errors.length === 0
                      ? "border-green-500 text-green-500"
                      : ""
                  }
                >
                  {result.errors.length > 0 ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" color="currentColor" />
                  )}
                  <AlertTitle>
                    {result.errors.length > 0
                      ? "Import Completed with Errors"
                      : "Import Successful"}
                  </AlertTitle>
                  <AlertDescription>
                    Processed {result.totalRows} rows. {result.insertedProducts}{" "}
                    inserted, {result.updatedProducts} updated.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm font-medium">
                      Total Rows
                    </p>
                    <p className="text-2xl font-bold">{result.totalRows}</p>
                  </div>
                  <div className="bg-card rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm font-medium">
                      Failed Rows
                    </p>
                    <p className="text-destructive text-2xl font-bold">
                      {result.failedRows}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm font-medium">
                      Products Inserted
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {result.insertedProducts}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm font-medium">
                      Products Updated
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {result.updatedProducts}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm font-medium">
                      Stock Rows Inserted
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {result.insertedStockRows}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm font-medium">
                      Existing Stock Left Untouched
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {result.skippedExistingStockRows}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                    }}
                  >
                    Import Another File
                  </Button>
                  {result.errors.length > 0 && (
                    <Button variant="secondary" onClick={downloadErrorsCsv}>
                      <Download className="mr-2 h-4 w-4" /> Download Error Log
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          {!result && (
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setFile(null)}
                disabled={!file || isUploading}
              >
                Clear
              </Button>
              <Button onClick={startImport} disabled={!file || isUploading}>
                {isUploading ? "Importing..." : "Start Import"}
              </Button>
            </CardFooter>
          )}
        </Card>

        {result && result.errors.length > 0 && (
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Error Details</CardTitle>
              <CardDescription>
                Top 50 errors encountered during import.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Row</TableHead>
                      <TableHead>Error Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.slice(0, 50).map((err, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {err.row > 0 ? err.row : "-"}
                        </TableCell>
                        <TableCell className="text-destructive">
                          {err.error}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
