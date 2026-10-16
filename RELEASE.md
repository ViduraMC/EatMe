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
| Hosting          | `server/Dockerfile`: the API runs on Google Cloud Run (Singapore) as a non-root container with production dependencies only. Secrets live in Google Secret Manager, readable only by the API's own service account. Database on Neon (managed PostgreSQL, Singapore).           |
| Dependencies     | Known vulnerable packages updated (`proxy-addr`, `qs`, `morgan`, `axios` and others).                                                                                                                                                                                           |
| Legal            | `legal/privacy-policy.md`, needed for the store listing and the Data safety form.                                                                                                                                                                                               |

Already in place before this branch and checked: bcrypt password hashing,
one error message for unknown email and wrong password, timing-safe sign in,
role checks on every route, users re-read from the database on every request
(suspensions apply immediately), Zod validation that strips unknown fields,
CHECK constraints in the database, no stack traces sent to clients, tokens in
the phone's secure keystore.

---

## Costs: $0 within the free tiers

| Service                                        | What it does                                    | Free allowance                                                                                   |
| ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Google Play developer account                  | Publishing                                      | already paid                                                                                     |
| Neon (Free plan)                               | PostgreSQL database                             | 0.5 GB storage, 100 compute hours a month; sleeps when idle and wakes by itself in a few seconds |
| Google Cloud Run                               | Runs the API                                    | 2 million requests and 180,000 vCPU-seconds a month; scales to zero when idle                    |
| Cloud Build, Artifact Registry, Secret Manager | Build and store the API image, keep the secrets | Free monthly build minutes, 0.5 GB image storage, 6 secret versions                              |
| Expo EAS Build (Free plan)                     | Builds the Android app                          | A limited number of builds a month                                                               |

Google Cloud needs a billing account with a card, but nothing is charged while
usage stays inside the free tier. Step 3 sets a budget alert so you get an
email long before any charge. After a quiet period the first request takes a
few seconds while Cloud Run and Neon wake up; after that it is instant.

---

## 1. Push this branch

```bash
git push -u origin release/play-store
```

Do not merge it into `dev`.

## 2. Create the database (Neon)

1. Sign up at https://neon.tech and create a project named `eatme`.
   Region: **AWS Asia Pacific (Singapore)**. Postgres version: latest.
2. On the project dashboard, open **Connect**, turn **Connection pooling off**,
   and copy the connection string. It looks like
   `postgresql://USER:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
   Keep it private: it contains the database password. You paste it once in
   step 4; it is never stored in the repository.

## 3. Create the Google Cloud project

1. Go to https://console.cloud.google.com, sign in, and create a project named
   `eatme`. Note its **Project ID** (for example `eatme-123456`).
2. **Billing**: link a billing account (add a card when asked). The free tier
   still applies.
3. **Billing → Budgets & alerts → Create budget**: scope it to the `eatme`
   project, amount **$1**, alerts at 50%, 90% and 100%.

Everything below runs in **Cloud Shell**, the terminal button (`>_`) at the
top right of the Google Cloud console. It already has `gcloud`, `git` and
Node, so nothing is installed on your laptop and nothing touches C:.

## 4. Deploy the API (Cloud Run, in Cloud Shell)

Run these one block at a time. Replace `YOUR_PROJECT_ID`.

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
git clone -b release/play-store https://github.com/ViduraMC/EatMe.git
cd EatMe/server
```

Store the two secrets in Secret Manager. The database string is pasted at a
hidden prompt so it does not end up in shell history, and the JWT secret is
generated without ever being shown:

```bash
read -rsp "Paste the Neon connection string: " DBURL; echo
printf '%s' "$DBURL" | gcloud secrets create eatme-database-url --data-file=-
unset DBURL
node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))" | gcloud secrets create eatme-jwt-secret --data-file=-
```

Create a dedicated service account for the API that can read only those two
secrets (the default one has far wider access to the project):

```bash
PROJECT_ID=$(gcloud config get-value project)
gcloud iam service-accounts create eatme-api --display-name="EatMe API"
for s in eatme-database-url eatme-jwt-secret; do
  gcloud secrets add-iam-policy-binding $s \
    --member="serviceAccount:eatme-api@$PROJECT_ID.iam.gserviceaccount.com" \
    --role=roles/secretmanager.secretAccessor
done
```

Create the tables. This applies every migration, including the CHECK
constraints, and never deletes data:

```bash
npm ci
DATABASE_URL="$(gcloud secrets versions access latest --secret=eatme-database-url)" npx prisma migrate deploy
```

Build and deploy (answer **Y** if it asks to create an Artifact Registry
repository):

```bash
gcloud run deploy eatme-api --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --service-account "eatme-api@$PROJECT_ID.iam.gserviceaccount.com" \
  --set-secrets "DATABASE_URL=eatme-database-url:latest,JWT_SECRET=eatme-jwt-secret:latest" \
  --set-env-vars "NODE_ENV=production,JWT_EXPIRES_IN=7d,CORS_ORIGIN=*,TRUST_PROXY_HOPS=1" \
  --min-instances 0 --max-instances 2 --memory 512Mi --cpu 1 --cpu-boost
```

