# EatMe — Food Requests Module: Complete Guide for Haritha

**Owner:** Haritha Cabraal
**Module:** Food Requests
**Your folders:** `mobile/src/screens/recipient/` and `server/src/routes/requests.routes.ts`
**Your branch:** `feature/donation-request`
**Your stories:** US-R01 (Sprint 1) and US-R02 (Sprint 2)

Read this whole file once before writing any code. Part 0 has to be done before anything will run.

---

## Contents

- Part 0 — Get the project running on your machine and phone
- Part 1 — Git workflow, exactly
- Part 2 — What you are building
- Part 3 — What already exists: reuse it, do not rebuild it
- Part 4 — Server files to create
- Part 5 — Mobile files to create
- Part 6 — Domain rules you must get right
- Part 7 — How to verify your work
- Part 8 — One cross-module thing to settle with Vidura first
- Part 9 — Definition of Done checklist
- Appendix A — The API you consume
- Appendix B — Seeded test accounts

---

## Part 0 — Get the project running on your machine and phone

Do every step. Skipping any one produces an error that looks like a code bug but is not.

### 0.1 Prerequisites

- **Node.js 18 or later** and npm
- **Docker.** On Windows use **Docker Engine inside WSL2**, not Docker Desktop
- **Expo Go** app on your Android phone, from the Play Store
- Your **phone and laptop on the same Wi-Fi**

### 0.2 Clone and install

```bash
git clone https://github.com/ViduraMC/EatMe.git
```

```bash
cd EatMe && npm install
```

**That root `npm install` is not optional.** It installs the git hooks that check your commit messages. Skip it and your commits silently bypass the format the module grades us on.

Then install both sides:

```bash
npm run install:all
```

> Do **not** run `npm --prefix server install`. That form resolves the repository root as a dependency and silently writes `"eatme": "file:.."` into `server/package.json`. `npm run install:all` does it correctly.

### 0.3 Start PostgreSQL

The database is **PostgreSQL**, not MySQL. Anything in older notes saying MySQL is out of date.

```bash
npm run db:up
```

If port 5432 is already used by another project on your machine, use a different port rather than stopping theirs:

```bash
EATME_DB_PORT=5433 npm run db:up
```

Check it is healthy with `docker ps` — you want `eatme_postgres` showing `(healthy)`.

### 0.4 Configure the server

```bash
cd server && cp .env.example .env
```

Open `server/.env` and:

1. Generate a JWT secret and paste it into `JWT_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

2. **Use `127.0.0.1` in `DATABASE_URL`, never `localhost`.** Prisma's engine resolves `localhost` to the IPv6 address `::1`, and the container does not answer there. You get `P1001: Can't reach database server` while the port is provably open. This wastes an hour if you do not know it.

3. If you changed the port in 0.3, change it here too.

### 0.5 Create the tables and sample data

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

The seed prints a table of logins. It creates 9 users, 3 listings, 7 food items spread across the urgency range, and 2 requests. **Re-run `npm run db:seed` whenever your data gets confusing** — it wipes and recreates.

> Re-seed before a demo. The seed uses times relative to when it runs, so data seeded days ago shows every item as expired.

### 0.6 Open the firewall — THIS IS THE ONE THAT WASTES HOURS

Your phone cannot reach the laptop until you do this. Windows classifies home Wi-Fi as `Public` and blocks all inbound connections, and node gets no rule automatically.

**Symptom if you skip it:** Expo Go shows a blue screen with
`Uncaught Error: java.io.IOException: Failed to download remote update`.
That is **not** a JavaScript error. It means the phone could not download the bundle at all.

Open **PowerShell as Administrator**, once, and run both:

```powershell
New-NetFirewallRule -DisplayName "EatMe Metro 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private,Public
```

```powershell
New-NetFirewallRule -DisplayName "EatMe API 5000" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow -Profile Private,Public
```

Remove them when the project is finished:

```powershell
Remove-NetFirewallRule -DisplayName "EatMe Metro 8081","EatMe API 5000"
```

Everything you test on the laptop over `127.0.0.1` passes whether or not you do this, because localhost bypasses the firewall. Only a real phone finds it.

### 0.7 Run all three pieces

**Terminal 1 — keep WSL alive.** WSL shuts its VM down when nothing is running inside it, which stops your database mid-session:

```bash
wsl
```

Leave that window open and do nothing in it.

**Terminal 2 — the API:**

```bash
npm run dev:server
```

Wait for `[db] connected`. It prints your LAN address and the exact line to paste into `mobile/.env`. Copy that line.

**Terminal 3 — Expo:**

```bash
cd mobile && cp .env.example .env
```

Paste the line the API printed into `mobile/.env`. It **must** be your laptop's LAN IP, never `localhost` — on a phone, `localhost` means the phone itself.

```bash
npm run dev:mobile
```

### 0.8 Open it on your phone

Scan the QR code with **Expo Go**. Log in as `recipient@eatme.lk` / `Test@1234`.

You will land on the recipient stub screen. That stub is the file you are going to replace.

### 0.9 If something fails

