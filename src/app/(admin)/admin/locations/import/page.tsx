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

import { importLocationsAction } from "@/actions/admin/import-locations";
import { LocationImportResult } from "@/lib/imports/location-import/types";
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

export default function ImportLocationsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<LocationImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validExts = [".csv", ".xlsx", ".xls"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      const valid = validExts.some((ext) =>
        selected.name.toLowerCase().endsWith(ext)
      );
      if (!valid) {
        toast.error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
        return;
      }
      setFile(selected);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      const valid = validExts.some((ext) =>
        dropped.name.toLowerCase().endsWith(ext)
      );
      if (!valid) {
        toast.error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
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
      let input: string | ArrayBuffer;
      if (file.name.toLowerCase().endsWith(".csv")) {
        input = await file.text();
      } else {
        input = await file.arrayBuffer();
      }
      const response = await importLocationsAction(input);
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

  const downloadTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      encodeURIComponent(
        "warehouse_name,zone,aisle,rack,bin\nMain Warehouse,A,01,R1,B01\nMain Warehouse,A,01,R1,B02\n"
      );
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "locations_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    link.setAttribute("download", "location_import_errors.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Import Locations</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>CSV / Excel Upload</CardTitle>
                <CardDescription>
                  Upload a CSV or Excel file to bulk import locations. Duplicate
                  codes in the same warehouse are skipped.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-1.5 h-4 w-4" />
                Download Template
              </Button>
            </div>
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
                  accept=".csv,.xlsx,.xls"
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
                        Must be a valid CSV or Excel file (.csv, .xlsx, .xls)
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
                    Processed {result.totalRows} rows. {result.inserted}{" "}
                    inserted, {result.skipped} skipped as duplicates.
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
                      Inserted
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {result.inserted}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm font-medium">
                      Skipped (Duplicate)
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {result.skipped}
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
