import {
  PrismaClient,
  type ItemCategory,
  type ItemUnit,
  type StorageType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  buildExpiryFields,
  quantityAfterAcceptance,
} from '../src/services/urgency.service';

/**
 * Seed data for local development.
 *
 * The point of this file is that a team member can clone, migrate, seed, and
 * immediately log in as any of the five roles with realistic data on screen.
 * Without it everyone spends their first morning hand-creating accounts and
 * listings before they can see a single screen work.
 *
 * Re-running it wipes and recreates everything, so it is safe to run whenever
 * the data gets into a confusing state.
 */

const prisma = new PrismaClient();

/** The one password every seeded account uses. Development only. */
const SEED_PASSWORD = 'Test@1234';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Fixed "now" so every item's urgency is deterministic within a single run. */
const now = new Date();

function hoursFromNow(hours: number): Date {
  return new Date(now.getTime() + hours * HOUR);
}

function hoursAgo(hours: number): Date {
  return new Date(now.getTime() - hours * HOUR);
}

function daysFromNow(days: number): Date {
  return new Date(now.getTime() + days * DAY);
}

async function clearDatabase(): Promise<void> {
  // Delete in dependency order. Some of these cascade, but being explicit
  // means this still works if a cascade rule is changed later.
  await prisma.notification.deleteMany();
  await prisma.deliveryAssignment.deleteMany();
  await prisma.donationRequestItem.deleteMany();
  await prisma.donationRequest.deleteMany();
  await prisma.donationItem.deleteMany();
  await prisma.donationListing.deleteMany();
  await prisma.user.deleteMany();
}

interface SeedUser {
  name: string;
  email: string;
  phone: string;
  address: string;
  role: 'admin' | 'coordinator' | 'donor' | 'recipient' | 'driver';
  organisationName?: string;
}

const seedUsers: SeedUser[] = [
  // One account per role. These are the logins the team uses day to day.
  {
    name: 'Nimal Perera',
    email: 'donor@eatme.lk',
    phone: '0771234567',
    address: '45 Galle Road, Colombo 03',
    role: 'donor',
    organisationName: 'Perera Bakery House',
  },
  {
    name: 'Kumari Silva',
    email: 'recipient@eatme.lk',
    phone: '0772345678',
    address: '12 Temple Road, Nugegoda',
    role: 'recipient',
    organisationName: "Sahana Children's Home",
  },
  {
    name: 'Ruwan Jayasuriya',
    email: 'coordinator@eatme.lk',
    phone: '0773456789',
    address: '88 Baseline Road, Colombo 09',
    role: 'coordinator',
  },
  {
    name: 'Sunil Fernando',
    email: 'driver@eatme.lk',
    phone: '0774567890',
    address: '7 Station Road, Mount Lavinia',
    role: 'driver',
  },
  {
    name: 'Platform Administrator',
    email: 'admin@eatme.lk',
    phone: '0775678901',
    address: 'SLIIT Malabe Campus, New Kandy Road, Malabe',
    role: 'admin',
  },

  // Two extra donors, so the browse list is not all from one organisation.
  {
    name: 'Chaminda Bandara',
    email: 'hotel@eatme.lk',
    phone: '0776789012',
    address: '2 Galle Face Centre Road, Colombo 03',
    role: 'donor',
    organisationName: 'Galle Face Grand Hotel',
  },
  {
    name: 'Ayesha Nawaz',
    email: 'bakery@eatme.lk',
    phone: '0777890123',
    address: '134 Main Street, Colombo 11',
    role: 'donor',
    organisationName: 'Colombo Fort Bakers',
  },

  // Two extra recipients, so requests are not all from one organisation.
  {
    name: 'Malini Wickramasinghe',
    email: 'elders@eatme.lk',
    phone: '0778901234',
    address: '56 Hotel Road, Mount Lavinia',
    role: 'recipient',
    organisationName: "Mount Lavinia Elders' Home",
  },
  {
    name: 'Tharindu Rajapaksa',
    email: 'orphanage@eatme.lk',
    phone: '0779012345',
    address: '23 Kandy Road, Kadawatha',
    role: 'recipient',
    organisationName: 'Sisu Diriya Children’s Home',
  },
];

interface SeedItem {
  foodName: string;
  category: ItemCategory;
  quantity: number;
  unit: ItemUnit;
  storageType: StorageType;
  expiryDate?: Date | null;
  preparedAt?: Date | null;
  safeWindowHours?: number | null;
}

