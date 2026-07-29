import Link from "next/link";
import { Compass } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card padding="lg" className="w-full max-w-sm text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-inset text-fg-subtle">
          <Compass className="size-6" />
        </div>
        <h1 className="mt-3.5 text-[18px] font-bold tracking-tight text-fg">
          Page not found
        </h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Whatever you were after isn&apos;t here.
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ size: "md" }), "mt-5 w-full")}
        >
          Back home
        </Link>
      </Card>
    </div>
  );
}
