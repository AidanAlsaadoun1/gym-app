import { PageHeader } from "@/components/page-header";
import { TemplateForm } from "@/components/template-form";

export const metadata = { title: "New routine" };

export default function NewTemplatePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="New routine"
        subtitle="Pick your exercises and set the targets."
        backHref="/templates"
      />

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
