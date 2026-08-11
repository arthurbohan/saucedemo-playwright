import { Page } from '@playwright/test'
import { BasePage } from './basePage'
import { heal } from '../../helpers/selfHealing/core'

export type ProductSlug =
    | 'sauce-labs-backpack'
    | 'sauce-labs-bike-light'
    | 'sauce-labs-bolt-t-shirt'
    | 'sauce-labs-fleece-jacket'
    | 'sauce-labs-onesie'
    | 'test.allthethings()-t-shirt-(red)'

export type SortOption = 'az' | 'za' | 'lohi' | 'hilo'

export class InventoryPage extends BasePage {
    constructor(page: Page) {
        super(page)
    }

    get inventoryList() {
        return this.page.locator('.inventory_list')
    }
    get inventoryItems() {
        return this.page.locator('.inventory_item')
    }
    get itemNames() {
        return this.page.locator('.inventory_item_name')
    }
    get itemPrices() {
        return this.page.locator('.inventory_item_price')
    }
    get cartBadge() {
        return this.page.locator('.shopping_cart_badge')
    }
    get cartIcon() {
        return this.page.locator('.shopping_cart_link')
    }
    get sortDropdown() {
        return this.page.getByTestId('product-sort-container')
    }
    get pageTitle() {
        return this.page.locator('.title')
    }
    get burgerMenu() {
        return this.page.locator('#react-burger-menu-btn')
    }
    get openedBurgerMenu() {
        return this.page.locator('.bm-menu-wrap')
    }

    addToCartBtn(slug: ProductSlug) {
        return this.page.getByTestId(`add-to-cart-${slug}`)
    }

    removeBtn(slug: ProductSlug) {
        return this.page.getByTestId(`remove-${slug}`)
    }

    itemByName(name: string) {
        return this.page.locator('.inventory_item').filter({ hasText: name })
    }

    async goto() {
        await this.page.goto('/inventory.html')
        await this.inventoryList.waitFor({ state: 'visible' })
    }

    async addToCart(slug: ProductSlug) {
        await this.addToCartBtn(slug).click()
    }

    async removeFromCart(slug: ProductSlug) {
        await this.removeBtn(slug).click()
    }

    async sortBy(option: SortOption) {
        await this.sortDropdown.selectOption(option)
    }

    async goToCart() {
        await this.cartIcon.click()
        await this.page.waitForURL('/cart.html')
    }

    async getItemNames(): Promise<string[]> {
        return this.itemNames.allTextContents()
    }

    async getItemPrices(): Promise<number[]> {
        const texts = await this.itemPrices.allTextContents()
        return texts.map(t => parseFloat(t.replace('$', '')))
    }

    async getCartCount(): Promise<number> {
        const badge = this.cartBadge
        if (!await badge.isVisible()) return 0
        return parseInt(await badge.innerText())
    }

    async openBurgerMenu() {
        await this.burgerMenu.click()
        await this.page.locator('.bm-menu-wrap').waitFor({ state: 'visible' })
    }

    async logout() {
        await this.openBurgerMenu()
        await this.page.getByTestId('logout-sidebar-link').click()
        await this.page.waitForURL('/')
    }

    async addToCartHealed(slug: ProductSlug) {
        const original = this.addToCartBtn(slug)

        // Product name for the AI description (slug → readable name)
        const name = slug
            .split('-')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')

        const { locator, healed, newSelector } = await heal(
            this.page,
            original,
            `Add to cart button for ${name}`,
        )

        await locator.click()

        // If healing happened, log it prominently so the dev can fix the POM
        if (healed) {
            console.warn(
                `\n🔧 [InventoryPage.addToCartHealed]\n` +
                `   Slug:         ${slug}\n` +
                `   Healed to:    ${newSelector}\n` +
                `   Action:       Update addToCartBtn() in InventoryPage.ts\n`
            )
        }
    }
}