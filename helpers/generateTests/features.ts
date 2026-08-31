/**
 * helpers/scripts/generateTests/features.ts
 *
 * Feature descriptions sent to Groq as context.
 * Add a new key here to support generating tests for additional pages.
 *
 * UI features (login/inventory/checkout) deliberately do NOT restate
 * locators, URLs, or anything else already visible in the real Page Object
 * source — buildSystemContextUI() in helpers/claude/prompts/generateTests.ts
 * reads those files directly now, so duplicating them here would just be a
 * second copy to drift out of sync (which is exactly how checkout's
 * cancelButton fact went stale here while the Page Object's own JSDoc had
 * the correct, current answer). What belongs here is only what genuinely
 * isn't in that source: exact copy text, and live-app behavior that no
 * amount of reading the test code could reveal — same idea as `api`
 * below's id-101 gotcha, which has no Page Object to read at all.
 */

import { FeatureKey } from './types'

export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {

  login: `
    Login page saucedemo.com (URL: https://www.saucedemo.com)

    Per-user behavior after submitting — live-app behavior, not visible in
    LoginPage's source (password for every user: secret_sauce):
      - standard_user           → redirects to /inventory.html
      - locked_out_user         → blocked, error contains "locked out"
      - problem_user            → UI bugs (broken images etc.)
      - performance_glitch_user → slow login (~5 sec)

    Validation error text:
      - empty username → "Epic sadface: Username is required"
      - empty password → "Epic sadface: Password is required"
      - wrong password → "Epic sadface: Username and password do not match"
  `,

  inventory: `
    Product catalog page saucedemo.com (/inventory.html)

    Add/Remove is ONE toggle button per product, not two separate elements —
    clicking it swaps its data-test between add-to-cart-{slug} and
    remove-{slug}. This isn't visible from InventoryPage's source and
    matters for self-healing: ANY *Healed method (including isVisibleHealed)
    still tries to heal when the exact locator doesn't match — it does not
    become a safe "just check, don't heal" call. For a scenario like "add
    the same item twice" or "remove an item never added," where the button
    you're checking for genuinely may not exist in that state, check the
    plain locator directly instead — \`await inventoryPage.addToCartBtn(slug).isVisible()\`,
    not \`isVisibleHealed(...)\` — or assert via getCartCount().
  `,

  checkout: `
    Checkout flow saucedemo.com (3 steps: /checkout-step-one.html →
    /checkout-step-two.html → /checkout-complete.html)

    Validation error text (step one):
      "First Name is required" | "Last Name is required" | "Postal Code is required"

    Success text (step three): "Thank you for your order!"
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