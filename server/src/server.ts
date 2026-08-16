import os from 'node:os';
import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

/**
 * Finds this machine's LAN address, for example 192.168.1.7.
 *
 * Printing it at startup saves every member from looking up ipconfig. The phone
 * cannot reach the laptop on localhost, so EXPO_PUBLIC_API_URL has to use this
 * address.
 */
const VIRTUAL_ADAPTER_PATTERN =
  /vethernet|virtualbox|vboxnet|docker|wsl|hyper-v|tailscale|zerotier|vmware|utun|bridge|tap|tun/i;
const PHYSICAL_ADAPTER_PATTERN = /wi-?fi|wlan|en0|eth/i;

function findLanAddress(): string | null {
  const candidates: { name: string; address: string }[] = [];

  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL_ADAPTER_PATTERN.test(name)) continue;
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        candidates.push({ name, address: address.address });
      }
    }
  }

  if (candidates.length === 0) return null;

  const preferred = candidates.find((c) => PHYSICAL_ADAPTER_PATTERN.test(c.name));
  const chosen = preferred ?? candidates[0];

  if (candidates.length > 1) {
    const others = candidates.filter((c) => c !== chosen);
    console.log(
      `  (multiple network interfaces found, using "${chosen!.name}"; also saw: ${others
        .map((c) => `${c.name}=${c.address}`)
        .join(', ')})`,
    );
  }

  return chosen!.address;
}

async function start(): Promise<void> {
  // Fail fast and loudly if Postgres is not up, rather than letting the first
  // request be the thing that discovers it.
  try {
    await prisma.$connect();
    console.log('[db] connected');
  } catch (error) {
    console.error('\n[db] could not connect to PostgreSQL.');
    console.error('     Check that Postgres is running and that DATABASE_URL in');
    console.error('     server/.env points at a database that exists.\n');
    console.error(error);
    process.exit(1);
  }

  // 0.0.0.0, not localhost. Binding to localhost would make the API reachable
  // from the laptop only, and every phone on the network would time out.
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    const lan = findLanAddress();
    console.log(`\n  EatMe API running in ${env.NODE_ENV} mode`);
    console.log(`  local:   http://localhost:${env.PORT}/api/health`);
    if (lan) {
      console.log(`  network: http://${lan}:${env.PORT}/api/health`);
      console.log(`\n  Put this in mobile/.env:`);
      console.log(`  EXPO_PUBLIC_API_URL=http://${lan}:${env.PORT}/api\n`);
    } else {
      console.log('  network: no LAN address found. Are you connected to Wi-Fi?\n');
    }
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[${signal}] shutting down`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void start();
