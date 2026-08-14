import { PrismaClient } from '@prisma/client';
import { env, isProduction } from './env';

/**
 * A single Prisma client for the whole process.
 *
 * "tsx watch" re-evaluates modules on every save. Without stashing the client
 * on globalThis, each reload would construct a new PrismaClient and open
 * another connection pool. Postgres has a hard max_connections limit, usually
 * 100, so a few minutes of editing would exhaust it and every query would start
 * failing with "too many clients already".
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