`--allow-unauthenticated` only means the phone can reach the URL; every route
still checks the user's token and role. `--max-instances 2` caps cost and keeps
the sign-in rate limit meaningful.

Keep image storage inside the free 0.5 GB by deleting old builds automatically:

```bash
cat > /tmp/cleanup.json <<'JSON'
[
  { "name": "keep-latest-2", "action": { "type": "Keep" }, "mostRecentVersions": { "keepCount": 2 } },
  { "name": "delete-older", "action": { "type": "Delete" }, "condition": { "tagState": "any", "olderThan": "1d" } }
]
JSON
gcloud artifacts repositories set-cleanup-policies cloud-run-source-deploy --location=asia-southeast1 --policy=/tmp/cleanup.json --no-dry-run
```

The deploy prints a **Service URL** like
`https://eatme-api-xxxxxxxxxx.asia-southeast1.run.app`. Open
`<Service URL>/api/health`; it must return `"status":"ok"`. The app's API
address is the Service URL plus `/api`.

## 5. Check the proxy setting

The sign-in rate limit needs each phone's real IP address.

1. Open `<Service URL>/api/health` on your phone using mobile data and look at
   `clientIp`. Compare it with the phone's public IP (search "what is my IP" on
   the same phone). They should match.
2. If `clientIp` is a Google address instead, raise the value by one and check
   again:
   `gcloud run services update eatme-api --region asia-southeast1 --update-env-vars TRUST_PROXY_HOPS=2`
3. Confirm it cannot be faked:
   `curl -H "X-Forwarded-For: 1.2.3.4" <Service URL>/api/health`
   must **not** show `1.2.3.4`. If it does, lower the value by one.

## 6. Create the first administrator (in Cloud Shell)

Still in `EatMe/server`. Use your own details. The password is typed at a
hidden prompt (at least 12 characters):

```bash
read -rsp "Admin password: " ADMIN_PASSWORD; echo; export ADMIN_PASSWORD
ADMIN_NAME="Your Name" ADMIN_EMAIL="you@example.com" ADMIN_PHONE="07XXXXXXXX" \
  DATABASE_URL="$(gcloud secrets versions access latest --secret=eatme-database-url)" \
  npm run admin:create
unset ADMIN_PASSWORD
```

Sign in to the app with this account and create the coordinator and driver
accounts from the admin screens. Never run `npm run db:seed` against
production (it refuses anyway).

## 7. Publish the privacy policy

1. In `legal/privacy-policy.md`, replace both `SUPPORT_EMAIL` with the email
   people should write to, commit, and push.
2. Use this as the **Privacy policy URL** in Play Console:
   `https://github.com/ViduraMC/EatMe/blob/release/play-store/legal/privacy-policy.md`
3. Use the same URL with `#deleting-your-account` on the end as the
   **Delete account URL** in the Data safety section.

## 8. Build the app (Expo EAS)

All commands run in `mobile/`. `npx` is used instead of a global install so
nothing is written to C:.

```bash
cd mobile
npx eas-cli login
npx eas-cli init
```

`eas init` creates the project on your Expo account and adds its
`extra.eas.projectId` to `app.json`. Commit that change.

Set the production API address (the Service URL from step 4 plus `/api`):

```bash
npx eas-cli env:create --environment production --name EXPO_PUBLIC_API_URL --value https://eatme-api-xxxxxxxxxx.asia-southeast1.run.app/api --visibility plaintext
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://eatme-api-xxxxxxxxxx.asia-southeast1.run.app/api --visibility plaintext
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

## 9. Create the app in Play Console

https://play.google.com/console → **Create app**: name `EatMe`, default
language English (United Kingdom) or English (United States), App, Free.

Then work through **Dashboard → Set up your app**:

- **Privacy policy:** URL from step 7.
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
    the Delete account URL from step 7.
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

## 10. Test, then release

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

1. Make the change on this branch (or bring it in from `dev` with a PR) and push.
2. Raise `version` in `mobile/app.json` (for example `1.0.1`). The Android
   `versionCode` is raised automatically by EAS.
3. In Cloud Shell, update the API. The service keeps its secrets and settings.

   ```bash
   cd ~/EatMe && git pull && cd server && npm ci
   DATABASE_URL="$(gcloud secrets versions access latest --secret=eatme-database-url)" npx prisma migrate deploy
   gcloud run deploy eatme-api --source . --region asia-southeast1
   ```

4. `npx eas-cli build -p android --profile production`, then upload to Play.

## If something goes wrong

- **API errors:** Cloud Run → `eatme-api` → **Logs**.
- **Roll back the API:** Cloud Run → `eatme-api` → **Revisions**, send 100% of
  traffic to the previous revision.
- **Database password leaked:** in Neon, reset the role's password, store the
  new connection string with
  `read -rsp "New string: " DBURL; printf '%s' "$DBURL" | gcloud secrets versions add eatme-database-url --data-file=-`,
  then redeploy.
- **JWT secret leaked:** add a new version of `eatme-jwt-secret` the same way
  and redeploy. Everyone is signed out and signs in again.

## Local development is unchanged

`dev` and your laptop setup keep working exactly as before: Docker Postgres on
port 5433, `npm run dev:server`, Expo Go with `mobile/.env`. Production values
live only in Neon, Google Secret Manager and EAS, never in the repository.
