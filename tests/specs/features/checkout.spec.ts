import { test, expect } from '../../fixtures'
import { CartPage, CheckoutPage } from '../../pages'
import { ShippingInfoBuilder } from '../../builders'

const VALID_SHIPPING = new ShippingInfoBuilder().build()

test.describe('Checkout flow', () => {

    test.describe('Step 1: Shipping info', () => {

        test('empty firstName shows error', async ({ checkoutPage }) => {
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

        test('builder: empty firstName — validation error', async ({ checkoutPage }) => {
            const data = new ShippingInfoBuilder().withEmptyFirstName().build()

            await checkoutPage.firstNameInput.fill(data.firstName)
            await checkoutPage.lastNameInput.fill(data.lastName)
            await checkoutPage.postalCodeInput.fill(data.postalCode)
            await checkoutPage.continueButton.click()

            await expect(checkoutPage.errorMessage).toContainText('First Name is required')
        })

        test('builder: empty lastName — validation error', async ({ checkoutPage }) => {
            const data = new ShippingInfoBuilder().withEmptyLastName().build()

            await checkoutPage.firstNameInput.fill(data.firstName)
            await checkoutPage.lastNameInput.fill(data.lastName)
            await checkoutPage.postalCodeInput.fill(data.postalCode)
            await checkoutPage.continueButton.click()

            await expect(checkoutPage.errorMessage).toContainText('Last Name is required')
        })

        test('builder: empty postalCode — validation error', async ({ checkoutPage }) => {
            const data = new ShippingInfoBuilder().withEmptyPostalCode().build()

            await checkoutPage.firstNameInput.fill(data.firstName)
            await checkoutPage.lastNameInput.fill(data.lastName)
            await checkoutPage.postalCodeInput.fill(data.postalCode)
            await checkoutPage.continueButton.click()

            await expect(checkoutPage.errorMessage).toContainText('Postal Code is required')
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

        test('full purchase cycle with random shipping data', async ({ inventoryPage, page }) => {
            const shipping = new ShippingInfoBuilder().build()

            // 1. Add item
            await inventoryPage.addToCart('sauce-labs-backpack')
            await inventoryPage.goToCart()

            // 2. Go to checkout
            const cart = new CartPage(page)
            await cart.checkout()

            // 3. Fill shipping info
            const checkout = new CheckoutPage(page)
            await checkout.fillShippingInfo(shipping)

            // 4. Complete order
            await checkout.finish()

            // 5. Victory!
            await expect(checkout.successHeader).toHaveText('Thank you for your order!')
        })

    })

})