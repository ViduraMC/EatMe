# EatMe

A community food sharing and surplus redistribution platform. EatMe connects food donors such as households, hotels and bakeries with recipient organisations such as charities, orphanages and elders' homes, and coordinates the delivery between them.

Built as a cross platform mobile application for the SE3080 Software Project Management module, Year 3 Semester 2, 2026.

---

## Table of Contents

- [Problem](#problem)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Branching Strategy](#branching-strategy)
- [Commit Convention](#commit-convention)
- [Team](#team)
- [Documentation](#documentation)

---

## Problem

Surplus food goes to waste while organisations that need it cannot find it in time. Donors have no easy way to advertise what they have, recipients have no shared view of what is available nearby, and the collection and delivery is arranged informally with no record of what was agreed. EatMe solves all three: it makes surplus visible, ranks it by how soon it expires, and manages the chain from listing through to a confirmed handover.

---

## Tech Stack

| Layer              | Technology             | Why                                                                                                                                                                              |
| ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language           | TypeScript, both sides | One language across the app and the API, with the compiler catching a whole class of mistakes before they reach a phone                                                          |
| Mobile app         | React Native with Expo | Cross platform from one codebase, testable on a physical device without a local Android or iOS toolchain                                                                         |
| Navigation         | React Navigation       | Standard routing for React Native, supports the role based navigation stacks this app needs                                                                                      |
| Backend            | Node.js with Express   | Same language as the mobile app, fast to build a REST API                                                                                                                        |
| Database           | PostgreSQL             | Relational data with foreign keys and status enums across seven core entities, plus CHECK constraints to enforce the packaged versus prepared expiry rule in the database itself |
| ORM                | Prisma                 | The schema file doubles as the database specification, and migrations give a versioned record of schema changes                                                                  |
| Authentication     | JSON Web Tokens        | Stateless auth suited to a mobile client                                                                                                                                         |
| Design             | Figma                  | Wireframes and screen designs                                                                                                                                                    |
| Project management | ClickUp                | Backlog, sprints, ceremony records                                                                                                                                               |

---

## Project Structure

This is a single repository containing both the mobile application and the API.

```
EatMe/
├── .github/
│   └── pull_request_template.md
│
├── docs/                            Project documentation and assignment artefacts
│   ├── 01-project-charter.md
│   ├── 02-product-backlog.md
│   ├── 03-database-design.md
│   ├── 04-architecture.md
│   ├── 05-api-plan.md
│   └── sprints/
│       ├── sprint-0/                Planning notes, review and retrospective records
│       ├── sprint-1/
│       └── sprint-2/
│
├── mobile/                          React Native (Expo) application
│   ├── assets/                      Images, icons, fonts
│   ├── src/
│   │   ├── api/                     API client and per module request functions
│   │   ├── components/              Shared UI components used across roles
│   │   ├── constants/               Colours, spacing, enums, config
│   │   ├── context/                 Auth context and global state
│   │   ├── hooks/                   Custom hooks
│   │   ├── navigation/              Navigators, including the role based root navigator
│   │   ├── screens/
│   │   │   ├── auth/                Login, register
│   │   │   ├── donor/               Donation listing module
│   │   │   ├── recipient/           Browse and request module
│   │   │   ├── coordinator/         Delivery coordination module
│   │   │   ├── driver/              Driver delivery module
│   │   │   └── admin/               Administration module
│   │   ├── types/                   Shared API response and domain types
│   │   └── utils/                   Token storage, formatting, validation helpers
│   ├── App.tsx
│   ├── app.json
│   ├── .env.example
│   └── package.json
│
├── server/                          Node.js and Express REST API
│   ├── prisma/
│   │   ├── schema.prisma            Database schema, the single source of truth
│   │   ├── migrations/
│   │   └── seed.ts                  Sample users, listings and requests
│   ├── src/
│   │   ├── config/                  Environment validation and the Prisma client
│   │   ├── controllers/             One controller per module
│   │   ├── middleware/              Auth, role guards, error handling, validation
│   │   ├── routes/                  One route file per module
│   │   ├── services/                Business logic, including expiry and urgency rules
│   │   ├── types/                   Shared types, including the public user shape
│   │   ├── utils/                   JWT helpers, response envelope, async wrapper
│   │   ├── app.ts                   Express app, middleware and route mounting
│   │   └── server.ts                Startup, database check and LAN address
│   ├── .env.example
│   └── package.json
│
├── .husky/                          Commit message and pre-commit hooks
├── .gitignore
├── commitlint.config.js
├── package.json                     Root scripts and shared tooling
└── README.md
```

**Why the screens and routes are split by role.** Each of the five modules is owned by one team member. Splitting `screens/` and `routes/` by role means each person works almost entirely inside their own folder, which keeps merge conflicts rare even when five people are committing to the same repository in the same week. Anything genuinely shared goes in `components/`, `utils/` or `middleware/`, and changes there are discussed before being made.

---

## Getting Started

### Prerequisites

- Node.js version 18 or later, and npm
- Docker, to run PostgreSQL. On Windows use **Docker Engine inside WSL2**, not Docker Desktop. A native PostgreSQL 14+ install works too if you prefer`
- The Expo Go app installed on your phone, from the Play Store or App Store
- Your phone and your laptop on the **same Wi-Fi network**

### 1. Clone and install

```bash
git clone https://github.com/ViduraMC/EatMe.git
```

```bash
cd EatMe && npm install
```

That root `npm install` is not optional. It installs the shared tooling and activates the git hooks that check your commit messages. **Skip it and your commits silently bypass the format the module grades us on.**

Then install both sides:

```bash
npm run install:all
```

### 2. Start the database

From the repository root:

```bash
npm run db:up
```

That starts PostgreSQL 16 from `docker-compose.yml` with the database, user and password already created. Data lives in a named Docker volume, so it survives restarts.

**If port 5432 is already used by another project**, pick a different host port instead of stopping theirs, and use the same port in `server/.env`:

```bash
EATME_DB_PORT=5433 npm run db:up
```

Prefer a native PostgreSQL install? Create the database by hand instead and adjust `DATABASE_URL`:

```sql
CREATE DATABASE eatme;
```

### 3. Set up the backend

```bash
cd server && cp .env.example .env
```

Open `server/.env` and set `DATABASE_URL` to match your Postgres user and password, and put a long random string in `JWT_SECRET`. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Create the tables and fill them with sample data:

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

The seed prints a table of logins. Every seeded account uses the password `Test@1234`:

| Email                  | Role        |
| ---------------------- | ----------- |
| `donor@eatme.lk`       | donor       |
| `recipient@eatme.lk`   | recipient   |
| `coordinator@eatme.lk` | coordinator |
| `driver@eatme.lk`      | driver      |
| `admin@eatme.lk`       | admin       |

There are also extra donor and recipient accounts, three listings and seven food items spread across the urgency range, so the browse screen has something realistic in it from the first run.

Start the API:

```bash
npm run dev
```

It listens on port 5000 and prints your LAN address on startup, along with the exact `EXPO_PUBLIC_API_URL` line to paste into the mobile app. Check it works by opening `http://localhost:5000/api/health` in a browser.

### 4. Set up the mobile app

In a second terminal:

```bash
cd mobile && cp .env.example .env
```

Open `mobile/.env` and set `EXPO_PUBLIC_API_URL` to the line the API printed. It must be your laptop's LAN IP, **never `localhost`**, because on a phone `localhost` means the phone itself:

```
EXPO_PUBLIC_API_URL=http://192.168.1.5:5000/api
```

Then start Expo and scan the QR code with Expo Go:

```bash
npm start
```

Log in with any account from the seed table above. Each role lands on its own screen.

### Useful scripts

Run these from the repository root.

| Script               | What it does                         |
| -------------------- | ------------------------------------ |
| `npm run db:up`      | Start PostgreSQL in Docker           |
| `npm run db:down`    | Stop it, keeping the data            |
| `npm run db:nuke`    | Stop it and delete the data volume   |
| `npm run db:logs`    | Follow the database logs             |
| `npm run dev:server` | Start the API with hot reload        |
| `npm run dev:mobile` | Start Expo                           |
| `npm run db:migrate` | Apply migrations                     |
| `npm run db:seed`    | Wipe and reseed sample data          |
| `npm run db:studio`  | Browse the database in Prisma Studio |
| `npm run typecheck`  | Typecheck both sides                 |
| `npm run lint`       | Format check and typecheck           |
| `npm run format`     | Rewrite files with Prettier          |

### Troubleshooting

- **The app cannot reach the API.** Your phone and laptop must be on the same Wi-Fi network, and `EXPO_PUBLIC_API_URL` must use the laptop's LAN IP, not `localhost`. Find it with `ipconfig` on Windows or `ifconfig` on macOS and Linux, or read it from the API's startup output. After changing `.env`, restart Expo with `npm run start:clear`; the value is baked into the bundle at build time.
- **`P1001: Can't reach database server` even though the container is running.** Use `127.0.0.1` in `DATABASE_URL`, not `localhost`. Prisma's query engine tries the IPv6 address `::1` first and a container publishing on `0.0.0.0` does not answer there. This is the single most confusing failure in this setup.
- **Prisma migration fails.** Confirm the container is up with `docker ps`, and that the port in `DATABASE_URL` matches what `db:up` published.
- **`password authentication failed`.** The credentials in `DATABASE_URL` must match `docker-compose.yml`. If you changed one, change both.
- **Port 5432 already in use.** Another project is using it. Start with `EATME_DB_PORT=5433 npm run db:up` and set the same port in `server/.env` rather than stopping the other container.
- **On Windows with WSL2: containers run but Windows cannot reach them.** WSL's default networking does not forward container ports reliably. Add `networkingMode=mirrored` under `[wsl2]` in `C:\Users\<you>\.wslconfig`, then run `wsl --shutdown` and start WSL again. Note that WSL shuts the VM down when nothing is running inside it, which stops your containers; keep a terminal open in the distro, or set `vmIdleTimeout=-1`.
- **`violates check constraint`.** The database rejected the write because a food item broke the packaged versus prepared expiry rule, or a quantity went out of range. Go through `urgency.service.ts` rather than writing the item fields directly.
- **The API exits with "Invalid environment configuration".** A variable in `server/.env` is missing or too short. The message names it.
- **`Cannot find module` after pulling.** Someone added a dependency. Run `npm run install:all` from the root.
- **Your commit was rejected.** The message must match `type(scope): subject`, for example `feat(donation): add listing form`. See CONTRIBUTING.md section 2.

---

## Branching Strategy

```
main                    Stable, demonstrable code only. Never committed to directly.
 └── dev                Integration branch. All feature work merges here first.
      ├── feature/donation-listing
      ├── feature/donation-request
      ├── feature/delivery-coordinator
      ├── feature/driver-delivery
      └── feature/admin-dashboard
```

- `main` receives a merge from `dev` only at the end of each sprint, once the increment has been demonstrated and accepted at the sprint review. Every commit on `main` is therefore a working, reviewable increment.
- `dev` is the shared integration branch. All feature branches are created from it and merged back into it through a pull request.
- Each of the five feature branches is owned by the member who owns that module.

Full conventions, including how to name additional branches and how pull requests are reviewed, are in [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Commit Convention

We follow Conventional Commits:

```
<type>(<scope>): <subject>
```

For example:

```
feat(donation): calculate computed expiry for prepared food items
fix(request): prevent requesting more than the available quantity
docs(charter): add project charter and product vision
```

Details and the full list of types and scopes are in [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Team

| Member                 | Registration Number | Module Owned              | GitHub                                               |
| ---------------------- | ------------------- | ------------------------- | ---------------------------------------------------- |
| S.A.V.M. Chandrasekara | IT23724402          | Donation and Food Listing | [@ViduraMC](https://github.com/ViduraMC)             |
| H.D. Cabraal           | IT23693340          | Food Requests             | [@HarithaCabraal](https://github.com/HarithaCabraal) |
| M.M.Y.K. Bandara       | IT23571198          | Delivery Coordination     | [@kaushalba](https://github.com/kaushalba)           |
| L.D.B. Madigasekara    | IT23616042          | Driver and Delivery       | [@lakkhanaMadi](https://github.com/lakkhanaMadi)     |
| N.A. Jeewaraja         | IT23654358          | Administration            | [@naily247](https://github.com/naily247)             |

Scrum roles rotate each sprint. The rotation is recorded in the [project charter](docs/01-project-charter.md).

---

## Documentation

| Document                                      | Contents                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| [Project Charter](docs/01-project-charter.md) | Product vision, problem statement, objectives, scope, stakeholders, constraints |
| [Product Backlog](docs/02-product-backlog.md) | Epics, user stories, acceptance criteria, estimates                             |
| [Database Design](docs/03-database-design.md) | ER diagram and table specifications                                             |
| [Architecture](docs/04-architecture.md)       | System architecture and module breakdown                                        |
| [API Plan](docs/05-api-plan.md)               | Planned REST endpoints                                                          |
| [Sprint Records](docs/sprints/)               | Sprint planning, stand up, review and retrospective records                     |

---

## Project Management

The board, backlog and sprint records are maintained in ClickUp. Sprint 0 ran from 12 to 14 August 2026, Sprint 1 from 15 to 17 August, and Sprint 2 from 18 to 22 August 2026.
