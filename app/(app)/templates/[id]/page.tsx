import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getTemplate } from "@/lib/templates";
import { TemplateRender } from "@/components/template-render";

export default async function TemplateCreatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = getTemplate(id);
  if (!template) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/templates"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to templates
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">{template.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">{template.description}</p>
      <div className="mt-8">
        {template.kind === "video" ? (
          <TemplateRender template={template} />
        ) : (
          // Image-template UI ships in Phase 6. Until then this is a stub so
          // the dental templates can be defined without breaking the page.
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
            Image template editor coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
