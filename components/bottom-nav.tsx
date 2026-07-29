"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  House,
  ListChecks,
  Play,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", Icon: House, match: (p: string) => p === "/" },
  {
    href: "/templates",
    label: "Routines",
    Icon: ListChecks,
    match: (p: string) => p.startsWith("/templates"),
  },
  {
    href: "/history",
    label: "History",
    Icon: CalendarDays,
    match: (p: string) => p.startsWith("/history"),
  },
  {
    href: "/stats",
    label: "Stats",
    Icon: BarChart3,
    match: (p: string) => p.startsWith("/stats"),
  },
] as const;

/**
 * Tab bar with a raised centre action.
 *
 * The centre button is the one thing you always want reachable with a thumb:
 * it resumes the live workout when there is one, and otherwise sends you to the
 * routine list to start one.
 */
export function BottomNav({
  activeSessionId,
}: {
  activeSessionId?: string | null;
}) {
  const pathname = usePathname();
  const [left, right] = [ITEMS.slice(0, 2), ITEMS.slice(2)];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-xl items-stretch justify-around px-2 pb-1 pt-1.5">
        {left.map((item) => (
          <NavTab key={item.href} {...item} active={item.match(pathname)} />
        ))}

        <li className="flex shrink-0 items-start px-1">
          <Link
            href={
              activeSessionId
                ? (`/session/${activeSessionId}` as Route)
                : "/templates"
            }
            aria-label={activeSessionId ? "Resume workout" : "Start a workout"}
            className={cn(
              "tappable -mt-5 flex size-14 flex-col items-center justify-center rounded-full shadow-raised",
              activeSessionId
                ? "bg-success text-white"
                : "bg-accent text-accent-fg",
            )}
          >
            <Play className="size-6 fill-current" />
          </Link>
        </li>

        {right.map((item) => (
          <NavTab key={item.href} {...item} active={item.match(pathname)} />
        ))}
      </ul>
    </nav>
  );
}

function NavTab({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <li className="flex-1">
      <Link
        href={href as Route}
        aria-current={active ? "page" : undefined}
        className={cn(
          "tappable flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5",
          active ? "text-accent" : "text-fg-subtle hover:text-fg-muted",
        )}
      >
        <Icon className="size-[22px]" />
        <span className="text-[10px] font-semibold tracking-wide">{label}</span>
      </Link>
    </li>
  );
}
