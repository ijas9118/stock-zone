import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Section Skeleton */}
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-background/40 border-border/50 rounded-2xl border p-5 shadow-sm sm:p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-2/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="ml-1 h-4 w-16" />
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </div>

          <div className="bg-background/40 border-border/50 rounded-2xl border p-4 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
