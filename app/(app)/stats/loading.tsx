export default function StatsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
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
