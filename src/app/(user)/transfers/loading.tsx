import { Skeleton } from "@/components/ui/skeleton";

export default function TransfersLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
