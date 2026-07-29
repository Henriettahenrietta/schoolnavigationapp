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

function makeClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Retry every operation up to 3 times on transient connection errors with short backoff.
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
            await sleep(300 * (attempt + 1));
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
