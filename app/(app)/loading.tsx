import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-[70px]" />
        <Skeleton className="h-[70px]" />
        <Skeleton className="h-[70px]" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-[132px] w-full" />
        <Skeleton className="h-[132px] w-full" />
      </div>
    </div>
  );
}
