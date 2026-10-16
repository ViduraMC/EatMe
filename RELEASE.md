# Releasing EatMe to Google Play

This branch (`release/play-store`) is the production version of EatMe. `dev`
stays exactly as it is for local development with Expo Go and the laptop API.

What this branch changes, and why:

| Area             | Change                                                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account deletion | Donors and recipients can delete their account in **Profile → Delete account** (`DELETE /api/auth/me`, password required). Google Play requires this for any app with in-app sign-up. Personal details are wiped and the account closed; delivery history is kept without them. |
| Brute force      | Rate limits on sign in (30 per IP and 10 per account in 15 minutes, so faking IP addresses does not help), sign up (10 per IP) and account deletion (5 per user). Malformed or oversized request bodies get 400 / 413.                                                          |
| HTTP hardening   | Security headers on every response, HSTS in production, `X-Powered-By` removed, browsers blocked by CORS in production (the Android app does not need CORS).                                                                                                                    |
| Tokens           | JWT verification pinned to HS256. The server refuses to start in production with the example `JWT_SECRET`.                                                                                                                                                                      |
| Data safety      | `npm run db:seed` refuses to run in production (it deletes every row).                                                                                                                                                                                                          |
| First admin      | `npm run admin:create` creates the first administrator on an empty production database.                                                                                                                                                                                         |
| App              | Release builds refuse a non-HTTPS API URL. Version `1.0.0`. Unused Android permissions blocked (`SYSTEM_ALERT_WINDOW`, storage). `eas.json` added for store builds.                                                                                                             |
| Hosting          | `render.yaml` (API on Render, Singapore). Database on Neon (managed PostgreSQL).                                                                                                                                                                                                |
| Legal            | `legal/privacy-policy.md`, needed for the store listing and the Data safety form.                                                                                                                                                                                               |

Already in place before this branch and checked: bcrypt password hashing,
one error message for unknown email and wrong password, timing-safe sign in,
role checks on every route, users re-read from the database on every request
(suspensions apply immediately), Zod validation that strips unknown fields,
CHECK constraints in the database, no stack traces sent to clients, tokens in
the phone's secure keystore.

---

## Costs

| Service                       | Plan                          | Cost             |
| ----------------------------- | ----------------------------- | ---------------- |
| Google Play developer account | one-off                       | already paid     |
| Neon PostgreSQL               | Free (0.5 GB)                 | $0               |
| Render web service            | Starter                       | about $7 a month |
| Expo EAS Build                | Free (limited builds a month) | $0               |

Render's free plan works for testing, but it sleeps after 15 minutes idle and
takes about a minute to wake, which is longer than the app's 15 second request
timeout. Use Starter for the store release.

---

## 1. Push this branch

```bash
git push -u origin release/play-store
```

Render deploys from this branch. Do not merge it into `dev`.

## 2. Create the database (Neon)

1. Sign up at https://neon.tech and create a project named `eatme`.
   Region: **AWS Asia Pacific (Singapore)**. Postgres version: latest.
2. On the project dashboard, open **Connect**, untick **Connection pooling**,
   and copy the connection string. It looks like
   `postgresql://USER:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
   Keep it private: it is the database password.

The tables are created automatically on the first deploy.

## 3. Deploy the API (Render)

1. Sign up at https://render.com with GitHub and allow access to `ViduraMC/EatMe`.
2. **New → Blueprint**, pick the repository, branch `release/play-store`.
   Render reads `render.yaml` and proposes the `eatme-api` web service.
3. When it asks for `DATABASE_URL`, paste the Neon string from step 2.
   `JWT_SECRET` is generated for you. Apply.
4. Wait for the deploy to finish, then open
   `https://<your-service>.onrender.com/api/health`. It must return
   `"status":"ok"`. Note this URL: the app's API address is that URL plus
   `/api`, for example `https://eatme-api.onrender.com/api`.
5. **Check the proxy setting** (the sign-in rate limit depends on it). Render
   does not publish how many proxies sit in front of the app.
   - Open the health URL on your phone using mobile data and look at
     `clientIp`. Compare it with your phone's public IP (search "what is my
     IP" on the same phone).
   - If `clientIp` is a different address (Render's or Cloudflare's), go to
     Render → `eatme-api` → **Environment**, raise `TRUST_PROXY_HOPS` by 1,
     save (it redeploys), and check again until they match.
   - Then confirm it cannot be faked: run
     `curl -H "X-Forwarded-For: 1.2.3.4" https://<your-service>.onrender.com/api/health`.
     `clientIp` must **not** be `1.2.3.4`. If it is, lower `TRUST_PROXY_HOPS`
     by 1.

## 4. Create the first administrator

Render → `eatme-api` → **Shell**, then (use your own details, password at least
12 characters):

