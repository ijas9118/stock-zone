import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b pb-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-10 max-w-sm" />
        <Skeleton className="h-[400px] w-full rounded-md" />
      </div>
    </div>
  );
}
