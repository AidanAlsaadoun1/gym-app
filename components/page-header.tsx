import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  backHref,
  actions,
}: {
  title: string;
  subtitle?: string;
  backHref?: Route | string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex items-start gap-2">
      {backHref ? (
        <Link
          href={backHref as Route}
          aria-label="Back"
          className="tappable -ml-2 mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-card hover:text-fg"
        >
          <ChevronLeft className="size-5" />
        </Link>
      ) : null}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[24px] font-bold tracking-tight text-fg">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] text-fg-muted">{subtitle}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
      ) : null}
    </header>
  );
}