```bash
ADMIN_NAME="Your Name" ADMIN_EMAIL="you@example.com" ADMIN_PHONE="07XXXXXXXX" ADMIN_PASSWORD="a-long-unique-password" npm run admin:create
```

Sign in to the app with this account and create the coordinator and driver
accounts from the admin screens. Never run `npm run db:seed` against
production (it now refuses).

## 5. Publish the privacy policy

1. In `legal/privacy-policy.md`, replace both `SUPPORT_EMAIL` with the email
   people should write to, commit, and push.
2. Use this as the **Privacy policy URL** in Play Console:
   `https://github.com/ViduraMC/EatMe/blob/release/play-store/legal/privacy-policy.md`
3. Use the same URL with `#deleting-your-account` on the end as the
   **Delete account URL** in the Data safety section.

## 6. Build the app (Expo EAS)

All commands run in `mobile/`. `npx` is used instead of a global install so
nothing is written to C:.

```bash
cd mobile
npx eas-cli login
npx eas-cli init
```

`eas init` creates the project on your Expo account and adds its
`extra.eas.projectId` to `app.json`. Commit that change.

Set the production API address (the URL from step 3 plus `/api`):

```bash
npx eas-cli env:create --environment production --name EXPO_PUBLIC_API_URL --value https://eatme-api.onrender.com/api --visibility plaintext
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://eatme-api.onrender.com/api --visibility plaintext
```

Optional: test the real production setup on your phone first:

```bash
npx eas-cli build -p android --profile preview
```

This gives an installable APK link. Then build the store bundle:

```bash
npx eas-cli build -p android --profile production
```

When it asks to generate an Android keystore, answer **yes**. EAS stores it
for you; losing it would mean you can never update the app. The result is an
`.aab` file to download.

## 7. Create the app in Play Console

https://play.google.com/console → **Create app**: name `EatMe`, default
language English (United Kingdom) or English (United States), App, Free.

Then work through **Dashboard → Set up your app**:

- **Privacy policy:** URL from step 5.
- **App access:** "All or some functionality is restricted". Add a reviewer
  login. In the app, register a donor account for the reviewer (for example
  `play.review.donor@yourdomain` with a strong password) and give those
  details here. Recipient accounts need admin approval, so if you also give a
  recipient login, approve it first in the admin screens.
- **Ads:** No.
- **Content rating:** fill in the questionnaire (no violence, no user-to-user
  chat, no gambling). Category: Utility / productivity.
- **Target audience:** 18 and over.
- **News app:** No. **Health app:** No. **Financial features:** None.
  **Government app:** No.
- **Data safety:**
  - Collects or shares data: **Yes, collects**. Shares with third parties: **No**.
  - Encrypted in transit: **Yes**. Users can request deletion: **Yes**, with
    the Delete account URL from step 5.
  - Data types, each "Collected", not shared, required, purpose **App
    functionality** and **Account management**: Personal info → **Name**,
    **Email address**, **Phone number**, **Address** (address also covers
    organisation and pickup addresses). App activity → **Other user-generated
    content** (listings, requests, notes), purpose App functionality.
  - Everything else (location, financial, health, messages, photos, audio,
    files, calendar, contacts, browsing, device IDs, crash logs): not collected.
- **Store listing:** short description (80 characters), full description, app
  icon 512 × 512 PNG, feature graphic 1024 × 500, and at least two phone
  screenshots. App category: **Food & Drink**. Contact email.

## 8. Test, then release

1. **Testing → Internal testing → Create release**, upload the `.aab`, add
   yourself as a tester, roll out, install from the Play link and check sign
   up, sign in, a listing, a request and account deletion.
2. **Personal developer accounts created after November 2023:** Google
   requires a **closed test with at least 12 testers opted in for 14 days in a
   row** before you can apply for production. Create a closed testing track,
   add your team and friends by email (12 or more), share the opt-in link, and
   keep them opted in for 14 days. Organisation accounts skip this.
3. Then **Production → Create release** with the same `.aab` (or a newer
   build), and send for review. Reviews usually take a few days.

`eas.json` can also upload builds for you once a Google service account key is
set up (`npx eas-cli submit -p android --profile production`); uploading by
hand in Play Console works fine too.

## Later releases

1. Make the change on this branch (or merge it in from `dev` with a PR).
2. Raise `version` in `mobile/app.json` (for example `1.0.1`). The Android
   `versionCode` is raised automatically by EAS.
3. Push. Render redeploys the API and runs any new migrations by itself.
4. `npx eas-cli build -p android --profile production`, upload to Play.

## Local development is unchanged

`dev` and your laptop setup keep working exactly as before: Docker Postgres
on port 5433, `npm run dev:server`, Expo Go with `mobile/.env`. The production
values live only in Render, Neon and EAS, never in the repository.
