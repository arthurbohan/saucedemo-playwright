import { Page } from '@playwright/test'

export type MockUser = { id: number, email: string, name: string }

export async function mockLoggedIn(page: Page, user: MockUser = { id: 1, email: 'a@b.com', name: 'Test User' }) {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user }) })
  )
}

export async function mockLoggedOut(page: Page) {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'not authenticated' }) })
  )
}

// Only needed alongside mockLoggedIn — useCrate's login-sync effect POSTs
// the whole local crate once per session and adopts whatever the server
// echoes back. Without this, that POST hits the real /api/crate route.
export async function mockCrateSync(page: Page) {
  await page.route('**/api/crate', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const body = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: body?.items ?? [] }) })
  })

  await page.route('**/api/crate/*', async (route) => {
    if (route.request().method() !== 'DELETE') return route.continue()
    await route.fulfill({ status: 204 })
  })
}
