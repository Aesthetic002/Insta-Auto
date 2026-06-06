import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { listTemplatesForProfession } from "@/lib/templates";
import { StudioGallery } from "@/components/studio-gallery";

// The Studio is the new home for templates — image + video, profession-filtered.
// Replaces /templates from the earlier video-only flow.

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: "image" | "video" }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const me = await db.user.findUnique({ where: { id: userId } });
  if (!me) redirect("/");

  const sp = await searchParams;
  const kindFilter = sp.kind === "image" || sp.kind === "video" ? sp.kind : null;

  const templates = listTemplatesForProfession(me.profession);
  const filtered = kindFilter
    ? templates.filter((t) => t.kind === kindFilter)
    : templates;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Studio</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {me.profession === "DENTAL"
            ? "Templates tailored for dental clinics. Pick one, drop in your photos or clips, and we'll render the ad for you."
            : "Pick a template, add your media, and we'll render an ad-ready post for you."}
        </p>
      </div>

      <StudioGallery templates={filtered} activeKind={kindFilter} />
    </div>
  );
}
