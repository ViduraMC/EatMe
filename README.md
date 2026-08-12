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

| Layer | Technology | Why |
|---|---|---|
| Mobile app | React Native with Expo | Cross platform from one codebase, testable on a physical device without a local Android or iOS toolchain |
| Navigation | React Navigation | Standard routing for React Native, supports the role based navigation stacks this app needs |
| Backend | Node.js with Express | Same language as the mobile app, fast to build a REST API |
| Database | MySQL | The data model is relational, with foreign keys and status enums across seven core entities |
| ORM | Prisma | The schema file doubles as the database specification, and migrations give a versioned record of schema changes |
| Authentication | JSON Web Tokens | Stateless auth suited to a mobile client |
| Design | Figma | Wireframes and screen designs |
| Project management | ClickUp | Backlog, sprints, ceremony records |

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
│   │   └── utils/                   Formatting, expiry and urgency helpers, validation
│   ├── App.js
│   ├── app.json
│   └── package.json
│
├── server/                          Node.js and Express REST API
│   ├── prisma/
│   │   ├── schema.prisma            Database schema, the single source of truth
│   │   └── migrations/
│   ├── src/
│   │   ├── config/                  Database and environment configuration
│   │   ├── controllers/             One controller per module
│   │   ├── middleware/              Auth, role guards, error handling, validation
│   │   ├── routes/                  One route file per module
│   │   ├── services/                Business logic, including expiry and urgency rules
│   │   ├── utils/
│   │   └── app.js
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

**Why the screens and routes are split by role.** Each of the five modules is owned by one team member. Splitting `screens/` and `routes/` by role means each person works almost entirely inside their own folder, which keeps merge conflicts rare even when five people are committing to the same repository in the same week. Anything genuinely shared goes in `components/`, `utils/` or `middleware/`, and changes there are discussed before being made.

---

## Getting Started

### Prerequisites

- Node.js version 18 or later
- npm
- MySQL version 8 or later running locally
- The Expo Go app installed on your phone, from the Play Store or App Store

### 1. Clone the repository

```bash
git clone https://github.com/ViduraMC/EatMe.git
cd EatMe
```

### 2. Set up the backend

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and fill in your local database credentials and a JWT secret. Then create the database schema:

```bash
npx prisma migrate dev
npm run dev
```

The API runs on `http://localhost:5000` by default.

### 3. Set up the mobile app

Open a second terminal:

```bash
cd mobile
npm install
```

Create a file named `.env` in the `mobile` folder with your machine's local network IP address, not localhost, because the app runs on your phone and cannot reach the laptop's localhost:

```
EXPO_PUBLIC_API_URL=http://192.168.1.X:5000/api
```

Then start it:

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone.

### Troubleshooting

- **The app cannot reach the API.** Your phone and laptop must be on the same Wi-Fi network, and `EXPO_PUBLIC_API_URL` must use the laptop's local IP address. Find it with `ipconfig` on Windows or `ifconfig` on macOS and Linux.
- **Prisma migration fails.** Confirm MySQL is running and that the database named in `DATABASE_URL` exists.

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

| Member | Registration Number | Module Owned | GitHub |
|---|---|---|---|
| [MEMBER 1 NAME] | [REG NO] | Donation and Food Listing | [@username] |
| [MEMBER 2 NAME] | [REG NO] | Food Requests | [@username] |
| [MEMBER 3 NAME] | [REG NO] | Delivery Coordination | [@username] |
| [MEMBER 4 NAME] | [REG NO] | Driver and Delivery | [@username] |
| [MEMBER 5 NAME] | [REG NO] | Administration | [@username] |

Scrum roles rotate each sprint. The rotation is recorded in the [project charter](docs/01-project-charter.md).

---

## Documentation

| Document | Contents |
|---|---|
| [Project Charter](docs/01-project-charter.md) | Product vision, problem statement, objectives, scope, stakeholders, constraints |
| [Product Backlog](docs/02-product-backlog.md) | Epics, user stories, acceptance criteria, estimates |
| [Database Design](docs/03-database-design.md) | ER diagram and table specifications |
| [Architecture](docs/04-architecture.md) | System architecture and module breakdown |
| [API Plan](docs/05-api-plan.md) | Planned REST endpoints |
| [Sprint Records](docs/sprints/) | Sprint planning, stand up, review and retrospective records |

---

## Project Management

The board, backlog and sprint records are maintained in ClickUp. Sprint 0 ran from 12 to 14 August 2026, Sprint 1 from 15 to 17 August, and Sprint 2 from 18 to 22 August 2026.
