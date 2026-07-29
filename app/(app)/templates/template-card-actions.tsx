"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { GenerateDialog } from "@/components/generate-dialog";

export function TemplateCardActions({
  id,
  name,
  defaultMinutes,
}: {
  id: string;
  name: string;
  defaultMinutes: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await fetch(`/api/workout-templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast("Could not delete this routine", "error");
        return;
      }
      setConfirming(false);
      toast(`Deleted "${name}"`, "success");
      router.refresh();
    });
  };

  return (
    <>
      <Menu
        label={`Options for ${name}`}
        items={[
          {
            label: "Edit routine",
            icon: Pencil,
            onSelect: () => router.push(`/templates/${id}`),
          },
          {
            label: "Fit to time",
            icon: Wand2,
            onSelect: () => setGenerating(true),
          },
          {
            label: "Delete",
            icon: Trash2,
            tone: "danger",
            onSelect: () => setConfirming(true),
          },
        ]}
      />

      <GenerateDialog
        templateId={id}
        templateName={name}
        defaultMinutes={defaultMinutes}
        open={generating}
        onClose={() => setGenerating(false)}
      />

      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete "${name}"?`}
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirming(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        }
      >
        <p className="p-4 text-[14px] text-fg-muted">
          The routine disappears from your list. Workouts you already logged
          from it stay in your history.
        </p>
      </Sheet>
    </>
  );
}
