import { PrismaClient } from '@prisma/client';

/**
 * Server-side Prisma client. Appends a short server-selection timeout to the
 * connection string so that when MongoDB is unreachable, server-rendered
 * pages hit their error state in ~5 seconds instead of hanging for the
 * MongoDB driver's default 30 seconds (which turns into 502s at the proxy).
 */
function withFailFastTimeout(url: string | undefined): string | undefined {
  if (!url) return url;
  return url + (url.includes('?') ? '&' : '?') + 'serverSelectionTimeoutMS=5000';
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ datasources: { db: { url: withFailFastTimeout(process.env.DATABASE_URL) } } });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
