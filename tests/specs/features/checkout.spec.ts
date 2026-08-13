import { test, expect }           from '../../fixtures'
import { CartPage, CheckoutPage }  from '../../pages'
import { ShippingInfo }            from '../../pages'
import { ShippingInfoBuilder }     from '../../builders'

const VALID_SHIPPING: ShippingInfo = new ShippingInfoBuilder().build()

test.describe('Checkout flow', () => {

    test.describe('Step 1: Shipping info', () => {

        test('empty firstName shows error', async ({ checkoutPage }) => {
            await checkoutPage.continueButton.click()
            await expect(checkoutPage.errorMessage).toContainText('First Name is required1')
        })

        test('empty lastName shows error', async ({ checkoutPage }) => {
            await checkoutPage.firstNameInput.fill('Arthur')
            await checkoutPage.continueButton.click()
            await expect(checkoutPage.errorMessage).toContainText('Last Name is required')
        })

        test('empty postalCode shows error', async ({ checkoutPage }) => {
            await checkoutPage.firstNameInput.fill('Arthur')
            await checkoutPage.lastNameInput.fill('Bokhan')
            await checkoutPage.continueButton.click()
            await expect(checkoutPage.errorMessage).toContainText('Postal Code is required')
        })

        test('valid data goes to step 2', async ({ checkoutPage, page }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            await expect(page).toHaveURL(/checkout-step-two/)
        })

        // Healed — survives selector changes on any form field
        test('healed: valid data goes to step 2 via healed fields', async ({ checkoutPage, page }) => {
            await checkoutPage.fillShippingInfoHealed(VALID_SHIPPING)
            await expect(page).toHaveURL(/checkout-step-two/)
        })

        test.describe('Builder: negative scenarios', () => {

            test('empty firstName via builder — validation error', async ({ checkoutPage }) => {
                const data = new ShippingInfoBuilder().withEmptyFirstName().build()
                await checkoutPage.firstNameInput.fill(data.firstName)
                await checkoutPage.lastNameInput.fill(data.lastName)
                await checkoutPage.postalCodeInput.fill(data.postalCode)
                await checkoutPage.continueButton.click()
                await expect(checkoutPage.errorMessage).toContainText('First Name is required')
            })

            test('empty lastName via builder — validation error', async ({ checkoutPage }) => {
                const data = new ShippingInfoBuilder().withEmptyLastName().build()
                await checkoutPage.firstNameInput.fill(data.firstName)
                await checkoutPage.lastNameInput.fill(data.lastName)
                await checkoutPage.postalCodeInput.fill(data.postalCode)
                await checkoutPage.continueButton.click()
                await expect(checkoutPage.errorMessage).toContainText('Last Name is required')
            })

            test('empty postalCode via builder — validation error', async ({ checkoutPage }) => {
                const data = new ShippingInfoBuilder().withEmptyPostalCode().build()
                await checkoutPage.firstNameInput.fill(data.firstName)
                await checkoutPage.lastNameInput.fill(data.lastName)
                await checkoutPage.postalCodeInput.fill(data.postalCode)
                await checkoutPage.continueButton.click()
                await expect(checkoutPage.errorMessage).toContainText('Postal Code is required')
            })

        })

    })

    test.describe('Step 2: Order overview', () => {

        test('summary shows the correct item', async ({ checkoutPage }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            await expect(checkoutPage.summaryItems).toHaveCount(1)
        })

        test('subtotal, tax and total labels are visible', async ({ checkoutPage }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            await expect(checkoutPage.summarySubtotal).toBeVisible()
            await expect(checkoutPage.summaryTax).toBeVisible()
            await expect(checkoutPage.summaryTotal).toBeVisible()
        })

        test('total is greater than 0', async ({ checkoutPage }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            const total = await checkoutPage.getSummaryTotal()
            expect(total).toBeGreaterThan(0)
        })

        test('total equals subtotal + tax', async ({ checkoutPage }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            const subtotalText = await checkoutPage.getTextOf(checkoutPage.summarySubtotal)
            const taxText      = await checkoutPage.getTextOf(checkoutPage.summaryTax)
            const totalText    = await checkoutPage.getTextOf(checkoutPage.summaryTotal)
            const subtotal = parseFloat(subtotalText.replace(/[^0-9.]/g, ''))
            const tax      = parseFloat(taxText.replace(/[^0-9.]/g, ''))
            const total    = parseFloat(totalText.replace(/[^0-9.]/g, ''))
            expect(total).toBeCloseTo(subtotal + tax, 1)
        })

        test('Finish button is visible', async ({ checkoutPage }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            await expect(checkoutPage.finishButton).toBeVisible()
        })

        test('Finish button completes the order', async ({ checkoutPage, page }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            await checkoutPage.finish()
            await expect(page).toHaveURL(/checkout-complete/)
        })

        // Healed version — survives Finish button selector changes
        test('healed: Finish via healed button', async ({ checkoutPage, page }) => {
            await checkoutPage.fillShippingInfoHealed(VALID_SHIPPING)
            await checkoutPage.finishHealed()
            await expect(page).toHaveURL(/checkout-complete/)
        })

        // Healed total — survives summary label selector changes
        test('healed: total is greater than 0 via healed label', async ({ checkoutPage }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            const total = await checkoutPage.getSummaryTotalHealed()
            expect(total).toBeGreaterThan(0)
        })

    })

    test.describe('Step 3: Confirmation', () => {

        test('shows success message', async ({ checkoutPage }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            await checkoutPage.finish()
            await expect(checkoutPage.successHeader).toHaveText('Thank you for your order!')
        })

        test('isOrderComplete() returns true', async ({ checkoutPage }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            await checkoutPage.finish()
            expect(await checkoutPage.isOrderComplete()).toBe(true)
        })

        test('Back to products returns to catalog', async ({ checkoutPage, page }) => {
            await checkoutPage.fillShippingInfo(VALID_SHIPPING)
            await checkoutPage.finish()
            await checkoutPage.backToProducts()
            await expect(page).toHaveURL(/inventory/)
        })

        // Healed version — survives Back to Products button selector changes
        test('healed: Back to products via healed button', async ({ checkoutPage, page }) => {
            await checkoutPage.fillShippingInfoHealed(VALID_SHIPPING)
            await checkoutPage.finishHealed()
            await checkoutPage.backToProductsHealed()
            await expect(page).toHaveURL(/inventory/)
        })

    })

    test.describe('Full E2E: add → buy → return', () => {

        test('full purchase cycle with random shipping data', async ({ inventoryPage, page }) => {
            const shipping: ShippingInfo = new ShippingInfoBuilder().build()

            await inventoryPage.addToCart('sauce-labs-backpack')
            await inventoryPage.goToCart()

            const cart = new CartPage(page)
            await cart.checkout()

            const checkout = new CheckoutPage(page)
            await checkout.fillShippingInfo(shipping)
            await checkout.finish()

            await expect(checkout.successHeader).toHaveText('Thank you for your order!')
        })

        // Full healed flow — every critical interaction uses a healed method
        test('healed: full purchase cycle with all healed methods', async ({ inventoryPage, page }) => {
            const shipping: ShippingInfo = new ShippingInfoBuilder().build()

            await inventoryPage.addToCartHealed('sauce-labs-backpack')
            await inventoryPage.goToCartHealed()

            const cart = new CartPage(page)
            await cart.checkoutHealed()

            const checkout = new CheckoutPage(page)
            await checkout.fillShippingInfoHealed(shipping)
            await checkout.finishHealed()
            await checkout.backToProductsHealed()

            await expect(page).toHaveURL(/inventory/)
        })

    })

})