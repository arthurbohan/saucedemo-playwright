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
}