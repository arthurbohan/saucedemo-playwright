// TEMPORARY — for demoing the AI failure analysis / Manual Verdict pipeline.
// Delete this file once the demo run is done; it is not part of the real suite.
import { test, expect } from '../../fixtures'

test.describe('DEMO: intentional failure for AI analysis', () => {
  test('DEMO — cart badge shows an impossible count', async ({ inventoryPage }) => {
    await inventoryPage.addToCart('sauce-labs-backpack')
    const count = await inventoryPage.getCartCount()
    expect(count).toBe(999)
  })
})
