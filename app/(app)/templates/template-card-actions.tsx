"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TemplateCardActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await fetch(`/api/workout-templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Could not delete template");
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  };

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${name}`}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-4 text-neutral-500" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
    </div>
  );
}
