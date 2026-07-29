import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/**
 * The live workout screen gets its own layout: no tab bar, no page padding.
 * It owns the whole viewport so the sticky header, set grid and rest timer can
 * sit flush against the edges — and so nothing competes with logging a set.
 */
export default async function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return <div className="min-h-dvh">{children}</div>;
}
