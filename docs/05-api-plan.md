# EatMe: API Plan

> Status: to be completed in Sprint 0. Endpoint names may change during development. The purpose of this document is to agree the initial structure so that five people can build against it in parallel.

Base URL during development: `http://<local-ip>:5000/api`

All routes except `/auth/*` require a valid JWT in the `Authorization: Bearer <token>` header.

---

## Auth (baseline, assumed given)

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/auth/register` | Register a new user with a role | Public |
| POST | `/auth/login` | Log in, returns a JWT | Public |
| GET | `/auth/me` | Current user profile | Any |

---

## Donations (Sprint 1)

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/donations` | Create a listing with items | Donor |
| GET | `/donations` | List open listings, supports search and filter | Recipient, Admin |
| GET | `/donations/mine` | Listings created by the current donor | Donor |
| GET | `/donations/:id` | Listing detail with items | Any |
| PUT | `/donations/:id` | Update a listing | Donor (owner) |
| DELETE | `/donations/:id` | Cancel a listing | Donor (owner), Admin |

---

## Requests (Sprint 2)

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/requests` | Create a request for specific items and quantities | Recipient |
| GET | `/requests/mine` | The current recipient's own requests | Recipient |
| GET | `/requests/incoming` | Requests on the current donor's listings | Donor |
| GET | `/requests/:id` | Request detail | Owner roles |
| PUT | `/requests/:id/accept` | Accept a request | Donor (owner) |
| PUT | `/requests/:id/reject` | Reject a request with an optional reason | Donor (owner) |

---

## Delivery Assignments (Sprint 2 and 3)

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/assignments/pending` | Accepted requests with no assignment yet | Coordinator |
| POST | `/assignments` | Create an assignment and select a driver | Coordinator |
| GET | `/assignments` | All assignments with status | Coordinator, Admin |
| GET | `/driver/assignments` | Assignments for the current driver | Driver |
| PUT | `/driver/assignments/:id/accept` | Accept an assignment | Driver |
| PUT | `/driver/assignments/:id/decline` | Decline with a reason | Driver |

---

## Admin (Sprints 1 and 2)

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/admin/stats` | Counts of listings, requests, assignments, users | Admin |
| GET | `/admin/listings` | All listings | Admin |
| GET | `/admin/requests` | All requests | Admin |
| GET | `/admin/users` | All users | Admin |
| DELETE | `/admin/listings/:id` | Remove a listing (moderation) | Admin |

---

## Response Conventions

Success:

```json
{ "success": true, "data": { } }
```

Error:

```json
{ "success": false, "message": "Human readable message" }
```

Status codes: 200 OK, 201 Created, 400 validation error, 401 not authenticated, 403 wrong role, 404 not found, 500 server error.
