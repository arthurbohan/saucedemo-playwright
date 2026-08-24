import { test, expect } from '../../fixtures'

test.describe('Item detail page', () => {

    test.describe('Product info', () => {

        test('shows the correct name, description and price', async ({ itemDetailPage }) => {
            await expect(itemDetailPage.name).toHaveText('Sauce Labs Backpack')
            await expect(itemDetailPage.description).not.toBeEmpty()
            expect(await itemDetailPage.getPrice()).toBe(29.99)
        })

        test('Add to cart button is visible, Remove button is not', async ({ itemDetailPage }) => {
            await expect(itemDetailPage.addToCartBtn).toBeVisible()
            await expect(itemDetailPage.removeBtn).not.toBeVisible()
        })

    })

    test.describe('Add / remove from cart', () => {

        test('add to cart → badge = 1 and button becomes Remove', async ({ itemDetailPage }) => {
            await itemDetailPage.addToCart()
            expect(await itemDetailPage.getCartCount()).toBe(1)
            await expect(itemDetailPage.removeBtn).toBeVisible()
            await expect(itemDetailPage.addToCartBtn).not.toBeVisible()
        })

        test('add then remove → badge disappears and button reverts to Add to cart', async ({ itemDetailPage }) => {
            await itemDetailPage.addToCart()
            await itemDetailPage.removeFromCart()
            expect(await itemDetailPage.getCartCount()).toBe(0)
            await expect(itemDetailPage.addToCartBtn).toBeVisible()
        })

    })

    test.describe('Navigation', () => {

        test('opening a product from the inventory list lands on its detail page', { tag: '@smoke' }, async ({ inventoryPage, page }) => {
            await inventoryPage.openItem('Sauce Labs Bike Light')
            await expect(page).toHaveURL(/inventory-item\.html\?id=\d+/)
            await expect(page.getByTestId('inventory-item-name')).toHaveText('Sauce Labs Bike Light')
        })

        test('Back to products returns to /inventory.html', async ({ itemDetailPage, page }) => {
            await itemDetailPage.goBack()
            await expect(page).toHaveURL(/inventory\.html/)
        })

        test('cart contents persist across Back to products navigation', async ({ itemDetailPage, page }) => {
            await itemDetailPage.addToCart()
            await itemDetailPage.goBack()
            await expect(page.locator('.shopping_cart_badge')).toHaveText('1')
        })

    })

})
