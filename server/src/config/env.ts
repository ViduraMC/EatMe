import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment variables, validated at startup.
 *
 * Failing here with a readable message is much cheaper than a request failing
 * later with "secretOrPrivateKey must have a value", which is what happens if
 * JWT_SECRET is missing and nothing checks for it.
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required. Copy .env.example to .env and fill it in.'),
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z
    .string()
    .min(
      32,
      "JWT_SECRET must be at least 32 characters. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
    ),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  // How many proxies sit between the internet and this server. See RELEASE.md
  // for how to check the value on the host.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

// The example secrets are public on GitHub. A server running in production with
// one of them would let anyone mint a valid admin token, so refuse to start.
if (
  parsed.data.NODE_ENV === 'production' &&
  /change_me|example|secret_here/i.test(parsed.data.JWT_SECRET)
) {
  console.error(
    '\nJWT_SECRET is still the placeholder from .env.example. Set a random one.\n',
  );
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
