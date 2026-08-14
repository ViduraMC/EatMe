# EatMe: System Architecture

> Status: to be completed in Sprint 0.

---

## High Level Architecture

```
┌─────────────────────────────────────────┐
│   Mobile Application                    │
│   React Native + Expo                   │
│                                         │
│   Role based navigation after login:    │
│   Donor | Recipient | Coordinator |     │
│   Driver | Admin                        │
└───────────────────┬─────────────────────┘
                    │  HTTPS / REST, JWT in Authorization header
                    ▼
┌─────────────────────────────────────────┐
│   API Server                            │
│   Node.js + Express                     │
│                                         │
│   Routes → Middleware → Controllers →   │
│   Services → Prisma                     │
└───────────────────┬─────────────────────┘
                    │  Prisma ORM
                    ▼
┌─────────────────────────────────────────┐
│   PostgreSQL Database                   │
└─────────────────────────────────────────┘
```

---

## Module Breakdown

| Module | Mobile screens | API routes | Owner |
|---|---|---|---|
| Donation | `src/screens/donor/` | `/api/donations` | Vidura |
| Request | `src/screens/recipient/` | `/api/requests` | Haritha |
| Coordinator | `src/screens/coordinator/` | `/api/assignments` | Kaushal |
| Driver | `src/screens/driver/` | `/api/driver` | Lakkhana |
| Admin | `src/screens/admin/` | `/api/admin` | Naily |

---

## Request Flow

<!-- Describe one end to end request, for example creating a listing, from screen to database and back. -->

---

## Authentication and Authorisation

The client stores a JSON Web Token after login and sends it in the `Authorization` header on every request. An Express middleware verifies the token and attaches the user to the request. A second role guard middleware checks that the user's role is permitted to call that route. On the client, the root navigator reads the role from the token and mounts only that role's navigation stack, so a user never sees screens belonging to another role.
