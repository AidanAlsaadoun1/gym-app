import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// In Node.js runtimes (i.e. anywhere we run Drizzle on the server) the Neon
// serverless driver needs a WebSocket implementation. In edge/browser
// environments WebSocket is already global, but our API routes run on the
// Node runtime so this is the path that's exercised in practice.
if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse the pool across hot reloads in dev to avoid leaking connections.
const globalForDb = globalThis as unknown as { __pool?: Pool };

const pool =
  globalForDb.__pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pool = pool;
}

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export { schema };
