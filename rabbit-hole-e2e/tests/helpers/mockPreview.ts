import { Page } from '@playwright/test'

// A data: URI avoids any real network call from `new Audio(url)` inside the
// container — the app doesn't await play() succeeding (see audioPlayer.js),
// so the UI's Play/Stop state doesn't depend on the audio actually decoding.
const FAKE_AUDIO = 'data:audio/mp4;base64,AAAAHGZ0eXBpc29t'

export async function mockPreview(page: Page, { url = FAKE_AUDIO }: { url?: string } = {}) {
  await page.route('**/api/preview*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ previewUrl: url }) })
  )
}

export async function mockPreviewUnavailable(page: Page) {
  await page.route('**/api/preview*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ previewUrl: null }) })
  )
}
