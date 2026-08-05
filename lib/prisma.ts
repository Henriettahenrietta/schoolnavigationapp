import { PrismaClient, Prisma } from "@prisma/client";

// A single PrismaClient instance is reused across hot-reloads in development to avoid
// exhausting database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Transient errors worth retrying (the cloud DB link can flap on some networks):
//  P1001 — can't reach database server; P1017 — server closed the connection;
//  P2024 — timed out fetching a connection from the pool.
const RETRYABLE = new Set(["P1001", "P1017", "P2024"]);

function isTransient(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  if (e instanceof Prisma.PrismaClientKnownRequestError) return RETRYABLE.has(e.code);
  const msg = (e as any)?.message ?? "";
  return typeof msg === "string" && msg.includes("Can't reach database server");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Neon suspends an idle compute and takes several seconds to wake it again. Prisma's
 * default connect_timeout is 5s, so the first query after a quiet spell can fail with
 * "Can't reach database server" while the database is still starting — and retrying
 * does not help, because every attempt hits the same 5s wall.
 *
 * Widening the timeout lets one attempt wait the wake-up out. This is applied to the
 * URL in code rather than in .env so it also covers Vercel, where the connection string
 * comes from the dashboard. An explicit value in the URL always wins.
 */
function withTimeouts(url: string | undefined): string | undefined {
  if (!url) return url;
  // Plain string append: parsing and re-serialising a URL risks mangling credentials.
  let out = url;
  for (const [param, value] of [
    ["connect_timeout", "20"],
    ["pool_timeout", "20"],
  ]) {
    if (!new RegExp(`[?&]${param}=`).test(out)) {
      out += (out.includes("?") ? "&" : "?") + `${param}=${value}`;
    }
  }
  return out;
}

function makeClient() {
  const url = withTimeouts(process.env.DATABASE_URL);
  const base = new PrismaClient({
    ...(url ? { datasourceUrl: url } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Retry every operation up to 3 times on transient connection errors. The backoff is
  // deliberately longer than the old 300ms: a cold start takes seconds, not milliseconds.
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastErr: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await query(args);
          } catch (e) {
            lastErr = e;
            if (!isTransient(e) || attempt === 2) throw e;
            await sleep(1000 * (attempt + 1));
          }
        }
        throw lastErr;
      },
    },
  });
}

// Cast the $extends result back to PrismaClient: the retry wrapper is transparent to
// callers, and this keeps every existing type (including transaction clients) unchanged.
export const prisma = (globalForPrisma.prisma ?? (makeClient() as unknown as PrismaClient));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
