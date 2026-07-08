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
```

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
├── tests/                  ← Tests (organized by features)
│   ├── api/
│   │   └── api.spec.ts     API tests
│   ├── auth.setup.ts       Global setup: saves storageState
│   ├── features/
│   │   └── login.spec.ts   Login page tests
│   │   └── inventory.spec.ts Catalog tests (sorting, cart)
│   │   └── cart.spec.ts      Cart tests
│   └── checkout.spec.ts    Checkout process tests
│
├── .auth/                  ← Generated storageState files (.gitignore)
│   └── standard.json
│
├── playwright.config.ts
└── package.json
```
