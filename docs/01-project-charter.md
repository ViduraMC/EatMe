# EatMe: Project Charter and Product Vision

| Field | Detail |
|---|---|
| Project name | EatMe, a community food sharing and surplus redistribution platform |
| Module | SE3080 Software Project Management |
| Group ID | 1 |
| Repository | https://github.com/ViduraMC/EatMe |
| Project management tool | ClickUp (Workspace: EatMe) |
| Prepared during | Sprint 0, 12 to 14 August 2026 |
| Document version | 1.1 |
| Prepared by | Vidura Chandrasekara |
| Approved by | [CLIENT / STAKEHOLDER NAME], acting in the customer role |

---

## 1. Product Vision

EatMe exists to make surplus food easy to give away before it goes to waste. Households, hotels, bakeries and event caterers regularly end up with good food they cannot use, and at the same time charities, orphanages and elders' homes are looking for exactly that food. The two sides rarely find each other in time. EatMe puts them on a single platform where a donor can publish what they have in a couple of minutes, a recipient can see it immediately, and a coordinator can arrange a driver to move it before it expires.

Our vision statement for the product is:

> For **food donors and recipient organisations** who **need to redistribute surplus food before it spoils**, **EatMe** is a **cross platform mobile application** that **lets donors list surplus food with accurate expiry information, lets recipients browse and request it, and coordinates delivery through assigned drivers**. Unlike **informal phone calls, WhatsApp groups and notice boards**, EatMe **tracks the urgency of every food item and manages the whole chain from listing to confirmed handover in one place**.

A mobile application is the right form for this product rather than a website. Surplus food appears at unpredictable moments and away from a desk: at the end of a function, at closing time in a bakery, after an event. The person who has it needs to list it in the two or three minutes they have, using the phone already in their hand. Drivers are by definition mobile and cannot be expected to sit at a computer to accept an assignment. The urgency at the centre of this product only works if the whole workflow is available where people actually are.

What we want to be true at the end of the project is simple. A donor with surplus food should be able to get it into the hands of a recipient who needs it, with the platform doing the matching, the tracking and the coordination that people currently do by hand.

---

## 2. Problem Statement

Edible food is thrown away every day by people who would happily give it away if giving it away were easy. A hotel finishes a function with fifty portions of rice untouched. A bakery closes with unsold bread that is still perfectly good in the morning. A family cooks too much for an event. In every one of these cases the food has a short window in which it is still safe, and in most cases that window closes before anyone finds a recipient.

The organisations on the receiving side have the opposite problem. Charities, orphanages and elders' homes have a predictable need for food but no reliable view of what is available nearby on any given day. When a donation does happen it is usually because somebody already knew somebody, so the same few donors and the same few recipients keep finding each other while everyone else is left out. There is no shared list, no way to search, and no way to know which food needs to move first.

The coordination itself is the third part of the problem. Even when a donor and a recipient do connect, someone still has to work out who is collecting the food, when, and from where. That is currently done through phone calls and messages, with no record of what was agreed, no confirmation that the food was actually collected, and no way for anyone to check afterwards whether the donation was completed. Nothing in the process is recorded, so nothing can be improved.

EatMe addresses all three problems together: visibility of what is available, urgency awareness so the food that is closest to expiring is dealt with first, and a coordinated delivery process with confirmation at both ends.

The scale of the problem in Sri Lanka is well documented. Studies by the Food and Agriculture Organization and the International Water Management Institute found that Sri Lanka produces around 7,000 tonnes of solid waste every day, of which roughly 65 percent by weight is perishable organic material. That works out to approximately 3,963 tonnes of food waste per day. The same work found that an average urban household throws away about 34 kilograms of food a week, worth more than LKR 1,000, and that households, restaurants and the retail sector are the largest contributors. A platform that redirects even a small fraction of that surplus to people who need it has a clear and measurable purpose.

> Source: FAO Sri Lanka, *Save Food: Tackling the Urban Food Waste Challenge in Sri Lanka*, based on FAO/IWMI studies. Available at: https://www.fao.org/srilanka/news/detail-events/en/c/1441564/

---

## 3. Project Objectives

The objectives below are written so that each one can be checked as either met or not met, and each one is tied to the sprint that delivers it.

