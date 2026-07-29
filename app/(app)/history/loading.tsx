import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-[70px]" />
        <Skeleton className="h-[70px]" />
        <Skeleton className="h-[70px]" />
      </div>
      <Skeleton className="h-[290px] w-full" />
      <div className="space-y-2">
        <Skeleton className="h-[92px] w-full" />
        <Skeleton className="h-[92px] w-full" />
      </div>
    </div>
  );
}
