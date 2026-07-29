"use client";

import { useEffect, useState } from "react";
import { Bug, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";

const MIN_TITLE = 3;
const MIN_DESCRIPTION = 10;
const MAX_TITLE = 120;
const MAX_DESCRIPTION = 5000;

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Bug className="size-4" />
        Report a bug
      </Button>
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

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setError(null);
    setSent(false);
    setSubmitting(false);
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (title.trim().length < MIN_TITLE) {
      setError(`Give it a title of at least ${MIN_TITLE} characters`);
      return;
    }
    if (description.trim().length < MIN_DESCRIPTION) {
      setError(`Describe what happened in at least ${MIN_DESCRIPTION} characters`);
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
          url: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not send the report");
      }
      setSent(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title="Report sent"
        footer={
          <Button className="w-full" onClick={onClose} data-autofocus>
            Close
          </Button>
        }
      >
        <div className="px-5 py-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
            <Check className="size-6" />
          </div>
          <h3 className="mt-3.5 text-[16px] font-bold text-fg">
            Thanks — that helps.
          </h3>
          <p className="mx-auto mt-1 max-w-[34ch] text-[13px] text-fg-muted">
            Your name, email and the page you were on went along with it, so
            there&apos;s enough context to chase it down.
          </p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Report a bug"
      footer={
        <Button
          type="submit"
          form="bug-report-form"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Send report"
          )}
        </Button>
      }
    >
      <form id="bug-report-form" className="space-y-4 p-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label htmlFor="bug-title">What went wrong?</Label>
          <Input
            id="bug-title"
            data-autofocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={MAX_TITLE}
            placeholder="Sets disappear when I switch exercises"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bug-description">Details</Label>
          <Textarea
            id="bug-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={MAX_DESCRIPTION}
            placeholder="What you did, what you expected, and what happened instead."
            rows={6}
            required
          />
          <p className="text-right text-[11px] tabular-nums text-fg-subtle">
            {description.length}/{MAX_DESCRIPTION}
          </p>
        </div>

        <p className="rounded-xl border border-border bg-inset px-3 py-2.5 text-[12px] text-fg-muted">
          Sent by email with your account details, the current page URL and your
          browser version attached.
        </p>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-danger/40 bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger"
          >
            {error}
          </div>
        ) : null}
      </form>
    </Sheet>
  );
}
