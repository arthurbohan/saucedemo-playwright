import { test as base, mergeTests } from '@playwright/test'
import { authFixtures, AuthFixtures } from './auth.fixture'
import { LoginPage } from '../pages/loginPage'
import { InventoryPage } from '../pages/inventoryPage'
import { CartPage } from '../pages/cartPage'
import { CheckoutPage } from '../pages/checkoutPage'
import { ProductSlug } from '../pages/inventoryPage'

type PageFixtures = {
    loginPage: LoginPage
    inventoryPage: InventoryPage
    cartPage: CartPage
    filledCartPage: CartPage
    checkoutPage: CheckoutPage
}

const pageTest = base.extend<PageFixtures & AuthFixtures>({

    loginPage: async ({ page }, use) => {
        const lp = new LoginPage(page)
        await lp.goto()
        await use(lp)
    },

    inventoryPage: async ({ standardPage }, use) => {
        await use(new InventoryPage(standardPage))
    },

    cartPage: async ({ standardPage }, use) => {
        const cp = new CartPage(standardPage)
        await cp.goto()
        await use(cp)
    },

    filledCartPage: async ({ standardPage }, use) => {
        const inventory = new InventoryPage(standardPage)
        await inventory.addToCart('sauce-labs-backpack' as ProductSlug)
        await inventory.addToCart('sauce-labs-bike-light' as ProductSlug)
        await inventory.goToCart()
        await use(new CartPage(standardPage))
    },

    checkoutPage: async ({ standardPage }, use) => {
        const inventory = new InventoryPage(standardPage)
        await inventory.addToCart('sauce-labs-backpack' as ProductSlug)
        await inventory.goToCart()
        const cart = new CartPage(standardPage)
        await cart.checkout()
        await use(new CheckoutPage(standardPage))
    },

})

export const pageFixtures = mergeTests(authFixtures, pageTest)