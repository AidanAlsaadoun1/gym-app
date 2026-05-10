"use client";

import { useEffect, useRef, useState } from "react";
import { Bug, Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_TITLE = 3;
const MIN_DESCRIPTION = 10;
const MAX_TITLE = 120;
const MAX_DESCRIPTION = 5000;

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700"
      >
        <Bug className="size-3.5" />
        Report a bug
      </button>
      <BugReportDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function BugReportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Lock body scroll while open and reset state when (re)opened.
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setError(null);
    setSent(false);
    setSubmitting(false);
    const t = window.setTimeout(() => titleRef.current?.focus(), 50);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < MIN_TITLE) {
      setError(`Title needs at least ${MIN_TITLE} characters`);
      return;
    }
    if (description.trim().length < MIN_DESCRIPTION) {
      setError(`Description needs at least ${MIN_DESCRIPTION} characters`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          url:
            typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not send report");
      }
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bug-report-heading"
      className="fixed inset-0 z-40 flex items-end justify-center bg-neutral-900/50 px-3 pb-3 pt-6 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <Bug className="size-4 text-rose-500" />
            <h2 id="bug-report-heading" className="text-base font-semibold">
              Report a bug
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
          >
            <X className="size-5" />
          </button>
        </header>

        {sent ? (
          <div className="flex-1 px-5 py-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="size-6" />
            </div>
            <h3 className="mt-3 text-base font-semibold">Sent — thanks!</h3>
            <p className="mt-1 text-sm text-neutral-500">
              I&apos;ll take a look. Your name, email, and the page URL were
              attached so I have context.
            </p>
            <Button onClick={onClose} className="mt-5 w-full">
              Close
            </Button>
          </div>
        ) : (
          <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="flex-1 space-y-4 px-5 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="bug-title">Title</Label>
                <Input
                  id="bug-title"
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={MAX_TITLE}
                  placeholder="Sets disappear after I switch exercises"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bug-description">What happened?</Label>
                <textarea
                  id="bug-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={MAX_DESCRIPTION}
                  placeholder={
                    "Steps to reproduce, what you expected, and what you saw instead."
                  }
                  rows={6}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-base shadow-sm transition-colors placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  required
                />
                <p className="text-right text-[11px] tabular-nums text-neutral-400">
                  {description.length}/{MAX_DESCRIPTION}
                </p>
              </div>

              <p className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                Sent over email along with your account info, the current page
                URL, and your browser version so the bug can be tracked down.
              </p>

              {error ? (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </div>
              ) : null}
            </div>

            <div className="border-t border-neutral-200 bg-white p-4">
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Send report"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
