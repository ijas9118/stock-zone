import { format } from "date-fns";

export function DashboardHeader() {
  return (
    <div className="border-muted flex flex-col gap-1 border-b pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          System overview and operational snapshot.
        </p>
      </div>
      <p className="text-muted-foreground text-xs">
        {format(new Date(), "EEEE, MMMM d, yyyy")}
      </p>
    </div>
  );
}
