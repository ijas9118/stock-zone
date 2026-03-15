import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 py-2 sm:space-y-8">
      {/* Hero Skeleton */}
      <div className="bg-background/40 border-border/50 rounded-2xl border p-5 shadow-sm backdrop-blur-md sm:p-6">
        <div className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
          <Skeleton className="h-20 w-20 rounded-full sm:h-24 sm:w-24" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="mt-1">
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Info cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>

      {/* Assigned Shops section Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>

      {/* Permissions section Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
