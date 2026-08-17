/**
 * helpers/scripts/generateTests/features.ts
 *
 * Feature descriptions sent to Groq as context.
 * Add a new key here to support generating tests for additional pages.
 */

import { FeatureKey } from './types'

export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {

  login: `
    Login page saucedemo.com (URL: https://www.saucedemo.com)

    Locators (via getByTestId unless noted):
      - username input      → data-test="username"
      - password input      → data-test="password"
      - login button        → data-test="login-button"
      - error message       → data-test="error"
      - error dismiss btn   → data-test="error-button"
      - credentials hint    → #login_credentials  (CSS id)
      - password hint       → .login_password     (CSS class)

    Test users (password for all: secret_sauce):
      - standard_user           → redirects to /inventory.html
      - locked_out_user         → blocked, error contains "locked out"
      - problem_user            → UI bugs (broken images etc.)
      - performance_glitch_user → slow login (~5 sec)

    Validation errors:
      - empty username → "Epic sadface: Username is required"
      - empty password → "Epic sadface: Password is required"
      - wrong password → "Epic sadface: Username and password do not match"
  `,

  inventory: `
    Product catalog page saucedemo.com (/inventory.html)

    Locators:
      - inventory list      → .inventory_list
      - each product        → .inventory_item  (6 total)
      - product name        → .inventory_item_name
      - product price       → .inventory_item_price
      - cart badge          → .shopping_cart_badge
      - cart icon           → .shopping_cart_link
      - sort dropdown       → data-test="product-sort-container"
      - page title          → .title
      - burger menu btn     → #react-burger-menu-btn
      - opened burger menu  → .bm-menu-wrap
      - logout link         → data-test="logout-sidebar-link"

    Product buttons (by slug):
      - add:    data-test="add-to-cart-{slug}"
      - remove: data-test="remove-{slug}"

    Available slugs:
      sauce-labs-backpack, sauce-labs-bike-light, sauce-labs-bolt-t-shirt,
      sauce-labs-fleece-jacket, sauce-labs-onesie, test.allthethings()-t-shirt-(red)

    Sort options: az | za | lohi | hilo
    After addToCart the Add button changes to Remove.
    goToCart() navigates to /cart.html.
  `,

  checkout: `
    Checkout flow saucedemo.com (3 steps)

    Step 1 — /checkout-step-one.html:
      - data-test="firstName"
      - data-test="lastName"
      - data-test="postalCode"
      - data-test="continue"  → proceed to step 2
      - data-test="cancel"    → return to /cart.html
      - data-test="error"     → validation error message
      Errors: "First Name is required" | "Last Name is required" | "Postal Code is required"

    Step 2 — /checkout-step-two.html:
      - .cart_item            → ordered items list
      - .summary_subtotal_label
      - .summary_tax_label
      - .summary_total_label  → format "Total: $X.XX"
      - data-test="finish"    → complete order

    Step 3 — /checkout-complete.html:
      - .complete-header → "Thank you for your order!"
      - .complete-text
      - data-test="back-to-products" → return to catalog
  `,

  api: `
    REST API tests against jsonplaceholder.typicode.com (via the apiClient fixture).

    Resources and counts:
      - posts    → 100 items (userId 1-10)
      - comments → 500 items (postId 1-100), nested under posts/:id/comments
      - users    → 10 items
      - todos    → 200 items (userId 1-10), have a boolean "completed" field
      - albums   → 100 items (userId 1-10)

    All HTTP methods supported: GET, POST, PUT, PATCH, DELETE.
    Write operations (POST/PUT/PATCH/DELETE) are SIMULATED by the server —
    nothing is actually persisted, but it returns realistic statuses/bodies:
      - POST   → 201, echoes the payload back, new resource gets id 101
      - PUT    → 200, echoes the payload back (full replace)
      - PATCH  → 200, echoes only the patched fields merged into the existing resource
      - DELETE → 200, empty object body {}
      - GET a non-existent id (e.g. posts/9999) → 404

    ⚠️ id 101 (and any id above the real range) does NOT actually exist server-side
    — it's only echoed back by POST. Calling PUT/PATCH/DELETE against it (e.g.
    \`apiClient.put('posts/101', ...)\` using the id from a just-created post)
    returns 500, not 200. In a create → update → delete chain, run the create
    step for its own sake, but do the update/delete steps against a real,
    pre-existing id (e.g. posts/1) — never against the id the create step returned.

    Cover: happy path per resource, filtering by query param (e.g.
    posts?userId=1, todos?completed=true), a nested route (posts/:id/comments),
    a 404 case, and a multi-step chain (create → get → update → delete, or
    get user → their posts → comments on the first post).
  `,
}