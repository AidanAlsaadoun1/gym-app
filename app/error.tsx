"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in the console — Vercel picks this up in runtime logs too.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card padding="lg" className="w-full max-w-sm text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <TriangleAlert className="size-6" />
        </div>
        <h1 className="mt-3.5 text-[18px] font-bold tracking-tight text-fg">
          Something broke
        </h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[11px] text-fg-subtle">
            id: {error.digest}
          </p>
        ) : null}
        <Button onClick={reset} className="mt-5 w-full">
          Try again
        </Button>
      </Card>
    </div>
  );
}
