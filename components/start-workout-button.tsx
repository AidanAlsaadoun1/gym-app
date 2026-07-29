"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Play } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface Props {
  templateId: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  label?: string;
  fullWidth?: boolean;
}

export function StartWorkoutButton({
  templateId,
  variant = "primary",
  size = "md",
  className,
  label = "Start",
  fullWidth = false,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  /** Set when the server reports an existing in-progress workout (409). */
  const [conflictSessionId, setConflictSessionId] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutTemplateId: templateId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.session?.id) {
        // Only one workout can be live at a time. Rather than silently
        // stranding the old one, let them choose.
        setConflictSessionId(data.session.id as string);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        toast(data.error ?? "Could not start this workout", "error");
        setLoading(false);
        return;
      }

      router.push(`/session/${data.session.id}`);
    } catch {
      toast("Could not start this workout — check your connection", "error");
      setLoading(false);
    }
  };

  const discardAndStart = async () => {
    if (!conflictSessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${conflictSessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setConflictSessionId(null);
      await start();
    } catch {
      toast("Could not discard the workout in progress", "error");
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={start}
        disabled={loading}
        className={cn(fullWidth && "w-full", className)}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Play className="size-4 fill-current" />
            {label}
          </>
        )}
      </Button>

      <Sheet
        open={conflictSessionId !== null}
        onClose={() => setConflictSessionId(null)}
        title="Workout already in progress"
        footer={
          <div className="space-y-2">
            <Button
              className="w-full"
              data-autofocus
              onClick={() => router.push(`/session/${conflictSessionId}`)}
            >
              Resume it
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              disabled={loading}
              onClick={discardAndStart}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Discard it and start this one"
              )}
            </Button>
          </div>
        }
      >
        <p className="p-4 text-[14px] text-fg-muted">
          You&apos;ve got an unfinished workout. Pick it back up, or throw it
          away and start fresh — discarding deletes the sets logged in it.
        </p>
      </Sheet>
    </>
  );
}
