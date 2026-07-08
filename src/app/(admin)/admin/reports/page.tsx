import { ReportsList } from "@/components/admin/reports/reports-list";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Download key inventory reports as Excel files.
        </p>
      </div>
      <ReportsList />
    </div>
  );
}
