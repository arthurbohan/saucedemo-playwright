import { test, expect } from '../../fixtures'
import { ProductSlug }  from '../../pages'

const ALL_SLUGS: ProductSlug[] = [
    'sauce-labs-backpack',
    'sauce-labs-bike-light',
    'sauce-labs-bolt-t-shirt',
    'sauce-labs-fleece-jacket',
    'sauce-labs-onesie',
    'test.allthethings()-t-shirt-(red)',
]

test.describe('Inventory page', () => {

    test.describe('Product display', () => {

        test('there are exactly 6 products on the page', async ({ inventoryPage }) => {
            await expect(inventoryPage.inventoryItems).toHaveCount(6)
        })

        test('page title is Products', async ({ inventoryPage }) => {
            await expect(inventoryPage.pageTitle).toHaveText('Products')
        })

        test('all 6 expected products are present', async ({ inventoryPage }) => {
            const names = await inventoryPage.getItemNames()
            expect(names).toEqual(expect.arrayContaining([
                'Sauce Labs Backpack',
                'Sauce Labs Bike Light',
                'Sauce Labs Bolt T-Shirt',
                'Sauce Labs Fleece Jacket',
                'Sauce Labs Onesie',
                'Test.allTheThings() T-Shirt (Red)',
            ]))
        })

        test('all prices are greater than zero', async ({ inventoryPage }) => {
            const prices = await inventoryPage.getItemPrices()
            expect(prices.length).toBe(6)
            prices.forEach(price => expect(price).toBeGreaterThan(0))
        })

        test('sort dropdown is visible', async ({ inventoryPage }) => {
            await expect(inventoryPage.sortDropdown).toBeVisible()
        })

    })

    test.describe('Sorting', () => {

        test('A→Z: items in alphabetical order', async ({ inventoryPage }) => {
            await inventoryPage.sortBy('az')
            const names = await inventoryPage.getItemNames()
            expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
        })

        test('Z→A: items in reverse alphabetical order', async ({ inventoryPage }) => {
            await inventoryPage.sortBy('za')
            const names = await inventoryPage.getItemNames()
            expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a)))
        })

        test('Low→High: prices increase', async ({ inventoryPage }) => {
            await inventoryPage.sortBy('lohi')
            const prices = await inventoryPage.getItemPrices()
            for (let i = 1; i < prices.length; i++) {
                expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
            }
        })

        test('High→Low: prices decrease', async ({ inventoryPage }) => {
            await inventoryPage.sortBy('hilo')
            const prices = await inventoryPage.getItemPrices()
            for (let i = 1; i < prices.length; i++) {
                expect(prices[i]).toBeLessThanOrEqual(prices[i - 1])
            }
        })

        test('High→Low: first item is the most expensive', async ({ inventoryPage }) => {
            await inventoryPage.sortBy('hilo')
            const prices = await inventoryPage.getItemPrices()
            expect(prices[0]).toBe(Math.max(...prices))
        })

        // Healed version — survives sort dropdown selector changes
        test('healed: Low→High sort via healed sortDropdown', async ({ inventoryPage }) => {
            await inventoryPage.sortByHealed('lohi')
            const prices = await inventoryPage.getItemPrices()
            for (let i = 1; i < prices.length; i++) {
                expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
            }
        })

    })

    test.describe('Cart: add and remove', () => {

        test('cart badge not visible at start', async ({ inventoryPage }) => {
            expect(await inventoryPage.getCartCount()).toBe(0)
            await expect(inventoryPage.cartBadge).not.toBeVisible()
        })

        test('add backpack → badge = 1', async ({ inventoryPage }) => {
            await inventoryPage.addToCart('sauce-labs-backpack')
            expect(await inventoryPage.getCartCount()).toBe(1)
        })

        test('add 2 items → badge = 2', async ({ inventoryPage }) => {
            await inventoryPage.addToCart('sauce-labs-backpack')
            await inventoryPage.addToCart('sauce-labs-bike-light')
            expect(await inventoryPage.getCartCount()).toBe(2)
        })

        test('add and remove → badge disappears', async ({ inventoryPage }) => {
            await inventoryPage.addToCart('sauce-labs-backpack')
            await inventoryPage.removeFromCart('sauce-labs-backpack')
            expect(await inventoryPage.getCartCount()).toBe(0)
            await expect(inventoryPage.cartBadge).not.toBeVisible()
        })

        test('button changes from Add to Remove after adding', async ({ inventoryPage }) => {
            const slug: ProductSlug = 'sauce-labs-backpack'
            await expect(inventoryPage.addToCartBtn(slug)).toBeVisible()
            await inventoryPage.addToCart(slug)
            await expect(inventoryPage.removeBtn(slug)).toBeVisible()
            await expect(inventoryPage.addToCartBtn(slug)).not.toBeVisible()
        })

        test('add all 6 items → badge = 6', async ({ inventoryPage }) => {
            for (const slug of ALL_SLUGS) {
                await inventoryPage.addToCart(slug)
            }
            expect(await inventoryPage.getCartCount()).toBe(6)
        })

        // Healed versions — survive data-test attribute changes
        test('healed: add backpack → badge = 1', async ({ inventoryPage }) => {
            await inventoryPage.addToCartHealed('sauce-labs-backpack')
            expect(await inventoryPage.getCartCount()).toBe(1)
        })

        test('healed: add and remove via healed methods', async ({ inventoryPage }) => {
            await inventoryPage.addToCartHealed('sauce-labs-backpack')
            expect(await inventoryPage.getCartCount()).toBe(1)
            await inventoryPage.removeFromCartHealed('sauce-labs-backpack')
            expect(await inventoryPage.getCartCount()).toBe(0)
        })

    })

    test.describe('Navigation', () => {

        test('cart icon goes to /cart.html', async ({ inventoryPage, page }) => {
            await inventoryPage.goToCart()
            await expect(page).toHaveURL(/cart/)
        })

        test('healed: cart icon goes to /cart.html', async ({ inventoryPage, page }) => {
            await inventoryPage.goToCartHealed()
            await expect(page).toHaveURL(/cart/)
        })

        test('itemByName returns the correct element', async ({ inventoryPage }) => {
            const item = inventoryPage.itemByName('Sauce Labs Backpack')
            await expect(item).toBeVisible()
            await expect(item).toContainText('$29.99')
        })

    })

    test.describe('Burger menu / Logout', () => {

        test('burger menu opens', async ({ inventoryPage }) => {
            await inventoryPage.openBurgerMenu()
            await expect(inventoryPage.openedBurgerMenu).toBeVisible()
        })

        test('logout returns to login page', async ({ inventoryPage, page }) => {
            await inventoryPage.logout()
            await expect(page).toHaveURL('https://www.saucedemo.com/')
            await expect(page.getByTestId('login-button')).toBeVisible()
        })

    })

})