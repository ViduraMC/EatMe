# Contributing to EatMe

This document records the conventions the team agreed during Sprint 0. Everyone follows them so that the repository stays readable and so that each member's contribution is clearly visible in the history, which the module requires.

---

## 1. Branching Strategy

### Branch hierarchy

```
main                    Stable, demonstrated code. Protected.
 └── dev                Integration branch. All work merges here first.
      └── feature/*     Module branches, one owner each
```

### Permanent branches

| Branch | Purpose | Who merges into it |
|---|---|---|
| `main` | Only contains code that has been demonstrated and accepted at a sprint review. Updated once per sprint. | Scrum Master, at the end of a sprint |
| `dev` | The working integration branch. Always the base for new work. | Any member, through a reviewed pull request |

### Module branches

Each member owns one branch for the duration of the project:

| Branch | Module | Owner |
|---|---|---|
| `feature/donation-listing` | Donation and Food Listing | [MEMBER 1 NAME] |
| `feature/donation-request` | Food Requests | [MEMBER 2 NAME] |
| `feature/delivery-coordinator` | Delivery Coordination | [MEMBER 3 NAME] |
| `feature/driver-delivery` | Driver and Delivery | [MEMBER 4 NAME] |
| `feature/admin-dashboard` | Administration | [MEMBER 5 NAME] |

### Naming any additional branches

```
<type>/<short-kebab-case-description>
```

Types are `feature`, `fix`, `docs`, `chore`, `refactor` and `test`.

Good examples:

```
feature/expiry-calculation
fix/request-quantity-validation
docs/sprint-1-retrospective
chore/prisma-setup
```

Rules:

- Lower case only, words separated by hyphens
- No spaces, no underscores, no personal names in branch names
- Keep it under about 40 characters
- Always branch from `dev`, never from `main`

### Daily workflow

Start of the day, before writing anything:

```bash
git checkout dev
git pull origin dev
git checkout feature/your-module
git merge dev
```

Pulling `dev` into your branch every morning is the single most effective way to avoid a painful merge at the end of the sprint.

When your work is ready:

```bash
git add .
git commit -m "feat(donation): add expiry calculation for prepared items"
git push origin feature/your-module
```

Then open a pull request into `dev` on GitHub.

---

## 2. Commit Message Convention

We use Conventional Commits.

```
<type>(<scope>): <subject>
```

### Types

| Type | Use it for |
|---|---|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `docs` | Documentation only, including the assignment artefacts in `docs/` |
| `style` | Formatting, whitespace, naming. No change in behaviour |
| `refactor` | Restructuring code without changing what it does |
| `test` | Adding or correcting tests |
| `chore` | Configuration, dependencies, build setup, project scaffolding |

### Scopes

Use the module the change belongs to: `donation`, `request`, `delivery`, `driver`, `admin`, `auth`, `db`, `api`, `ui`, `config`.

### Rules for the subject line

- Written in the imperative present tense: "add", not "added" or "adds"
- Starts with a lower case letter
- No full stop at the end
- Under 72 characters
- Describes what changed and why it matters, not which files you touched

### Examples

Good:

```
feat(donation): calculate computed expiry from prepared time and safe window
feat(request): allow a recipient to request specific items and quantities
fix(driver): update assignment status when a driver declines
docs(charter): add project charter and product vision
chore(db): add prisma schema for donation and item entities
refactor(api): move urgency logic out of the controller into a service
```

Not acceptable:

```
update
fixed bug
changes
final version
asdf
Update DonationController.js
```

A history full of "update" and "fixed bug" is worth nothing as evidence of individual contribution, which is exactly what the module assesses.

### Linking commits to ClickUp

Where a commit relates to a ClickUp task, put the task ID at the end of the subject line:

```
feat(donation): add listing creation form (CU-86eyknr1q)
```

With the ClickUp GitHub integration enabled, the commit then appears on the ClickUp task itself. That gives a direct, checkable link between the board and the code, which is strong evidence for the team collaboration criterion.

---

## 3. Pull Requests

### Rules

- Every merge into `dev` goes through a pull request. Nobody pushes to `dev` directly.
- Every pull request needs at least **one approving review** from another member.
- The author does not merge their own pull request without a review.
- Keep pull requests small. One user story per pull request is the target.
- Resolve conflicts on your own branch before requesting review, not in the GitHub web editor.

### Pull request title

Use the same format as a commit message:

```
feat(donation): create food listing with multiple items
```

### Pull request description

```markdown
## What this changes
A short summary of what was built.

## Related
ClickUp task: <link>
User story: US-D01

## Acceptance criteria
- [ ] Criterion one from the user story
- [ ] Criterion two

## How to test it
1. Log in as a donor
2. ...

## Screenshots
Attach a screenshot or a short screen recording of the feature working.
```

The screenshots matter. They become the demo evidence in the sprint review and the report.

### Reviewing someone else's pull request

Check that the code runs, that the acceptance criteria are actually met, that nothing outside the author's module was changed without discussion, and that no credentials or `.env` files have been committed. Leave a comment even when approving, because review comments are themselves evidence of collaboration.

---

## 4. Definition of Done

A task is Done only when all of the following are true:

- [ ] The code is implemented and runs without errors
- [ ] The code is committed with a properly formatted commit message
- [ ] A pull request has been opened, reviewed and merged into `dev`
- [ ] Basic manual testing has been completed against the acceptance criteria
- [ ] No critical or blocking defects remain
- [ ] The ClickUp task has been moved to Done
- [ ] The feature can be demonstrated live

---

## 5. Things That Must Never Be Committed

- `.env` files or any real credentials, database passwords, API keys or JWT secrets
- `node_modules/`
- Build output, `.expo/`, native `android/` and `ios/` folders
- Personal editor configuration
- Large binary files or dataset dumps

If a secret is committed by accident, tell the team immediately and rotate it. Deleting it in a later commit does not remove it from the history.
