import { Page } from '@playwright/test'
import { BasePage } from './basePage'

export class CartPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  get cartItems() {
    return this.page.locator('.cart_item')
  }
  get itemNames() {
    return this.page.locator('.inventory_item_name')
  }
  get itemPrices() {
    return this.page.locator('.inventory_item_price')
  }
  get itemQuantities() {
    return this.page.locator('.cart_quantity')
  }
  get checkoutButton() {
    return this.page.getByTestId('checkout')
  }
  get continueShoppingButton() {
    return this.page.getByTestId('continue-shopping')
  }

  removeItemBtn(name: string) {
    // Locate the delete button associated with a specific product name
    return this.page.locator('.cart_item')
      .getByTestId(`remove-${name}`)
  }

  async goto() {
    await this.page.goto('/cart.html')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async getItemCount(): Promise<number> {
    return this.cartItems.count()
  }

  async getItemNames(): Promise<string[]> {
    return this.itemNames.allTextContents()
  }

  async getItemPrices(): Promise<number[]> {
    const texts = await this.itemPrices.allTextContents()
    return texts.map(t => parseFloat(t.replace('$', '')))
  }

  async removeItem(name: string) {
    await this.removeItemBtn(name).click()
  }

  async checkout() {
    await this.checkoutButton.click()
    await this.page.waitForURL('/checkout-step-one.html')
  }

  async continueShopping() {
    await this.continueShoppingButton.click()
    await this.page.waitForURL('/inventory.html')
  }

  async isEmpty(): Promise<boolean> {
    return (await this.getItemCount()) === 0
  }
}