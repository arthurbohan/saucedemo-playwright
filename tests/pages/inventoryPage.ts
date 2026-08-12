import { Page } from '@playwright/test'
import { BasePage } from './basePage'

export type ProductSlug =
    | 'sauce-labs-backpack'
    | 'sauce-labs-bike-light'
    | 'sauce-labs-bolt-t-shirt'
    | 'sauce-labs-fleece-jacket'
    | 'sauce-labs-onesie'
    | 'test.allthethings()-t-shirt-(red)'

export type SortOption = 'az' | 'za' | 'lohi' | 'hilo'

const SLUG_NAMES: Record<ProductSlug, string> = {
    'sauce-labs-backpack': 'Sauce Labs Backpack',
    'sauce-labs-bike-light': 'Sauce Labs Bike Light',
    'sauce-labs-bolt-t-shirt': 'Sauce Labs Bolt T-Shirt',
    'sauce-labs-fleece-jacket': 'Sauce Labs Fleece Jacket',
    'sauce-labs-onesie': 'Sauce Labs Onesie',
    'test.allthethings()-t-shirt-(red)': 'Test AllTheThings T-Shirt (Red)',
}

const SORT_LABELS: Record<SortOption, string> = {
    az: 'Name (A to Z)',
    za: 'Name (Z to A)',
    lohi: 'Price (low to high)',
    hilo: 'Price (high to low)',
}

export class InventoryPage extends BasePage {
    constructor(page: Page) {
        super(page)
    }

    // ── Locators ──────────────────────────────────────────────────

    get inventoryList() { return this.page.locator('.inventory_list') }
    get inventoryItems() { return this.page.locator('.inventory_item') }
    get itemNames() { return this.page.locator('.inventory_item_name') }
    get itemPrices() { return this.page.locator('.inventory_item_price') }
    get cartBadge() { return this.page.locator('.shopping_cart_badge') }
    get cartIcon() { return this.page.locator('.shopping_cart_link') }
    get sortDropdown() { return this.page.getByTestId('product-sort-container') }
    get pageTitle() { return this.page.locator('.title') }
    get burgerMenu() { return this.page.locator('#react-burger-menu-btn') }
    get openedBurgerMenu() { return this.page.locator('.bm-menu-wrap') }

    addToCartBtn(slug: ProductSlug) {
        return this.page.getByTestId(`add-to-cart-${slug}`)
    }

    removeBtn(slug: ProductSlug) {
        return this.page.getByTestId(`remove-${slug}`)
    }

    itemByName(name: string) {
        return this.page.locator('.inventory_item').filter({ hasText: name })
    }

    // ── Standard methods ──────────────────────────────────────────

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
        if (!await this.cartBadge.isVisible()) return 0
        return parseInt(await this.cartBadge.innerText())
    }

    async openBurgerMenu() {
        await this.burgerMenu.click()
        await this.openedBurgerMenu.waitFor({ state: 'visible' })
    }

    async logout() {
        await this.openBurgerMenu()
        await this.page.getByTestId('logout-sidebar-link').click()
        await this.page.waitForURL('/')
    }

    // ── Self-healing methods — use BasePage wrappers ──────────────

    async addToCartHealed(slug: ProductSlug) {
        await this.clickHealed(
            this.addToCartBtn(slug),
            `Add to cart button for ${SLUG_NAMES[slug]}`,
        )
    }

    async removeFromCartHealed(slug: ProductSlug) {
        await this.clickHealed(
            this.removeBtn(slug),
            `Remove from cart button for ${SLUG_NAMES[slug]}`,
        )
    }

    async sortByHealed(option: SortOption) {
        await this.selectOptionHealed(
            this.sortDropdown,
            option,
            `Product sort dropdown — select "${SORT_LABELS[option]}"`,
        )
    }

    async goToCartHealed() {
        await this.clickHealed(
            this.cartIcon,
            'Shopping cart icon link in the top navigation bar',
        )
        await this.page.waitForURL('/cart.html')
    }
}