| ID | Objective | Sprint | How we measure it |
|---|---|---|---|
| OB1 | Allow a donor to publish a food listing containing multiple items from their phone, with the correct expiry fields for packaged and prepared food, in under five minutes | Sprint 1 | A donor account can create a listing with at least three items of mixed type on a physical device, and the listing is saved and retrievable |
| OB2 | Automatically calculate an expiry time and an urgency flag for every food item, so that recipients see the most time critical food first | Sprint 1 | Prepared items compute expiry from preparation time plus safe window; the browse list is ordered with urgent items first |
| OB3 | Allow a recipient to browse, search and filter open listings without needing to contact the donor first | Sprint 1 | A recipient account can view all open listings and filter them by at least one attribute |
| OB4 | Allow a recipient to request specific items and quantities from a listing, and to see the status of that request | Sprint 2 | A request is created, is visible to the donor, and shows a status of pending, accepted or rejected to the recipient |
| OB5 | Allow a donor to accept or reject an incoming request, with the listing status updating to match | Sprint 2 | Accepting a request changes the item and listing status; rejecting it records an optional reason |
| OB6 | Give the coordinator, driver and administrator their own dashboard screens so that delivery coordination can be completed in later sprints | Sprints 1 and 2 | Each of the three dashboards exists, is reachable only by the correct role, and displays data returned from the API |
| OB7 | Deliver a single mobile application that runs on both Android and iOS from one codebase | Sprints 1 and 2 | The application launches and the core flow works on at least two different physical devices |
| OB8 | Maintain a complete record of the team's Scrum practice, including sprint backlogs, ceremony logs and commit history | Sprints 0 to 2 | ClickUp board and GitHub history both show consistent activity from all five members across all three sprints |

---

## 4. Project Scope

### 4.1 In scope

The system is built as five feature modules, with user registration, login and role assignment treated as a given baseline rather than as one of the five.

| Module | What it covers | Owner |
|---|---|---|
| Donation and Food Listing | Creating listings, adding food items, packaged and prepared food handling, expiry and urgency calculation, donor view of incoming requests, accept and reject | Vidura Chandrasekara |
| Food Requests | Recipient browsing, searching and filtering of open listings, requesting specific items and quantities, viewing own request history and status | Haritha Cabraal |
| Delivery Coordination | Coordinator dashboard, viewing accepted requests, creating delivery assignments, selecting and assigning a driver, tracking assignment status | Kaushal Bandara |
| Driver and Delivery | Driver dashboard, viewing assigned deliveries, accepting or declining an assignment with a reason, pickup and drop off confirmation | Lakkhana Madigasekara |
| Administration | Administrator dashboard, oversight of all listings, requests and deliveries, basic platform statistics, moderation actions | Naily |

All five modules are delivered inside one mobile application. A user sees only the screens belonging to their role, which is controlled by a role based navigation stack after login. The five modules also share one database, so the entity design is agreed by the whole team in Sprint 0 before any individual development starts. Members own their modules but are not isolated from each other.

### 4.2 Out of scope

The following have been deliberately excluded. They are not gaps in the design, they are decisions taken to keep the project deliverable within four sprints of part time student effort. Several of them are recorded as candidates for a future release.

- Push notifications and email notifications
- GPS tracking, maps and live location of drivers
- Camera capture and photographic proof of pickup and drop off, and confirmation codes
- In app chat or messaging between donors and recipients
- Any form of payment, invoicing or donation receipting
- AI based matching or recommendation of donations to recipients
- A separate web application or admin web portal, since the platform is delivered as a mobile application
- Publication to the Google Play Store and the Apple App Store, since the application is distributed through Expo for demonstration purposes
- Offline mode and local data synchronisation
- Production hosting, custom domains and large scale deployment infrastructure
- Formal food safety certification or health authority integration, which stays a manual responsibility of the donor
- Advanced administrative analytics and reporting dashboards

It is worth noting that several of these exclusions become straightforward once the core product exists, because the platform is mobile. Push notifications, camera capture and location are all native capabilities available through Expo. They are deferred because the request to delivery workflow has to work first, not because they are difficult, and they are recorded in the product backlog as candidates for Sprints 3 and 4.

