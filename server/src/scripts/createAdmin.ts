import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

/**
 * Creates the first administrator on a fresh production database.
 *
 * Admins cannot sign up through the app (see registerSchema), and the seed
 * script refuses to run in production, so this is the only way in. Run it once
 * from your laptop with the production DATABASE_URL set (RELEASE.md step 4),
 * then create every other staff account in the app.
 *
 * It uses its own Prisma client rather than config/prisma, so only
 * DATABASE_URL is needed, not the server's JWT_SECRET. The values come from
 * the environment rather than the command line so the password does not end
 * up in shell history.
 */
const adminSchema = z.object({
  ADMIN_NAME: z.string().trim().min(2),
  ADMIN_EMAIL: z.string().trim().toLowerCase().email(),
  ADMIN_PHONE: z.string().trim().min(9).max(20),
  ADMIN_PASSWORD: z
    .string()
    .min(12, 'Use at least 12 characters for the admin password')
    .max(72),
});

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const input = adminSchema.parse(process.env);

  const existing = await prisma.user.findUnique({ where: { email: input.ADMIN_EMAIL } });
  if (existing) {
    throw new Error(
      `An account with ${input.ADMIN_EMAIL} already exists; nothing changed.`,
    );
  }

  const admin = await prisma.user.create({
    data: {
      name: input.ADMIN_NAME,
      email: input.ADMIN_EMAIL,
      phone: input.ADMIN_PHONE,
      address: 'EatMe administration',
      passwordHash: await bcrypt.hash(input.ADMIN_PASSWORD, 12),
      role: 'admin',
      status: 'active',
    },
    select: { userId: true, email: true },
  });

  console.log(`Created admin ${admin.email} (user ${admin.userId}).`);
}

main()
  .catch((error) => {
    console.error(
      '\nCould not create the admin:\n',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
