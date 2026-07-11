# 🧪 Saucedemo/Jsonplaceholder — Playwright Practice

A structured project designed for learning Playwright on a real website:

 💻 UI / E2E tests (Saucedemo)
 🔌 API tests (JSONPlaceholder)

## 🚀 Quick Start

```bash
npm install
npx playwright install chromium
npm test test:api 
npm test test:e2e
npm test #all projects
```

## 📦 Scripts

```bash
# Playwright HTML report
npm run report:pw

# Allure report
npm run allure:gen
npm run allure:open
npm run allure:report
```

## 🎯 Playwright Projects

The configuration is split into two independent projects with different `baseURL`:

| Project | testDir | baseURL | Description |
|---|---|---|---|
| `setup` | `auth.setup.ts` | saucedemo.com | Logs in once, saves `.auth/standard.json` |
| `sd-e2e` | `tests/features/` | saucedemo.com | UI tests, start with an active session |
| `jp-api` | `tests/api/` | jsonplaceholder.typicode.com | API tests, headless (no browser) |

---

## 📁 Project Structure

```saucedemo-playwright/
│
├── pages/                  ← Page Objects (one class = one file)
│   ├── LoginPage.ts        Login form
│   ├── InventoryPage.ts    Product catalog
│   ├── CartPage.ts         Shopping cart
│   ├── CheckoutPage.ts     Checkout page
│   └── index.ts            Barrel export (import everything from one place)
│
├── fixtures/               ← Fixtures (one file = one area of responsibility)
│   ├── auth.fixture.ts     Authorization via localStorage
│   ├── api.fixture.ts      API helper for https://jsonplaceholder.typicode.com 
│   ├── pages.fixture.ts    Page Objects → fixtures (depends on auth)
│   └── index.ts            Final mergeTests + export { test, expect }
│
├── builders/                      ← Data Builders
│   ├── ShippingInfoBuilder.ts     Checkout form data
│   ├── PostBuilder.ts             /posts request data
│   └── index.ts                   Barrel-export
│
├── types/                         ← TypeScrip types
│   └── api.types.ts               Post, Comment, User, Todo    
│
├── specs/                         ← Tests (organized by features)
│   ├── api/
│   │   └── api.spec.ts            API tests
│   ├── auth.setup.ts              Global setup: saves storageState
│   └── features/
│       ├── login.spec.ts          Login page tests
│       ├── inventory.spec.ts      Catalog tests (sorting, cart)
│       ├── cart.spec.ts           Cart tests
│       └── checkout.spec.ts       Checkout process tests
│
├── .auth/                         ← Generated storageState files (.gitignore)
│   └── standard.json
│
├── allure-results/                 
├── allure-report/                
├── playwright.config.ts
├── package.json
└── .gitignore
```

## 🔄 CI/CD — GitHub Actions

```.github/
git push
↓
GitHub Actions
├── test-e2e
│     ├── checkout code
│     ├── setup Node.js 24
│     ├── npm ci
│     ├── npx playwright install chromium --with-deps
│     ├── npm run test:e2e
│     └── upload artifacts
│
└── test-api
      ├── checkout code
      ├── setup Node.js 24
      ├── npm ci
      ├── npm run test:api
      └── upload artifacts
```
