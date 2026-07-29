import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  tone = "accent",
  className,
}: {
  /** 0–1. Clamped. */
  value: number;
  tone?: "accent" | "success" | "warning" | "fg";
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-inset",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "accent" && "bg-accent",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "fg" && "bg-fg",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * Countdown ring for the rest timer. `value` counts *down* from 1 so the ring
 * empties as the rest period elapses.
 */
export function ProgressRing({
  value,
  size = 44,
  strokeWidth = 3.5,
  tone = "accent",
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: "accent" | "success";
  children?: React.ReactNode;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className={cn(
            "transition-[stroke-dashoffset] duration-300 ease-linear",
            tone === "accent" ? "text-accent" : "text-success",
          )}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
