import { test, expect } from '../../fixtures'

test.describe('Cart page', () => {

    test.describe('Empty cart', () => {

        test('empty cart has no items', async ({ cartPage }) => {
            expect(await cartPage.getItemCount()).toBe(0)
        })

        test('Continue Shopping button goes to /inventory.html', async ({ cartPage, page }) => {
            await cartPage.continueShopping()
            await expect(page).toHaveURL(/inventory/)
        })

    })

    test.describe('Cart with items', () => {

        test('cart has exactly 2 items', async ({ filledCartPage }) => {
            expect(await filledCartPage.getItemCount()).toBe(2)
        })

        test('cart shows the correct items', async ({ filledCartPage }) => {
            const names = await filledCartPage.getItemNames()
            expect(names).toContain('Sauce Labs Backpack')
            expect(names).toContain('Sauce Labs Bike Light')
        })

        test('can remove item directly from cart', async ({ filledCartPage }) => {
            expect(await filledCartPage.getItemCount()).toBe(2)

            await filledCartPage.removeItem('sauce-labs-backpack')

            expect(await filledCartPage.getItemCount()).toBe(1)
            const names = await filledCartPage.getItemNames()
            expect(names).not.toContain('Sauce Labs Backpack')
            expect(names).toContain('Sauce Labs Bike Light')
        })

        test('Checkout button goes to /checkout-step-one.html', async ({ filledCartPage, page }) => {
            await filledCartPage.checkout()
            await expect(page).toHaveURL(/checkout-step-one/)
        })

    })

})