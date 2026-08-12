# EatMe: Product Backlog

> Status: to be completed in Sprint 0. The authoritative backlog lives in ClickUp. This file is the committed snapshot of it, kept in sync at the end of each sprint so the repository history shows how the backlog evolved.

---

## Epics

| ID | Epic | Description | Module |
|---|---|---|---|
| EP1 | Donation Management | | Donation |
| EP2 | Request Management | | Request |
| EP3 | Delivery Coordination | | Coordinator |
| EP4 | Driver Delivery | | Driver |
| EP5 | Administration | | Admin |
| EP6 | Notifications | | Cross cutting |
| EP7 | Confirmation | | Cross cutting |

---

## User Stories

Story point scale: 1 very small, 2 small, 3 medium, 5 large, 8 very large.
Priority uses MoSCoW: Must, Should, Could, Won't.

| ID | Epic | User Story | Priority | Points | Sprint | Owner |
|---|---|---|---|---|---|---|
| US-D01 | EP1 | As a donor, I want to create a food donation listing, so that recipients can view available surplus food. | Must | 5 | 1 | Vidura |
| US-R01 | EP2 | As a recipient, I want to browse available food listings, so that I can find donations to request. | Must | 5 | 1 | Haritha |
| US-C01 | EP3 | As a coordinator, I want a dashboard foundation, so that I can later manage delivery assignments. | Should | 3 | 1 | Kaushal |
| US-DR01 | EP4 | As a driver, I want a dashboard foundation, so that I can later view and act on delivery assignments. | Should | 3 | 1 | Lakkhana |
| US-A01 | EP5 | As an admin, I want a dashboard overview of platform activity, so that I can monitor the system. | Should | 3 | 1 | Naily |
| US-D02 | EP1 | As a donor, I want to accept or reject incoming requests, so that I control who receives my donation. | Must | 5 | 2 | Vidura |
| US-R02 | EP2 | As a recipient, I want to request specific food items from a listing, so that I can receive what I need. | Must | 8 | 2 | Haritha |
| US-C02 | EP3 | As a coordinator, I want to create a delivery assignment from an accepted request, so that a driver can be dispatched. | Must | 5 | 2 | Kaushal |
| US-DR02 | EP4 | As a driver, I want to accept or decline a delivery assignment, so that coordinators know if I am available. | Must | 5 | 2 | Lakkhana |
| US-A02 | EP5 | As an admin, I want to view all listings, requests and deliveries, so that I can oversee platform activity. | Should | 5 | 2 | Naily |

> Sprint 3 and Sprint 4 stories to be added. The rubric requires planning for Sprints 0 to 4, so this table must be extended before submission.

---

## Acceptance Criteria

<!-- One subsection per story. Each criterion must be independently checkable. -->

### US-D01: Create Food Donation Listing

- Donor can enter listing details (title, description, pickup address, pickup window)
- Donor can add one or more food items to the listing
- Donor can select packaged or prepared for each item
- The correct expiry fields appear depending on the category selected
- Urgency is calculated automatically
- The listing is saved and appears in the donor's own listing view
- The listing becomes visible to recipients

### US-R01: Browse Available Food Listings

- Recipient can view a list of open listings
- Each listing shows item details (category, quantity, expiry or urgency)
- Recipient can search or filter listings
- Urgent items appear first

<!-- Continue for the remaining stories. -->
