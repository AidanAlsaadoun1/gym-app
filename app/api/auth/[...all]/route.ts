import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);

// better-auth needs the Node runtime (Drizzle + Neon WebSocket pool).
export const runtime = "nodejs";
