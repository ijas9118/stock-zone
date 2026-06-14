import { Skeleton } from "@/components/ui/skeleton";

export default function TransfersLoading() {
  return (
    <div className="flex flex-1 flex-col space-y-4 sm:space-y-6">
      <div className="border-muted flex flex-col gap-2 border-b pb-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-[180px] rounded-xl" />
        <div className="rounded-md border">
          <div className="bg-muted h-[400px] w-full animate-pulse rounded-md" />
        </div>
      </div>
    </div>
  );
}
