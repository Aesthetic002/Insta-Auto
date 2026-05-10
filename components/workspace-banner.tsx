import Link from "next/link";

interface Creator {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

/**
 * Top-of-page strip shown to editors so they always know which creator's
 * workspace they're viewing. Renders nothing for creators (their own workspace).
 */
export function WorkspaceBanner({
  creator,
  multipleCreators,
}: {
  creator: Creator;
  multipleCreators: boolean;
}) {
  return (
    <div className="border-b border-fuchsia-200/60 bg-gradient-to-r from-fuchsia-50 via-white to-rose-50 px-6 py-2.5 text-sm dark:border-fuchsia-900/30 dark:from-fuchsia-950/30 dark:via-zinc-950 dark:to-rose-950/20">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        {creator.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.image}
            alt=""
            className="h-6 w-6 shrink-0 rounded-full"
          />
        ) : (
          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 text-[11px] font-semibold text-white">
            {(creator.name?.[0] ?? creator.email[0] ?? "?").toUpperCase()}
          </div>
        )}
        <span className="text-zinc-600 dark:text-zinc-400">
          You&apos;re editing in{" "}
          <strong className="text-zinc-900 dark:text-zinc-100">
            {creator.name ?? creator.email}
          </strong>
          &apos;s workspace
        </span>
        {multipleCreators && (
          <Link
            href="#"
            className="ml-auto text-xs text-fuchsia-700 hover:underline dark:text-fuchsia-300"
            // The picker is in the sidebar; we can't toggle a dropdown from here,
            // but a hint to look there is useful on small screens.
          >
            Switch via sidebar →
          </Link>
        )}
      </div>
    </div>
  );
}
