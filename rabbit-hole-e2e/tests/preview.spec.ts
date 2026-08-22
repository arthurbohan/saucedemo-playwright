import { test, expect } from '../fixtures/pages.fixture'
import { mockGemini } from './helpers/mockGemini'
import { mockLoggedOut } from './helpers/mockAuth'
import { mockPreview } from './helpers/mockPreview'

test('play preview toggles to stop, and playing another track stops the first', async ({ page, explorePage }) => {
  await mockLoggedOut(page)
  await mockGemini(page)
  await mockPreview(page)
  await explorePage.goto()
  await explorePage.follow('Four Tet')
  await expect(explorePage.nodeName).toHaveText('Four Tet')

  await explorePage.playNodePreview()
  await expect(explorePage.nodeStopButton).toBeVisible()

  await explorePage.playBranchPreview()
  await expect(explorePage.branchStopButton()).toBeVisible()
  // node's button reverts to Play once the branch's audio takes over (single global player)
  await expect(explorePage.nodePlayButton).toBeVisible()
})
