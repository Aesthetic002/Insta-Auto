import { db } from "@/lib/db";

export type Role = "CREATOR" | "EDITOR";

/**
 * Returns IDs of creators the given user can act on behalf of.
 * - CREATOR: just themselves.
 * - EDITOR: every creator that has accepted them.
 */
export async function listAccessibleCreators(userId: string): Promise<string[]> {
  const me = await db.user.findUnique({ where: { id: userId } });
  if (!me) return [];
  if (me.role === "CREATOR") return [me.id];

  const links = await db.editorAssignment.findMany({
    where: { editorId: userId, status: "ACCEPTED" },
    select: { creatorId: true },
  });
  return links.map((l) => l.creatorId);
}

/** True if the viewer can READ/WRITE drafts in the creator's workspace. */
export async function canEditCreatorWorkspace(
  viewerId: string,
  creatorId: string
): Promise<boolean> {
  if (viewerId === creatorId) {
    const me = await db.user.findUnique({ where: { id: viewerId } });
    return me?.role === "CREATOR";
  }
  const link = await db.editorAssignment.findUnique({
    where: { creatorId_editorId: { creatorId, editorId: viewerId } },
  });
  return link?.status === "ACCEPTED";
}

/**
 * True if the viewer is the creator themselves (NOT an editor on their behalf).
 * Use this for actions only the creator may perform: schedule, publish, approve,
 * connect/disconnect IG, change preferences, manage editors.
 */
export async function isCreatorOf(
  viewerId: string,
  creatorId: string
): Promise<boolean> {
  if (viewerId !== creatorId) return false;
  const me = await db.user.findUnique({ where: { id: viewerId } });
  return me?.role === "CREATOR";
}

/**
 * Resolve which creator's workspace the viewer is currently acting in.
 * For a CREATOR this is always themselves.
 * For an EDITOR, the caller may pass `preferred` (e.g. from a query param or
 * cookie); we pick that if accessible, otherwise the first accepted assignment.
 * Returns null if editor has no accepted creators.
 */
export async function resolveActiveCreator(
  viewerId: string,
  preferred?: string | null
): Promise<{ creatorId: string; isOwn: boolean } | null> {
  const me = await db.user.findUnique({ where: { id: viewerId } });
  if (!me) return null;
  if (me.role === "CREATOR") return { creatorId: me.id, isOwn: true };

  const accessible = await listAccessibleCreators(viewerId);
  if (accessible.length === 0) return null;
  if (preferred && accessible.includes(preferred)) {
    return { creatorId: preferred, isOwn: false };
  }
  return { creatorId: accessible[0], isOwn: false };
}
