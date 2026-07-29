import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card variant="dashed" padding="lg" className="text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-inset text-fg-subtle">
        <Icon className="size-6" />
      </div>
      <h3 className="mt-3.5 text-[15px] font-bold text-fg">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1 max-w-[36ch] text-[13px] text-fg-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
