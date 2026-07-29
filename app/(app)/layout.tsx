import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Drives the tab bar's centre button: resume vs start.
  const [inProgress] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.userId, session.user.id), isNull(sessions.endTime)))
    .orderBy(desc(sessions.startTime))
    .limit(1);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <main
        className="flex-1 px-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)",
        }}
      >
        {children}
      </main>
      <BottomNav activeSessionId={inProgress?.id ?? null} />
    </div>
  );
}
