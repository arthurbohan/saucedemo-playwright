import { test, expect } from '../../fixtures'

const VALID_SHIPPING: import('../../pages').ShippingInfo = {
    firstName: 'Arthur',
    lastName: 'Bokhan',
    postalCode: '220000',
}

test.describe('Checkout flow', () => {

    test.describe('Step 1: Shipping info', () => {

        test('empty name shows error', async ({ checkoutPage }) => {
            await checkoutPage.continueButton.click()
            await expect(checkoutPage.errorMessage).toContainText('First Name is required')
        })

        test('empty postal shows error', async ({ checkoutPage }) => {
            await checkoutPage.firstNameInput.fill('Arthur')
            await checkoutPage.lastNameInput.fill('Bokhan')
            await checkoutPage.continueButton.click()
            await expect(checkoutPage.errorMessage).toContainText('Postal Code is required')
        })

        test('valid data goes to step 2', async ({ checkoutPage, page }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            await expect(page).toHaveURL(/checkout-step-two/)
        })

    })

    test.describe('Step 2: Order overview', () => {

        test('total sum is greater than 0', async ({ checkoutPage }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            const total = await checkoutPage.getSummaryTotal()
            expect(total).toBeGreaterThan(0)
        })

        test('Finish button completes the order', async ({ checkoutPage, page }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            await checkoutPage.finish()
            await expect(page).toHaveURL(/checkout-complete/)
        })

    })

    test.describe('Step 3: Confirmation', () => {

        test('shows success message', async ({ checkoutPage }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            await checkoutPage.finish()
            await expect(checkoutPage.successHeader).toHaveText('Thank you for your order!')
        })

        test('Back to products returns to catalog', async ({ checkoutPage, page }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            await checkoutPage.finish()
            await checkoutPage.backToProducts()
            await expect(page).toHaveURL(/inventory/)
        })

    })

    test.describe('Full E2E: add → buy → return', () => {

        test('full purchase cycle', async ({ inventoryPage, page }) => {
            // 1. Add item
            await inventoryPage.addToCart('sauce-labs-backpack')
            await inventoryPage.goToCart()

            // 2. Go to checkout
            const { CartPage, CheckoutPage } = await import('../../pages')
            const cart = new CartPage(page)
            await cart.checkout()

            // 3. Fill shipping info
            const checkout = new CheckoutPage(page)
            await checkout.fillShippingInfo(VALID_SHIPPING)

            // 4. Complete order
            await checkout.finish()

            // 5. Victory!
            await expect(checkout.successHeader).toHaveText('Thank you for your order!')
        })

    })

})