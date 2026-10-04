import { PrismaClient } from '@prisma/client';

/**
 * Server-side Prisma client. When DATABASE_URL is set, appends a short
 * server-selection timeout to the connection string so that when MongoDB is
 * unreachable, server-rendered pages hit their error state in ~5 seconds
 * instead of hanging for the MongoDB driver's default 30 seconds (which the
 * proxy turns into 502s).
 *
 * The datasource override is only applied when DATABASE_URL exists: passing an
 * explicit undefined would throw at client construction in environments
 * without a database (e.g. the CI build).
 */
function withFailFastTimeout(url: string): string {
  return url + (url.includes('?') ? '&' : '?') + 'serverSelectionTimeoutMS=5000';
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  (process.env.DATABASE_URL
    ? new PrismaClient({ datasources: { db: { url: withFailFastTimeout(process.env.DATABASE_URL) } } })
    : new PrismaClient());

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
