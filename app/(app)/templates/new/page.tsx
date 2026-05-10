import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TemplateForm } from "@/components/template-form";

export default function NewTemplatePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/templates"
          aria-label="Back"
          className="-ml-2 inline-flex size-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New template</h1>
      </div>

      <TemplateForm
        mode="create"
        initial={{
          name: "",
          splitType: "custom",
          estimatedMinutes: 60,
          exercises: [],
        }}
      />
    </div>
  );
}