async function main(): Promise<void> {
  console.log('Clearing existing data...');
  await clearDatabase();

  console.log('Creating users...');
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const users = new Map<string, number>();
  for (const u of seedUsers) {
    const created = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash,
        phone: u.phone,
        address: u.address,
        role: u.role,
        organisationName: u.organisationName ?? null,
      },
      select: { userId: true, email: true },
    });
    users.set(created.email, created.userId);
  }

  const donorId = users.get('donor@eatme.lk')!;
  const hotelId = users.get('hotel@eatme.lk')!;
  const bakeryId = users.get('bakery@eatme.lk')!;
  const recipientId = users.get('recipient@eatme.lk')!;
  const eldersId = users.get('elders@eatme.lk')!;

  console.log('Creating listings and items...');

  /*
   * Three listings, deliberately spread across the urgency range so that the
   * browse screen shows a critical, an urgent and a safe item on first run.
   * Urgency is never hand-written here: every item goes through
   * buildExpiryFields, the same function the donor module will use, so the
   * seed cannot drift from the real rule.
   */
  const listingSpecs: Array<{
    donorId: number;
    title: string;
    description: string;
    pickupAddress: string;
    pickupWindowStart: Date;
    pickupWindowEnd: Date;
    items: SeedItem[];
  }> = [
    {
      donorId: hotelId,
      title: 'Wedding function surplus, rice and curry',
      description:
        'Untouched buffet food from a 300 guest function. Kept covered in the banquet kitchen.',
      pickupAddress: '2 Galle Face Centre Road, Colombo 03',
      pickupWindowStart: hoursFromNow(1),
      pickupWindowEnd: hoursFromNow(5),
      items: [
        {
          // Prepared 20 hours ago with a 24 hour window, so it expires in 4
          // hours: this is the CRITICAL item.
          foodName: 'Chicken fried rice',
          category: 'prepared',
          quantity: 60,
          unit: 'servings',
          storageType: 'chilled',
          preparedAt: hoursAgo(20),
          safeWindowHours: 24,
        },
        {
          // Prepared recently, so it has plenty of window left, but prepared
          // food is urgent regardless. This is what proves that rule.
          foodName: 'Mixed vegetable curry',
          category: 'prepared',
          quantity: 40,
          unit: 'servings',
          storageType: 'chilled',
          preparedAt: hoursAgo(2),
          safeWindowHours: 12,
        },
      ],
    },
    {
      donorId: bakeryId,
      title: 'End of day bread and buns',
      description: 'Unsold stock from today. Still good tomorrow morning.',
      pickupAddress: '134 Main Street, Colombo 11',
      pickupWindowStart: hoursFromNow(2),
      pickupWindowEnd: hoursFromNow(8),
      items: [
        {
          // 30 hours out: inside the 48 hour window, so URGENT.
          foodName: 'Sliced bread loaves',
          category: 'packaged',
          quantity: 25,
          unit: 'loaves',
          storageType: 'ambient',
          expiryDate: hoursFromNow(30),
        },
        {
          // 40 hours out: also urgent, but comfortably above critical.
          foodName: 'Butter buns',
          category: 'packaged',
          quantity: 80,
          unit: 'packets',
          storageType: 'ambient',
          expiryDate: hoursFromNow(40),
        },
      ],
    },
    {
      donorId: donorId,
      title: 'Pantry stock clearance',
      description: 'Long life items from a bulk order we cannot store.',
      pickupAddress: '45 Galle Road, Colombo 03',
      pickupWindowStart: hoursFromNow(24),
      pickupWindowEnd: hoursFromNow(72),
      items: [
        {
          foodName: 'Milk powder 400g packets',
          category: 'packaged',
          quantity: 30,
          unit: 'packets',
          storageType: 'ambient',
          expiryDate: daysFromNow(45),
        },
        {
          foodName: 'Canned fish',
          category: 'packaged',
          quantity: 48,
          unit: 'cans',
          storageType: 'ambient',
          expiryDate: daysFromNow(120),
        },
        {
          foodName: 'Red raw rice',
          category: 'packaged',
          quantity: 50,
          unit: 'kg',
          storageType: 'ambient',
          expiryDate: daysFromNow(90),
        },
      ],
    },
  ];

  const createdItems: Array<{ itemId: number; foodName: string; listingId: number }> = [];

  for (const spec of listingSpecs) {
    const listing = await prisma.donationListing.create({
      data: {
        donorId: spec.donorId,
        title: spec.title,
        description: spec.description,
        pickupAddress: spec.pickupAddress,
        pickupWindowStart: spec.pickupWindowStart,
        pickupWindowEnd: spec.pickupWindowEnd,
      },
      select: { listingId: true },
    });

    for (const item of spec.items) {
      const created = await prisma.donationItem.create({
        data: {
          listingId: listing.listingId,
          foodName: item.foodName,
          quantity: item.quantity,
          quantityRemaining: item.quantity,
          unit: item.unit,
          storageType: item.storageType,
          ...buildExpiryFields(
            {
              category: item.category,
              expiryDate: item.expiryDate ?? null,
              preparedAt: item.preparedAt ?? null,
              safeWindowHours: item.safeWindowHours ?? null,
            },
            now,
          ),
        },
        select: { itemId: true, foodName: true, listingId: true },
      });
      createdItems.push(created);
    }
  }

  console.log('Creating requests...');

  const curry = createdItems.find((i) => i.foodName === 'Mixed vegetable curry')!;
  const bread = createdItems.find((i) => i.foodName === 'Sliced bread loaves')!;

  // Request 1: still pending. Nothing has been reserved, because
  // quantity_remaining only moves on acceptance.
  await prisma.donationRequest.create({
    data: {
      listingId: curry.listingId,
      recipientId: recipientId,
      message: 'We can collect this evening for 30 children. Thank you.',
      status: 'pending',
      items: {
        create: [{ itemId: curry.itemId, quantityRequested: 30 }],
      },
    },
  });

  // Request 2: accepted, so the donor's stock has actually moved.
  const acceptedQuantity = 10;
  const breadItem = await prisma.donationItem.findUniqueOrThrow({
    where: { itemId: bread.itemId },
    select: { quantityRemaining: true },
  });

  await prisma.donationRequest.create({
    data: {
      listingId: bread.listingId,
      recipientId: eldersId,
      message: 'Ten loaves would cover breakfast for our residents.',
      status: 'accepted',
      respondedAt: hoursAgo(1),
      items: {
        create: [{ itemId: bread.itemId, quantityRequested: acceptedQuantity }],
      },
    },
  });

  // The acceptance rule, applied through the shared service rather than by
  // subtracting inline, so the seed cannot disagree with the API.
  await prisma.donationItem.update({
    where: { itemId: bread.itemId },
    data: {
      quantityRemaining: quantityAfterAcceptance(
        breadItem.quantityRemaining,
        acceptedQuantity,
      ),
    },
  });

  // Some but not all of this listing is claimed.
  await prisma.donationListing.update({
    where: { listingId: bread.listingId },
    data: { status: 'partially_claimed' },
  });

  await printSummary();
}

