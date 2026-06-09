import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveActiveCreator } from "@/lib/permissions";
import { buildPrefillValues, getTemplate } from "@/lib/templates";
import { TemplateRender } from "@/components/template-render";
import { ImageTemplateRender } from "@/components/image-template-render";

export default async function StudioTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = getTemplate(id);
  if (!template) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/");

  // Resolve the active creator's profile + media library so the form pre-fills.
  const cookieStore = await cookies();
  const ctx = await resolveActiveCreator(
    session.user.id,
    cookieStore.get("active_creator")?.value
  );

  const profile = ctx
    ? await db.businessProfile.findUnique({ where: { userId: ctx.creatorId } })
    : null;

  const mediaAssets = ctx
    ? await db.mediaAsset.findMany({
        where: {
          userId: ctx.creatorId,
          kind: template.kind === "video" ? "VIDEO" : "IMAGE",
        },
        orderBy: { createdAt: "desc" },
        take: 60,
        select: { id: true, url: true, label: true },
      })
    : [];

  const prefillValues = buildPrefillValues(template, profile);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/studio"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to studio
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">{template.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">{template.description}</p>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
        <div>
          {template.kind === "video" ? (
            <TemplateRender
              template={template}
              prefillValues={prefillValues}
              mediaAssets={mediaAssets}
            />
          ) : (
            <ImageTemplateRender
              template={template}
              prefillValues={prefillValues}
              mediaAssets={mediaAssets}
            />
          )}
        </div>

        {template.previewUrl && (
          <aside className="hidden md:block">
            <div className="sticky top-6">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                {template.kind === "video" ? (
                  <video
                    src={template.previewUrl}
                    className="w-full"
                    muted
                    loop
                    playsInline
                    autoPlay
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={template.previewUrl}
                    alt="Preview"
                    className="w-full"
                  />
                )}
              </div>
              <p className="mt-2 px-1 text-xs text-zinc-500">
                Preview with sample content. Your render will use the inputs you
                provide.
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
