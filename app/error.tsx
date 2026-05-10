"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in the console — Vercel will pick this up in runtime logs too.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto size-8 text-amber-500" />
        <h1 className="mt-3 text-lg font-semibold tracking-tight">
          Something broke
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-neutral-400">
            id: {error.digest}
          </p>
        ) : null}
        <Button onClick={reset} className="mt-5 w-full">
          Try again
        </Button>
      </div>
    </div>
  );
}