async function printSummary(): Promise<void> {
  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
    select: { email: true, role: true, name: true, organisationName: true },
  });

  const counts = {
    users: users.length,
    listings: await prisma.donationListing.count(),
    items: await prisma.donationItem.count(),
    urgentItems: await prisma.donationItem.count({ where: { isUrgent: true } }),
    requests: await prisma.donationRequest.count(),
  };

  const emailWidth = Math.max(...users.map((u) => u.email.length), 5);
  const roleWidth = Math.max(...users.map((u) => u.role.length), 4);
  const nameWidth = Math.max(...users.map((u) => u.name.length), 4);

  const line = (l: string, m: string, r: string): string =>
    `${l}${'-'.repeat(emailWidth + 2)}${m}${'-'.repeat(roleWidth + 2)}${m}${'-'.repeat(nameWidth + 2)}${r}`;

  console.log('\nSeed complete.\n');
  console.log(line('+', '+', '+'));
  console.log(
    `| ${'EMAIL'.padEnd(emailWidth)} | ${'ROLE'.padEnd(roleWidth)} | ${'NAME'.padEnd(nameWidth)} |`,
  );
  console.log(line('+', '+', '+'));
  for (const u of users) {
    console.log(
      `| ${u.email.padEnd(emailWidth)} | ${u.role.padEnd(roleWidth)} | ${u.name.padEnd(nameWidth)} |`,
    );
  }
  console.log(line('+', '+', '+'));
  console.log(`\nEvery account uses the password: ${SEED_PASSWORD}\n`);
  console.log(
    `${counts.users} users, ${counts.listings} listings, ${counts.items} items ` +
      `(${counts.urgentItems} urgent), ${counts.requests} requests.\n`,
  );
}

main()
  .catch((error) => {
    console.error('\nSeed failed:\n', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