| Symptom                                         | Cause                                                                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Failed to download remote update` on the phone | Firewall, step 0.6. Not a code bug                                                                                                                                        |
| `Cannot reach the server` inside the app        | `EXPO_PUBLIC_API_URL` wrong, or phone on a different Wi-Fi. After changing `.env` restart with `npm --prefix mobile run start:clear` — the value is baked into the bundle |
| `P1001: Can't reach database server`            | Use `127.0.0.1` not `localhost` in `DATABASE_URL`                                                                                                                         |
| Database vanished mid-session                   | Your WSL terminal closed. Reopen it, then `npm run db:up`                                                                                                                 |
| App crashes after pulling changes               | `npm run install:all`, then `npm --prefix mobile run start:clear`                                                                                                         |
| Every food item shows as expired                | Stale seed data. `npm run db:seed`                                                                                                                                        |
| Your commit was rejected                        | Message must match `type(scope): subject`. See Part 1                                                                                                                     |

---

## Part 1 — Git workflow, exactly

### 1.1 The branch structure

```
main                                  demonstrated code only, never commit here
 └── dev                              integration branch, everything merges here via PR
      └── feature/donation-request    <-- YOUR branch
```

**Never commit to `main` or `dev` directly.** Always work on `feature/donation-request`.

### 1.2 Start of every working session

Run this **every time you sit down**, before writing anything. It is the single most effective thing you can do to avoid a painful merge later:

```bash
git checkout dev && git pull origin dev
```

```bash
git checkout feature/donation-request && git merge dev
```

If `dev` changed dependencies, follow with `npm run install:all`.

### 1.3 Commit message format — enforced by a git hook

```
<type>(<scope>): <subject>
```

**Allowed types:** `feat` `fix` `docs` `style` `refactor` `test` `chore`

**Allowed scopes:** `donation` `request` `delivery` `driver` `admin` `auth` `db` `api` `ui` `config`

**Your scope is almost always `request`.**

Rules the hook checks: lower case subject, no full stop at the end, whole header under 72 characters, scope required and from the list above.

Good:

```
feat(request): add browse listings screen with search and filter
feat(request): add request endpoints with role guards
fix(request): prevent requesting more than the available quantity
```

Rejected:

```
update                          no type, no scope
feat: add browse                no scope
feat(browse): add screen        "browse" is not an allowed scope
Feat(request): Add Browse.      capitals and a full stop
```

If a ClickUp task exists, put its id at the end: `feat(request): add browse screen (CU-86eyknr1q)`

### 1.4 Commit in logical chunks, not one big commit

**The commit history is graded evidence of your individual contribution.** One giant commit is worth much less than six clear ones. Aim for something like:

```
feat(request): add request service with quantity and ownership rules
feat(request): add request endpoints with role guards and validation
feat(request): add request api client and types
feat(request): add browse listings screen with search and filter
feat(request): add listing detail and request form screens
feat(request): add my requests screen
```

### 1.5 Push and open a pull request

```bash
git push -u origin feature/donation-request
```

Then open a PR on GitHub **into `dev`**, not `main`. The PR template fills in automatically. Fill in every section — the acceptance criteria and screenshots become our sprint review evidence.

**Every PR needs one approving review from another member.** Do not merge your own without a review, and ask a real person — a Copilot review does not count.

### 1.6 Never do these

- Never commit `.env` (only `.env.example` is committed)
- Never commit on behalf of another member
- Never amend or rebase away someone else's commits
- Never edit files inside another member's module folder. If you genuinely need a change in shared code, message the team first

---

## Part 2 — What you are building

### US-R01: Browse Available Food Listings — Sprint 1, 5 points

Acceptance criteria, straight from `docs/02-product-backlog.md`:

- Recipient can view a list of open listings
- Each listing shows item details (category, quantity, expiry or urgency)
- Recipient can search or filter listings
- Urgent items appear first

**Good news: the API for this is already built, tested and merged into `dev`.** `GET /api/donations` returns exactly this, already ordered urgent first, with search and filter support. **US-R01 is a mobile-only story for you.** See Appendix A for the exact response shape.

### US-R02: Request Specific Food Items — Sprint 2, 8 points

Endpoints you must build, from `docs/05-api-plan.md`:

| Method | Endpoint                   | Description                                        | Role          |
| ------ | -------------------------- | -------------------------------------------------- | ------------- |
| POST   | `/api/requests`            | Create a request for specific items and quantities | Recipient     |
| GET    | `/api/requests/mine`       | The current recipient's own requests               | Recipient     |
| GET    | `/api/requests/incoming`   | Requests on the current donor's listings           | Donor         |
| GET    | `/api/requests/:id`        | Request detail                                     | Owner roles   |
| PUT    | `/api/requests/:id/accept` | Accept a request                                   | Donor (owner) |
| PUT    | `/api/requests/:id/reject` | Reject with an optional reason                     | Donor (owner) |

Read Part 8 before building the last two — they implement Vidura's user story, not yours.

### Screens, from the Sprint 0 wireframes

The wireframes are in `docs/wireframes/EatMe_Wireframes.png`. Your recipient screens are:

1. **Browse Listings** — header, filter chips, list of listing cards
2. **Filter Sheet** — a bottom sheet with filters, Reset and Apply
3. **Listing Details** — listing info, available items each with a stepper, "Request This Food" button
4. **Create Request** — "Choose what you need", quantity steppers per item, message box, Submit Request
5. **My Requests** — status tabs and a list of your requests

