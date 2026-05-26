"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Dumbbell, History, Home } from "lucide-react";

import { cn } from "@/lib/utils";
import { Route } from "next";

const ITEMS = [
  { href: "/", label: "Home", Icon: Home, match: (p: string) => p === "/" },
  {
    href: "/templates",
    label: "Templates",
    Icon: Dumbbell,
    match: (p: string) => p.startsWith("/templates"),
  },
  {
    href: "/history",
    label: "History",
    Icon: History,
    match: (p: string) => p.startsWith("/history"),
  },
  {
    href: "/stats",
    label: "Stats",
    Icon: BarChart3,
    match: (p: string) => p.startsWith("/stats"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/90 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-xl items-center justify-around px-2 py-2 text-xs">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href as Route}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 transition-colors",
                  active
                    ? "text-amber-600"
                    : "text-neutral-500 hover:bg-neutral-100",
                )}
              >
                <Icon className="size-5" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
