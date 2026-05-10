export default function HistoryLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-72 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-neutral-100 ${className ?? ""}`}
      aria-hidden
    />
  );
}
