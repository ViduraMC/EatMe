import { PrismaClient } from '@prisma/client';
import { env, isProduction } from './env';

/**
 * A single Prisma client for the whole process.
 *
 * "tsx watch" re-evaluates modules on every save. Without stashing the client
 * on globalThis, each reload would construct a new PrismaClient and open
 * another connection pool, and MySQL would start refusing connections after a
 * few minutes of editing.
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
