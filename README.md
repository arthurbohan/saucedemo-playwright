# 🧪 Saucedemo — Playwright Fixtures Practice

Проект с правильной структурой для изучения Playwright Fixtures на реальном сайте.

---

## 🚀 Быстрый старт

```bash
npm install
npx playwright install chromium
npm test
```

---

## 📁 Структура проекта

```
saucedemo-playwright/
│
├── pages/                          ← Page Objects (один класс = один файл)
│   ├── LoginPage.ts                   Форма логина
│   ├── InventoryPage.ts               Каталог товаров
│   ├── CartPage.ts                    Корзина
│   ├── CheckoutPage.ts                Оформление заказа
│   └── index.ts                       Barrel-экспорт (import из одного места)
│
├── fixtures/                       ← Fixtures (один файл = одна зона ответственности)
│   ├── auth.fixture.ts                Авторизация через localStorage
│   ├── pages.fixture.ts               Page Objects → fixtures (зависит от auth)
│   └── index.ts                       Финальный mergeTests + export { test, expect }
│
├── tests/                          ← Тесты (разбиты по фичам)
│   ├── auth.setup.ts                  Глобальный setup: сохраняет storageState
│   ├── login/
│   │   └── login.spec.ts              Тесты страницы логина
│   ├── inventory/
│   │   └── inventory.spec.ts          Тесты каталога (сортировка, корзина)
│   ├── cart/
│   │   └── cart.spec.ts               Тесты корзины
│   └── checkout/
│       └── checkout.spec.ts           Тесты оформления заказа
│
├── .auth/                          ← Сгенерированные storageState файлы (.gitignore)
│   └── standard.json
│
├── playwright.config.ts
└── package.json
```

---

## 👤 Пользователи saucedemo

| Username | Пароль | Особенность |
|---|---|---|
| `standard_user` | `secret_sauce` | Всё работает нормально |
| `locked_out_user` | `secret_sauce` | Заблокирован, не может войти |
| `problem_user` | `secret_sauce` | Баги в UI (сломанные картинки) |
| `performance_glitch_user` | `secret_sauce` | Медленный логин (~5 сек) |
