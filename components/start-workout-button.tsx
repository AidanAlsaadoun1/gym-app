"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Play } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

interface Props {
  templateId: string;
  /** Visual style — defaults to filled primary. */
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  label?: string;
  fullWidth?: boolean;
}

export function StartWorkoutButton({
  templateId,
  variant = "default",
  size = "default",
  className,
  label = "Start",
  fullWidth = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutTemplateId: templateId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Could not start session");
        setLoading(false);
        return;
      }
      const data = await res.json();
      router.push(`/session/${data.session.id}`);
    } catch {
      alert("Could not start session");
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={start}
      disabled={loading}
      className={`${fullWidth ? "w-full" : ""} ${className ?? ""}`}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          <Play className="size-4" />
          {label}
        </>
      )}
    </Button>
  );
}