Keeping this list explicit is how we control scope creep. Any request to add one of these items during a sprint goes to the Product Owner and gets placed in the product backlog for a later sprint rather than being absorbed into work already in progress.

---

## 5. Stakeholders

| Stakeholder | Type | Interest in the project | Influence |
|---|---|---|---|
| Donors (households, hotels, bakeries, caterers) | System user | Want a quick, low effort way to give away surplus food before it spoils | High |
| Recipients (charities, orphanages, elders' homes) | System user | Want reliable visibility of available food and a fair way to request it | High |
| Donation Coordinator | System user | Needs to turn accepted requests into deliveries and keep drivers organised | Medium |
| Delivery Driver | System user | Needs clear assignment details on the move, and the ability to accept or decline based on availability | Medium |
| Administrator | System user | Needs oversight of platform activity and the ability to moderate content | Medium |
| [CLIENT / STAKEHOLDER NAME] | Client, customer role | Represents the end user viewpoint, reviews each sprint increment and approves or rejects completed work | High |
| Project team, five members | Delivery team | Responsible for planning, building, testing and demonstrating the product | High |
| Module lecturer and evaluation panel | Academic | Assess the application of Scrum practice, the quality of the increment and the final report | High |

---

## 6. Constraints

| Category | Constraint |
|---|---|
| Time | The project must be delivered by 25 August 2026. Sprint 0 through Sprint 2 run from 12 to 22 August 2026, which compresses each sprint to between two and five days rather than the usual one to two weeks |
| Cost | The project has no budget. Every tool used has to be available on a free tier, which means ClickUp Free, GitHub, Figma, Expo and free or self hosted development tooling. Some ClickUp features such as advanced dashboard widgets require a paid plan and are therefore unavailable to us |
| Resources | The team is five undergraduate students working part time alongside other modules. Availability is uneven across the week and no member can be treated as full time |
| Technical | The product is a cross platform mobile application built with React Native and Expo, backed by a Node.js and Express REST API and a MySQL database. The backend runs on a team member's machine on the local network during development, so the application and the API have to be on the same network to work |
| Platform | Testing is done on the team's own Android devices through Expo Go. Building a signed iOS release requires an Apple Developer account and macOS, neither of which the team has, so iOS support is written for but demonstrated only if a member has an iPhone available |
| Quality | Testing is manual and functional, carried out on physical devices against the acceptance criteria of each user story. Automated test suites, performance testing and security auditing are outside what the timeline allows |
| Process | The team must follow Scrum, must rotate the Product Owner and Scrum Master roles between sprints, and must maintain evidence of every ceremony. All work has to be tracked in ClickUp and all code committed to the shared repository so that individual contribution is visible |
| Academic | Group composition is fixed by the official group list. Any use of generative AI tools has to be declared, and every member must be able to explain their own contribution at the viva |

### Assumptions

- Donors, recipients, coordinators and drivers each own an Android or iOS smartphone with an internet connection
- Donors provide accurate preparation times and expiry dates, since the platform cannot verify food safety itself
- Recipient organisations are able to receive food at the address they register
- Every team member has access to a physical Android device for development and testing
- The client is available to attend a review at the end of each sprint
- All five team members remain available for the full duration of the project

---

## 7. Technology Stack

| Layer | Technology | Reason for the choice |
|---|---|---|
| Mobile application | React Native with Expo | One codebase produces an Android and an iOS application. Expo Go lets every member run and test the app on their own phone without installing Android Studio or Xcode, which matters when five people are setting up in a two day Sprint 0 |
| Navigation | React Navigation | Supports the role based navigation stacks the app needs, so that a donor, a recipient, a coordinator, a driver and an administrator each see only their own screens after login |
| Backend | Node.js with Express | A REST API in the same language as the mobile client, so any member can review either side of a pull request |
| Database | MySQL | The data model is relational, with foreign keys and status enums across seven core entities, so a relational database is the honest fit for the design agreed in Sprint 0 |
| Data access | Prisma ORM | The schema file acts as a single source of truth for the database design, and its migration history gives a versioned record of every schema change |
| Authentication | JSON Web Tokens | Stateless authentication suited to a mobile client that has no server session |
| Design | Figma | Low fidelity wireframes and screen designs produced in Sprint 0 |
| Version control | Git and GitHub | One repository containing both the mobile app and the API, with branch protection and reviewed pull requests |
| Project management | ClickUp | Product backlog, sprint boards, and the records of every Scrum ceremony |

**Why React Native rather than Flutter.** Both are mature and both are used at scale in industry, Flutter by Google Pay and BMW, React Native by Shopify, Discord and Coinbase. The decision came down to the constraints of this project rather than the merits of the frameworks. The team already works in JavaScript and React, so React Native requires no new language, whereas Flutter would mean learning Dart during a sprint that also has to produce a working increment. Expo removes the local Android and iOS toolchain from the setup entirely, which is the difference between the team being productive on day one and spending a day configuring emulators on five different machines. Using JavaScript on both the client and the server also means the whole team can meaningfully review each other's code, which the module requires. If the team had existing Dart experience the decision would have gone the other way.

---

## 8. System Roles

| Role | Responsibility | Key permissions |
|---|---|---|
| Donor | Publishes surplus food, manages their own listings, and decides which requests to accept | Create, edit and cancel own listings and items; view and respond to requests on own listings |
| Recipient | Finds available food and requests what the organisation needs | Browse, search and filter open listings; create requests; view own request history |
| Donation Coordinator | Turns accepted requests into delivery assignments and keeps the delivery pipeline moving | View accepted requests; create and reassign delivery assignments; select drivers; view assignment status |
| Delivery Driver | Collects food from the donor and delivers it to the recipient | View assignments addressed to them; accept or decline with a reason; confirm pickup and drop off |
| Administrator | Oversees the platform and keeps it usable and appropriate | View all listings, requests and assignments; view platform statistics; perform moderation actions such as removing a listing; manage user accounts |

Registration, authentication and role assignment sit underneath all five roles and are treated as an assumed baseline of the system rather than as a feature module of their own. After login the application reads the user's role and loads the matching navigation stack, so each role has its own set of screens inside the one application.

---

## 9. Scrum Roles and Rotation

Module ownership describes what each person builds. Scrum roles describe how the team runs the process. The two are separate, and the Scrum roles rotate each sprint so that every member experiences a different position, as the assignment brief encourages.

| Sprint | Product Owner | Scrum Master | Development Team |
|---|---|---|---|
| Sprint 0 (12 to 14 Aug) | Naily | Vidura | Haritha, Kaushal, Lakkhana |
| Sprint 1 (15 to 17 Aug) | Haritha | Naily | Vidura, Kaushal, Lakkhana |
| Sprint 2 (18 to 22 Aug) | Kaushal | Haritha | Vidura, Lakkhana, Naily |

**Product Owner.** Owns and prioritises the product backlog, writes and approves user stories with their acceptance criteria, represents the client's interests inside the team, and accepts or rejects completed work at the sprint review.

**Scrum Master.** Facilitates sprint planning, the daily stand up, the review and the retrospective. Removes blockers, protects the sprint from mid sprint scope changes, and keeps the ClickUp board and the ceremony records up to date.

**Development Team.** Everyone else. The Product Owner and Scrum Master also continue to build their own modules, so these are facilitation responsibilities layered on top of development work rather than replacements for it.

Attendance and notes for every ceremony are recorded in ClickUp under the name of the person who ran it, which is what gives us the evidence trail for the Scrum roles and events part of the assessment.

---

## 10. Definition of Success

The project is successful if the following are all true at the end of Sprint 2:

1. A donor can create a listing with multiple food items from a phone, and the system calculates expiry and urgency correctly for both packaged and prepared food.
2. A recipient can browse those listings, request specific items, and see the status of that request change.
3. A donor can accept or reject that request and the listing status updates accordingly.
4. The coordinator, driver and administrator dashboards exist and display data from the API, even if their full workflows are completed in Sprint 3.
5. The application installs and runs on a physical device and the demonstration is given on a real phone rather than an emulator.
6. ClickUp and GitHub together show consistent, individually attributable work from all five members across Sprints 0, 1 and 2.
7. Every sprint has a recorded planning session, daily stand ups, a review attended by the client, and a retrospective with agreed action points.

The first three points are the demonstration flow. If that flow works end to end and reliably on a real device, the core purpose of Sprints 0 to 2 has been achieved.