---

## Part 3 — What already exists: reuse it, do not rebuild it

Copying any of this instead of importing it is the fastest way to create a bug that only shows up at the demo.

### Server — shared, already working

| File                             | What it gives you                                                       | How to use it                                                                                |
| -------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/middleware/auth.ts`         | `authenticate` — verifies the Bearer token, puts the user on `req.user` | `router.use(authenticate)` at the top of your routes file                                    |
| `src/middleware/requireRole.ts`  | `requireRole('recipient')` — the real access control                    | `router.post('/', requireRole('recipient'), ...)`                                            |
| `src/middleware/validate.ts`     | `validateBody(zodSchema)` — validates and replaces `req.body`           | `router.post('/', validateBody(createRequestSchema), ...)`                                   |
| `src/middleware/errorHandler.ts` | Turns thrown errors into responses                                      | Already mounted. Just throw `ApiError`                                                       |
| `src/utils/apiError.ts`          | `ApiError.badRequest()` `.notFound()` `.forbidden()` `.conflict()`      | `throw ApiError.notFound('That request does not exist')`                                     |
| `src/utils/apiResponse.ts`       | `sendSuccess(res, data, status)`                                        | Use for every response                                                                       |
| `src/utils/asyncHandler.ts`      | Wraps async handlers so rejections reach the error handler              | **Every** async route handler must be wrapped, or the request hangs instead of returning 500 |
| `src/config/prisma.ts`           | The single Prisma client                                                | `import { prisma } from '../config/prisma'` — never `new PrismaClient()`                     |
| `src/types/auth.ts`              | `publicUserSelect`, the only user shape that leaves the server          | Use it whenever a response includes a user. It excludes `passwordHash`                       |

### Server — the two rules you must call, not rewrite

From `src/services/urgency.service.ts`:

```ts
import { quantityAfterAcceptance } from '../services/urgency.service';
```

**`quantityAfterAcceptance(remaining, requested)`** — the single definition of the stock rule. It validates that the requested amount is positive and not more than what is left, and returns the new remaining value. **Call this in your accept handler. Do not subtract inline.**

From `src/services/donation.service.ts`:

```ts
import { deriveListingStatus, getListingById } from '../services/donation.service';
```

**`deriveListingStatus(items, currentStatus)`** — decides `open` vs `partially_claimed` vs `fully_claimed` from what is left. **Call it after you decrement stock on acceptance**, then update the listing. If you write your own version, your idea of "partially claimed" and the donor screen's will drift apart.

### Mobile — shared components, already styled

```ts
import {
  Button,
  Card,
  Input,
  StatusPill,
  EmptyState,
  ScreenContainer,
} from '../../components';
```

| Component         | Use it for                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `ScreenContainer` | Wraps every screen. Handles safe area, background and the 16px padding. Props: `scroll`, `avoidKeyboard` |
| `Button`          | `variant="primary" \| "secondary" \| "danger"`, plus `loading` and `disabled`                            |
| `Input`           | Label, value, `error` prop for field errors, `multiline`                                                 |
| `Card`            | A bordered surface. Pass `onPress` to make the whole card tappable                                       |
| `StatusPill`      | Small coloured status label. `tone="critical" \| "urgent" \| "safe" \| "neutral"`                        |
| `EmptyState`      | Shown when a list is empty. Takes `title`, `message`, `actionLabel`, `onAction`                          |

### Mobile — shared helpers

```ts
import { colours, fontSize, fontWeight, spacing, layout } from '../../constants/theme';
```

**Never write a hex code or a pixel value inline.** All design tokens come from `theme.ts`. Five people inventing their own greens is exactly what this prevents.

```ts
import {
  formatDateTime,
  formatTimeUntil,
  formatStatus,
  parseLocalDateTime,
  DATE_HINT,
  DATE_TIME_HINT,
} from '../../utils/datetime';
```

- `formatDateTime(iso)` → `"20 Aug, 6:30 pm"`
- `formatTimeUntil(iso)` → `"in 3 hours"` / `"expired"` — this is what makes urgency readable
- `formatStatus('partially_claimed')` → `"partially claimed"`
- `parseLocalDateTime('2026-08-20 18:30')` → a `Date`, or `null` if invalid

> **There is no date picker in this project.** Adding one means a new dependency, and the stack is fixed. Use `DATE_HINT` / `DATE_TIME_HINT` as placeholders and `parseLocalDateTime` to validate.

```ts
import { api, getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
```

- `api` — the one axios instance. It attaches your Bearer token and logs you out on 401. **Do not create another axios instance.**
- `getErrorMessage(err)` — turns any failure into a message worth showing a user, including a clear one when the phone cannot reach the laptop
- `useAuth()` — gives you `user`, `login`, `register`, `logout`, `isSubmitting`

### Mobile — the browse API is already written for you

`mobile/src/api/donations.api.ts` already has:

```ts
import { browseListings, fetchListing } from '../../api/donations.api';
```

Types are in `mobile/src/types/donation.ts`. Import them, do not redefine them.

### Do not touch these

- `docs/` — assignment artefacts, graded as written
- `mobile/src/screens/donor/`, `coordinator/`, `driver/`, `admin/` — other people's modules
- `server/prisma/schema.prisma` — the schema is agreed. **The Request tables already exist**, so you do not need a migration. If you genuinely think you need a schema change, raise it with the whole team first
- `server/src/services/urgency.service.ts` and `donation.service.ts` — import from them, do not edit them
- `mobile/src/components/`, `constants/theme.ts`, `api/client.ts`, `context/AuthContext.tsx` — shared, discuss before changing

---

## Part 4 — Server files to create

Three new files, plus one line in an existing one.

### 4.1 `server/src/services/request.service.ts`

All the business logic. Controllers stay thin.

**Must contain:**

- **`const requestInclude`** — one definition of what a request response includes: its `items` (each with the `item` it points at, and that item's `listing`), and the `recipient` selected through `publicUserSelect`. Define it once so every endpoint returns the same shape.

- **`createRequest(recipientId, input)`** — in a **single transaction**:
  - load the listing with its items; 404 if missing
  - reject if `listing.status` is not `open` or `partially_claimed`
  - reject if any requested `itemId` does not belong to that listing
  - reject if any requested quantity exceeds that item's `quantityRemaining`
  - reject if any requested item has already expired
  - reject duplicate `itemId`s before the database has to
  - create the `DonationRequest` with `status: 'pending'` plus its `DonationRequestItem` rows
  - **do not touch `quantityRemaining`** — see Part 6

- **`listMyRequests(recipientId)`** — the recipient's own requests, newest first

- **`listIncomingRequests(donorId)`** — requests on listings owned by this donor. Filter through the listing's `donorId`, never by anything the client sends

- **`getRequestById(requestId, actor)`** — loads a request and checks the caller is either the recipient who made it or the donor who owns the listing. **Throw 404, not 403,** for anyone else: a 403 confirms the row exists

- **`acceptRequest(requestId, donorId)`** — in a **single transaction**:
  - load and check the donor owns the listing
  - reject if `status` is not `pending`
  - for each requested item, call `quantityAfterAcceptance(...)` and update `quantityRemaining`
  - set `status: 'accepted'` and `respondedAt: new Date()`
  - recompute the listing status with `deriveListingStatus(...)` and update the listing

- **`rejectRequest(requestId, donorId, reason?)`** — ownership check, must be `pending`, sets `status: 'rejected'`, `rejectionReason`, `respondedAt`

- **`cancelRequest(requestId, recipientId)`** — the recipient may cancel while still `pending`. Sets `status: 'cancelled'`. Nothing is ever deleted

**Put a comment above `acceptRequest` explaining why it is a transaction:** several item rows and the listing status all change together, and a half-applied acceptance would leave stock wrong in a way nobody could see.

### 4.2 `server/src/controllers/request.controller.ts`

**Must contain:**

- **`createRequestSchema`** — a zod schema:
  - `listingId`: positive integer
  - `message`: optional trimmed string, max 500
  - `items`: array, min 1, max 20, each `{ itemId: positive int, quantityRequested: positive number }`
  - a `superRefine` that rejects duplicate `itemId`s with a readable message
- **`rejectRequestSchema`** — `{ reason: optional trimmed string, max 500 }`
- A **`parseRequestId(req)`** helper that rejects a non-numeric `:id` with 400 rather than letting it reach Prisma
- Six thin handlers: `createRequest`, `listMyRequests`, `listIncomingRequests`, `getRequest`, `acceptRequest`, `rejectRequest` (plus `cancelRequest` if you add it)
- Every handler validates, calls the service, and returns `sendSuccess(res, { ... })`. `201` for create, `200` for everything else

### 4.3 `server/src/routes/requests.routes.ts`

**Must contain:**

```ts
const router = Router();
router.use(authenticate); // every route needs a token
```

Then, and **order matters**:

```
GET    /mine        requireRole('recipient')
GET    /incoming    requireRole('donor')
POST   /            requireRole('recipient')  + validateBody(createRequestSchema)
GET    /:id         (no role guard — the service checks ownership)
PUT    /:id/accept  requireRole('donor')
PUT    /:id/reject  requireRole('donor')      + validateBody(rejectRequestSchema)
```

> **`/mine` and `/incoming` must be declared before `/:id`.** Otherwise Express matches `mine` as an id and your request 400s on a non-numeric id. This caught us in the donation module.

Wrap **every** async handler in `asyncHandler(...)`.

### 4.4 One line in `server/src/routes/index.ts`

```ts
import requestRoutes from './requests.routes';
// ...
router.use('/requests', requestRoutes);
```

There is already a commented placeholder for it. Replace that line.

---

## Part 5 — Mobile files to create

### 5.1 `mobile/src/types/request.ts`

Types mirroring the API. **Important:** Prisma serialises `Decimal` as a **string** over JSON, so `quantityRequested` is a `string`, not a number. Parse with `Number()` where you use it.

Must contain: `RequestStatus`, `DonationRequestItem`, `DonationRequest`, `CreateRequestPayload`.

Reuse `DonationListing` and `DonationItem` from `types/donation.ts` — do not redefine them.

### 5.2 `mobile/src/api/requests.api.ts`

Thin wrappers over `api`, one per endpoint, each returning the unwrapped `data.data`:

`createRequest`, `fetchMyRequests`, `fetchIncomingRequests`, `fetchRequest`, `acceptRequest`, `rejectRequest`.

Follow the exact pattern in `mobile/src/api/donations.api.ts`.

### 5.3 `mobile/src/screens/recipient/BrowseListingsScreen.tsx`

This is US-R01, the Sprint 1 deliverable. **The API already exists** — just call `browseListings()`.

Must have:

- A `FlatList` of listing cards, pull-to-refresh, a loading spinner on first load
- A search `Input` filtering by title, description or food name (pass `search` to `browseListings`) — **debounce it** so you are not firing a request per keystroke
- Filter chips for `category` (packaged / prepared) and an `urgentOnly` toggle
- Each card showing: title, donor's organisation name, item count, the **soonest expiry** via `formatTimeUntil`, and a `StatusPill` coloured by the **most urgent** item's `urgencyLevel`
- `EmptyState` when nothing matches
- Tapping a card navigates to `ListingDetail`

> **Do not sort in the app.** The API already returns urgent first, then soonest expiry. Re-sorting client-side will fight the server's ordering and break pagination.

> **Use `item.urgencyLevel` from the response.** Do not recompute urgency on the phone. The 6-hour and 48-hour thresholds live in `urgency.service.ts` on the server and are sent to you precisely so they cannot drift.

### 5.4 `mobile/src/screens/recipient/ListingDetailScreen.tsx`

- Full listing info: title, description, donor, pickup address, pickup window
- Every item with: name, category, storage, `quantityRemaining` of `quantity` `unit`, urgency pill, and `Expires {formatTimeUntil(item.effectiveExpiry)}`
- A "Request This Food" button → navigates to `CreateRequest` with the `listingId`
- Hide or disable the request button if the listing is not `open` / `partially_claimed`

### 5.5 `mobile/src/screens/recipient/CreateRequestScreen.tsx`

- Loads the listing, lists each item with a quantity stepper (`-` / value / `+`)
- **Cap the stepper at `quantityRemaining`.** Do not let the user enter a number the server will reject
- Only items with a quantity above zero are sent
- An optional message `Input` (multiline)
- Submit → `createRequest` → success alert → navigate to `MyRequests`
- Show field errors from the API using `getErrorMessage`
- Disable Submit while nothing is selected, and show `loading` while submitting

### 5.6 `mobile/src/screens/recipient/MyRequestsScreen.tsx`

- List of your requests, newest first, reload on focus with `useFocusEffect`
- Status filter chips: all / pending / accepted / rejected / cancelled
- Each card: listing title, the items and quantities you asked for, a `StatusPill` for the status, and the `rejectionReason` when rejected
- A Cancel button on `pending` requests, behind a confirmation
- `EmptyState` when you have none

### 5.7 `mobile/src/navigation/types.ts` — edit only your own list

```ts
export type RecipientStackParamList = {
  BrowseListings: undefined;
  ListingDetail: { listingId: number };
  CreateRequest: { listingId: number };
  MyRequests: undefined;
};
```

**Only touch `RecipientStackParamList`.** Leave every other list alone — that separation is what stops five people conflicting in one file.

### 5.8 `mobile/src/navigation/RootNavigator.tsx` — edit only `RecipientNavigator`

Register your four screens inside the existing `RecipientNavigator` function and update the import at the top. Do not touch the other role navigators.

### 5.9 Delete the stub

Remove `mobile/src/screens/recipient/RecipientHomeScreen.tsx` once `BrowseListingsScreen` is registered as the first screen.

---

## Part 6 — Domain rules you must get right

These are agreed team decisions. Getting one wrong produces a bug that only shows up in the demo.

### 6.1 `quantityRemaining` decrements on ACCEPTANCE, never on request creation

A pending request must **not** reserve stock. If it did, one recipient sitting on an unanswered request would block everyone else from asking for the same food.

- `POST /requests` → creates rows, **changes no quantities**
- `PUT /requests/:id/accept` → **this** is where `quantityRemaining` drops

Use `quantityAfterAcceptance()` from `urgency.service.ts`. The database also has a CHECK constraint (`donation_items_quantity_range_check`) that rejects any write driving stock below zero or above the original — so if you subtract by hand and get it wrong, you get an opaque 400 instead of a readable message.

### 6.2 Validate the requested quantity at request time too

Even though nothing is reserved, do not let a recipient request 50 kg when 10 kg remain. Check at creation for a good error message, **and check again at acceptance** because time has passed and someone else may have been accepted in between.

### 6.3 One item cannot appear twice in one request

The database enforces `UNIQUE (request_id, item_id)`. Catch it in zod first so the user gets a readable message instead of a 409.

### 6.4 Requested items must belong to the listing

A recipient sends `listingId` and a set of `itemId`s. **Verify every `itemId` belongs to that listing.** Without this check, someone could request an item from a completely different donor's listing by passing its id.

### 6.5 Ownership errors are 404, not 403

If a donor tries to accept a request on someone else's listing, or a recipient reads someone else's request, return **404**. A 403 confirms the row exists, which leaks information.

### 6.6 Status transitions

```
pending ──> accepted     donor accepts
pending ──> rejected     donor rejects, optional reason
pending ──> cancelled    recipient cancels
```

`accepted`, `rejected` and `cancelled` are **terminal**. Reject any transition out of them with a clear message. Never delete a request row — the history is what the admin dashboard and the report are built on.

### 6.7 Do not offer expired food

`GET /donations` already filters out items whose expiry has passed. But time passes between browsing and submitting, so **re-check expiry when creating a request**. Offering a charity expired food is the worst failure this system can have.

### 6.8 Never return `passwordHash`

Whenever a response includes a user, select through `publicUserSelect` from `server/src/types/auth.ts`.

---

## Part 7 — How to verify your work

Do all four levels. Level 4 finds the real problems.

### Level 1 — it compiles

```bash
npm run typecheck
```

```bash
npm run lint
```

Both must pass before you commit. `lint` is Prettier plus TypeScript — there is no ESLint in this project.

### Level 2 — the app still bundles

```bash
cd mobile && npx expo export --platform android --output-dir ../tmp-export
```

This proves every import resolves under Metro. Delete `tmp-export` afterwards. Note it **compiles without executing**, so it will not catch a runtime crash.

### Level 3 — test your endpoints against the real database

Write a **temporary** script, run it, then delete it. Do not commit it — there is no test framework in this project, by team decision.

Create `server/request.e2e.temp.ts`:

```ts
import { app } from './src/app';
import { prisma } from './src/config/prisma';

const BASE = 'http://127.0.0.1:5195/api';
let pass = 0,
  fail = 0;
const check = (label: string, ok: boolean, detail = '') => {
  ok ? pass++ : fail++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : '\n        ' + detail}`,
  );
};

async function req(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as any };
}
async function login(email: string) {
  const r = await req('POST', '/auth/login', undefined, { email, password: 'Test@1234' });
  return r.body.data.token as string;
}

async function main() {
  const recipient = await login('recipient@eatme.lk');
  const otherRecipient = await login('elders@eatme.lk');

  // pick a listing with stock, and log in as ITS donor
  const browse = await req('GET', '/donations?limit=10', recipient);
  const listing = browse.body.data.listings[0];
  const item = listing.items[0];
  const donorEmail = (
    await prisma.user.findUniqueOrThrow({ where: { userId: listing.donorId } })
  ).email;
  const donor = await login(donorEmail);

  // --- create ---
  const created = await req('POST', '/requests', recipient, {
    listingId: listing.listingId,
    message: 'E2E test request',
    items: [{ itemId: item.itemId, quantityRequested: 1 }],
  });
  check(
    'recipient creates a request -> 201',
    created.status === 201,
    JSON.stringify(created.body).slice(0, 200),
  );
  const requestId = created.body.data?.request?.requestId;
  check('new request is pending', created.body.data?.request?.status === 'pending');

  // THE most important check in this module
  const afterCreate = await prisma.donationItem.findUniqueOrThrow({
    where: { itemId: item.itemId },
  });
  check(
    'creating a request does NOT change quantityRemaining',
    String(afterCreate.quantityRemaining) === String(item.quantityRemaining),
    `was ${item.quantityRemaining}, now ${afterCreate.quantityRemaining}`,
  );

  // --- role guards ---
  check(
    'donor cannot create a request (403)',
    (
      await req('POST', '/requests', donor, {
        listingId: listing.listingId,
        items: [{ itemId: item.itemId, quantityRequested: 1 }],
      })
    ).status === 403,
  );
  check(
    'recipient cannot read /incoming (403)',
    (await req('GET', '/requests/incoming', recipient)).status === 403,
  );
  check(
    'donor cannot read /mine (403)',
    (await req('GET', '/requests/mine', donor)).status === 403,
  );
  check('no token -> 401', (await req('GET', '/requests/mine')).status === 401);

  // --- validation ---
  check(
    'requesting more than remaining -> 400',
    (
      await req('POST', '/requests', recipient, {
        listingId: listing.listingId,
        items: [{ itemId: item.itemId, quantityRequested: 999999 }],
      })
    ).status === 400,
  );
  check(
    'duplicate item in one request -> 400',
    (
      await req('POST', '/requests', recipient, {
        listingId: listing.listingId,
        items: [
          { itemId: item.itemId, quantityRequested: 1 },
          { itemId: item.itemId, quantityRequested: 1 },
        ],
      })
    ).status === 400,
  );
  check(
    'zero items -> 400',
    (
      await req('POST', '/requests', recipient, {
        listingId: listing.listingId,
        items: [],
      })
    ).status === 400,
  );
  check(
    'item from a different listing -> 400',
    (
      await req('POST', '/requests', recipient, {
        listingId: listing.listingId,
        items: [{ itemId: 999999, quantityRequested: 1 }],
      })
    ).status === 400,
  );

  // --- visibility ---
  check(
    'appears in my requests',
    (await req('GET', '/requests/mine', recipient)).body.data?.requests?.some(
      (r: any) => r.requestId === requestId,
    ),
  );
  check(
    'another recipient does NOT see it',
    !(await req('GET', '/requests/mine', otherRecipient)).body.data?.requests?.some(
      (r: any) => r.requestId === requestId,
    ),
  );
  check(
    'donor sees it in /incoming',
    (await req('GET', '/requests/incoming', donor)).body.data?.requests?.some(
      (r: any) => r.requestId === requestId,
    ),
  );
  check(
    'unrelated recipient reading it by id -> 404',
    (await req('GET', `/requests/${requestId}`, otherRecipient)).status === 404,
  );

  // --- accept: the stock rule ---
  const accepted = await req('PUT', `/requests/${requestId}/accept`, donor);
  check(
    'donor accepts -> 200 and status accepted',
    accepted.status === 200 && accepted.body.data?.request?.status === 'accepted',
  );
  const afterAccept = await prisma.donationItem.findUniqueOrThrow({
    where: { itemId: item.itemId },
  });
  check(
    'accepting DOES decrement quantityRemaining',
    Number(afterAccept.quantityRemaining) === Number(item.quantityRemaining) - 1,
    `expected ${Number(item.quantityRemaining) - 1}, got ${afterAccept.quantityRemaining}`,
  );
  const listingAfter = await prisma.donationListing.findUniqueOrThrow({
    where: { listingId: listing.listingId },
  });
  check(
    'listing status recomputed after acceptance',
    ['partially_claimed', 'fully_claimed'].includes(listingAfter.status),
    `status is ${listingAfter.status}`,
  );
  check(
    'accepting twice -> 400',
    (await req('PUT', `/requests/${requestId}/accept`, donor)).status === 400,
  );
  check(
    'rejecting an accepted request -> 400',
    (await req('PUT', `/requests/${requestId}/reject`, donor, { reason: 'x' })).status ===
      400,
  );

  await prisma.donationRequestItem.deleteMany({
    where: { request: { message: 'E2E test request' } },
  });
  await prisma.donationRequest.deleteMany({ where: { message: 'E2E test request' } });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

const server = app.listen(5195, '127.0.0.1', () => {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
});
server.unref();
```

Run it:

```bash
cd server && npx tsx request.e2e.temp.ts
```

Then **delete it** and re-seed so your data is clean:

```bash
rm request.e2e.temp.ts && npm run db:seed
```

### Level 4 — on a real phone

This level finds the bugs the other three miss. Everything at levels 1 to 3 runs over `127.0.0.1`, which never crosses the network boundary a phone has to cross.

1. Log in as `recipient@eatme.lk`
2. Browse — confirm urgent items appear **first** and the colours match the expiry text
3. Search for `bread` — confirm it matches on the food name, not just the title
4. Toggle the urgent filter
5. Open a listing, request 2 of something, submit
6. Check My Requests shows it as pending
7. Log out, log in as the **donor who owns that listing**, accept it
8. Log back in as the recipient — status should be accepted
9. Open the listing again — the remaining quantity must have dropped by exactly what was accepted
10. **Take screenshots.** They go in your PR and become our sprint review evidence

---

## Part 8 — One cross-module thing to settle with Vidura first

There is a real overlap in the plan, better sorted now than after either of you has written code.

- `docs/05-api-plan.md` puts `PUT /requests/:id/accept` and `PUT /requests/:id/reject` under **Requests**, which is your route file
- but `docs/02-product-backlog.md` lists **US-D02, "As a donor, I want to accept or reject incoming requests"**, as **Vidura's** Sprint 2 story
- and the wireframes put the Incoming Requests screen and the Reject Request modal in the **donor** section, which is Vidura's `screens/donor/` folder

So the endpoints are yours and the screens are his. **Message Vidura and agree one of these before Sprint 2:**

1. **You build both endpoints** (they live in your route file) and Vidura builds the donor screens that call them. Cleanest split, matches the API plan and the folder ownership.
2. Vidura builds the accept/reject endpoints inside your routes file. Works, but two people editing one file is exactly what the folder split exists to avoid.

**Option 1 is the sensible one.** Either way, write the decision down so the viva answer is consistent.

Also still open and relevant to you, from `docs/03-database-design.md` section 7:

- **`is_urgent` goes stale.** It is correct when written and nothing recomputes it. `GET /donations` filters out already-expired items so browse is safe, but the flag can be out of date on an item fetched directly by id. No owner yet
- **Delivery assignment is Sprint 2 or Sprint 3** — three documents disagree. Affects Kaushal and Lakkhana more than you, but it changes what Sprint 2 contains

---

## Part 9 — Definition of Done checklist

A task is Done only when **all** of these are true. This is from `CONTRIBUTING.md` section 4.

- [ ] Code implemented and runs without errors
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Committed with properly formatted Conventional Commit messages, in logical chunks
- [ ] Tested manually **on a physical device** against the user story's acceptance criteria
- [ ] No `.env` file, credentials or secrets committed
- [ ] Nothing outside your own module changed, unless agreed with the team
- [ ] Pull request opened into `dev`, with screenshots
- [ ] Reviewed and approved by another member
- [ ] Merged into `dev`
- [ ] ClickUp task moved to Done
- [ ] You can demonstrate it live and explain your own code

That last one matters: **this is assessed by viva.** Prefer clear, conventional code over clever code, and put a comment above anything non-obvious explaining _why_, not _what_.

---

## Appendix A — The API you consume

### `GET /api/donations` — browse, already built and tested

**Role:** recipient or admin. A donor gets 403.

**Query parameters** (all optional):

| Param        | Type                     | Notes                                                                      |
| ------------ | ------------------------ | -------------------------------------------------------------------------- |
| `search`     | string                   | Matches listing title, description **or item food name**, case-insensitive |
| `category`   | `packaged` \| `prepared` |                                                                            |
| `urgentOnly` | `"true"`                 | Send the string `"true"`                                                   |
| `page`       | number                   | Defaults to 1                                                              |
| `limit`      | number                   | Defaults to 20, max 50                                                     |

**Already guaranteed by the server — do not redo these in the app:**

- Only `open` and `partially_claimed` listings
- Only items with `quantityRemaining > 0`
- **Already-expired items are excluded**
- Ordered **urgent first, then soonest expiry**

**Response:**

```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "listingId": 1,
        "donorId": 6,
        "title": "Wedding function surplus, rice and curry",
        "description": "Untouched buffet food from a 300 guest function.",
        "pickupAddress": "2 Galle Face Centre Road, Colombo 03",
        "pickupWindowStart": "2026-08-17T06:00:00.000Z",
        "pickupWindowEnd": "2026-08-17T10:00:00.000Z",
        "status": "open",
        "createdAt": "2026-08-17T04:40:26.058Z",
        "updatedAt": "2026-08-17T04:40:26.058Z",
        "donor": {
          "userId": 6,
          "name": "Chaminda Bandara",
          "organisationName": "Galle Face Grand Hotel",
          "phone": "0776789012"
        },
        "items": [
          {
            "itemId": 1,
            "listingId": 1,
            "foodName": "Chicken fried rice",
            "category": "prepared",
            "quantity": "60.00",
            "quantityRemaining": "60.00",
            "unit": "servings",
            "storageType": "chilled",
            "expiryDate": null,
            "preparedAt": "2026-08-17T02:40:26.058Z",
            "safeWindowHours": 24,
            "computedExpiry": "2026-08-18T02:40:26.058Z",
            "isUrgent": true,
            "urgencyLevel": "critical",
            "effectiveExpiry": "2026-08-18T02:40:26.058Z",
            "createdAt": "2026-08-17T04:40:26.058Z",
            "updatedAt": "2026-08-17T04:40:26.058Z"
          }
        ]
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 20
  }
}
```

**Notes:**

- `quantity` and `quantityRemaining` are **strings** (Prisma Decimal over JSON). Use `Number()`
- `urgencyLevel` is `"critical" | "urgent" | "safe"`, computed server-side. **Use it directly for pill colour**
- `effectiveExpiry` is whichever of `computedExpiry` / `expiryDate` applies. Feed it to `formatTimeUntil()`
- Packaged items have `expiryDate` and null prepared fields; prepared items are the mirror image

### `GET /api/donations/:id` — listing detail

Any signed-in role. Returns `{ "success": true, "data": { "listing": { ...same shape... } } }`.

Unlike browse, this returns a listing whatever its status, including expired and cancelled — so check `status` before showing a request button.

### Response envelope, everywhere

Success:

```json
{ "success": true, "data": {} }
```

Error:

```json
{
  "success": false,
  "message": "Human readable message",
  "details": { "fieldName": ["what is wrong"] }
}
```

`details` appears on validation failures. `getErrorMessage()` already pulls the first field error out for you.

**Status codes:** 200 OK · 201 Created · 400 validation · 401 not authenticated · 403 wrong role · 404 not found · 409 conflict · 500 server error

---

## Appendix B — Seeded test accounts

Every account uses the password **`Test@1234`**.

| Email                  | Role        | Notes                                                                              |
| ---------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `recipient@eatme.lk`   | recipient   | Kumari Silva, Sahana Children's Home. **Your main test account**                   |
| `elders@eatme.lk`      | recipient   | A second recipient — use this to prove one recipient cannot see another's requests |
| `orphanage@eatme.lk`   | recipient   | A third recipient                                                                  |
| `donor@eatme.lk`       | donor       | Nimal Perera, owns "Pantry stock clearance" (all safe items)                       |
| `hotel@eatme.lk`       | donor       | Owns "Wedding function surplus" (prepared, critical + urgent)                      |
| `bakery@eatme.lk`      | donor       | Owns "End of day bread and buns" (packaged, urgent, already partially claimed)     |
| `coordinator@eatme.lk` | coordinator |                                                                                    |
| `driver@eatme.lk`      | driver      |                                                                                    |
| `admin@eatme.lk`       | admin       | Can browse and moderate                                                            |

The seed also creates 3 listings, 7 items spread across the urgency range (1 critical, 3 urgent, 3 safe), and 2 requests — one pending, one already accepted.

**To accept a request you must log in as the donor who owns that listing.** Check `listing.donor` in the response to know which one.

---

## Quick reference

```bash
# every session
git checkout dev && git pull origin dev
git checkout feature/donation-request && git merge dev

# run it
wsl                              # terminal 1, leave open
npm run db:up                    # if the database is not running
npm run dev:server               # terminal 2
npm run dev:mobile               # terminal 3

# before every commit
npm run typecheck && npm run lint

# when data gets confusing
npm run db:seed

# after changing mobile/.env
npm --prefix mobile run start:clear
```

**Ask before installing any dependency.** The stack is fixed and the timeline is short. If you think you need one, message the team first — there is usually an existing helper that does the job.

Good luck. Message Vidura about Part 8 before you start Sprint 2 work.
