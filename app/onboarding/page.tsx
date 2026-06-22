import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (user?.onboarded) redirect("/dashboard");

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center bg-gradient-to-br from-fuchsia-50 via-white to-rose-50 px-6 py-16 dark:from-fuchsia-950/30 dark:via-black dark:to-rose-950/20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(244,114,182,0.15),_transparent_60%)]" />

      <div className="absolute left-6 top-6 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-sm shadow-rose-500/30">
          <Sparkles className="h-4 w-4" />
        </div>
        Promote
      </div>

      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome,{" "}
            {session.user.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            How will you use Promote? You can change this later in settings.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  );
}
