import { test, expect } from '../../fixtures'

test.describe('Cart page', () => {

    test.describe('Empty cart', () => {

        test('empty cart has no items', async ({ cartPage }) => {
            expect(await cartPage.getItemCount()).toBe(0)
        })

        test('isEmpty() returns true', async ({ cartPage }) => {
            expect(await cartPage.isEmpty()).toBe(true)
        })

        test('Checkout button is visible in empty cart', async ({ cartPage }) => {
            await expect(cartPage.checkoutButton).toBeVisible()
        })

        test('Continue Shopping button is visible', async ({ cartPage }) => {
            await expect(cartPage.continueShoppingButton).toBeVisible()
        })

        test('Continue Shopping goes to /inventory.html', async ({ cartPage, page }) => {
            await cartPage.continueShopping()
            await expect(page).toHaveURL(/inventory/)
        })

        // Healed version — survives selector changes on Continue Shopping
        test('healed: Continue Shopping via healed button', async ({ cartPage, page }) => {
            await cartPage.continueShoppingHealed()
            await expect(page).toHaveURL(/inventory/)
        })

    })

    test.describe('Cart with items', () => {

        test('cart has exactly 2 items', async ({ filledCartPage }) => {
            expect(await filledCartPage.getItemCount()).toBe(2)
        })

        test('isEmpty() returns false', async ({ filledCartPage }) => {
            expect(await filledCartPage.isEmpty()).toBe(false)
        })

        test('cart shows the correct items', async ({ filledCartPage }) => {
            const names = await filledCartPage.getItemNames()
            expect(names).toContain('Sauce Labs Backpack')
            expect(names).toContain('Sauce Labs Bike Light')
        })

        test('all item prices are greater than 0', async ({ filledCartPage }) => {
            const prices = await filledCartPage.getItemPrices()
            prices.forEach(price => expect(price).toBeGreaterThan(0))
        })

        test('each item has quantity 1', async ({ filledCartPage }) => {
            const quantities = await filledCartPage.itemQuantities.allTextContents()
            quantities.forEach(q => expect(q).toBe('1'))
        })

    })

    test.describe('Remove items', () => {

        test('remove backpack — only bike light remains', async ({ filledCartPage }) => {
            await filledCartPage.removeItem('Sauce Labs Backpack')
            expect(await filledCartPage.getItemCount()).toBe(1)
            const names = await filledCartPage.getItemNames()
            expect(names).not.toContain('Sauce Labs Backpack')
            expect(names).toContain('Sauce Labs Bike Light')
        })

        test('remove all items — cart becomes empty', async ({ filledCartPage }) => {
            await filledCartPage.removeItem('Sauce Labs Backpack')
            await filledCartPage.removeItem('Sauce Labs Bike Light')
            expect(await filledCartPage.isEmpty()).toBe(true)
        })

    })

    test.describe('Checkout navigation', () => {

        test('Checkout button goes to /checkout-step-one.html', async ({ filledCartPage, page }) => {
            await filledCartPage.checkout()
            await expect(page).toHaveURL(/checkout-step-one/)
        })

        // Healed version — survives checkout button selector changes
        test('healed: Checkout via healed button', async ({ filledCartPage, page }) => {
            await filledCartPage.checkoutHealed()
            await expect(page).toHaveURL(/checkout-step-one/)
        })

    })

})