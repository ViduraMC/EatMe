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
| DELETE | `/donations/:id` | Cancel a listing, soft cancel | Donor (owner), Admin |

### Donor side of requests and handover (Sprint 2)

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/donations/requests/incoming` | Requests on the donor's listings, **read only** | Donor |
| GET | `/donations/assignments/pending-confirmation` | Assignments awaiting this donor's pickup confirmation | Donor |
| PATCH | `/donations/assignments/:assignmentId/confirm-pickup` | Confirm the food was handed to the driver | Donor (owner of the listing) |

These sit under `/donations` rather than `/assignments` because the assignment routes belong to the coordinator module. They only ever write the two donor-owned pickup columns, never `request.status` or anything the coordinator or driver owns.

`confirm-pickup` sets `pickup_donor_confirmed_at`. The assignment moves to `in_transit` only when **both** that column and `pickup_driver_confirmed_at` are set; the rule lives in `statusAfterPickupConfirmation()` in `donation.service.ts` and is exported so the driver module applies the same one. Confirming twice is rejected rather than overwriting the first timestamp.

---

## Requests (Sprint 2)

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/requests` | Create a request for specific items and quantities | Recipient |
| GET | `/requests/mine` | The current recipient's own requests | Recipient |
| GET | `/requests/incoming` | Requests on the current donor's listings | Donor |
| GET | `/requests/:id` | Request detail | Owner roles |
| PUT | `/requests/:id/accept` | Accept a request | Coordinator |
| PUT | `/requests/:id/reject` | Reject a request with an optional reason | Coordinator |

> **Sprint 2 change.** Accepting and rejecting moved from the donor to the Donation Coordinator, who already owns matching and assignment. Having the donor approve as well duplicated a responsibility and added friction for a persona who has two minutes to spare. The donor now sees requests read only and confirms the handover instead. `GET /requests/incoming` is superseded by `GET /donations/requests/incoming` below; one of the two should be removed once the request module lands.

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
