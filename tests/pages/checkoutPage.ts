import { Page } from '@playwright/test'
import { BasePage } from './basePage'

export interface ShippingInfo {
  firstName: string
  lastName: string
  postalCode: string
}

export class CheckoutPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // ── Step 1: Shipping Information ─────────────────────────────────

  get firstNameInput()  { return this.page.getByTestId('firstName') }
  get lastNameInput()   { return this.page.getByTestId('lastName') }
  get postalCodeInput() { return this.page.getByTestId('postalCode') }
  get continueButton()  { return this.page.getByTestId('continue') }
  get cancelButton()    { return this.page.getByTestId('cancel') }
  get errorMessage()    { return this.page.getByTestId('error') }

  // ── Step 2: Order Review ──────────────────────────────────────

  get summaryItems()      { return this.page.locator('.cart_item') }
  get summarySubtotal()   { return this.page.locator('.summary_subtotal_label') }
  get summaryTax()        { return this.page.locator('.summary_tax_label') }
  get summaryTotal()      { return this.page.locator('.summary_total_label') }
  get finishButton()      { return this.page.getByTestId('finish') }

  // ── Step 3: Confirmation ─────────────────────────────────────

  get successHeader()  { return this.page.locator('.complete-header') }
  get successText()    { return this.page.locator('.complete-text') }
  get backHomeButton() { return this.page.getByTestId('back-to-products') }

  // ── Methods ───────────────────────────────────────────────────

  async goto() {
    // Checkout is only available after adding a product - not usually used directly
    await this.page.goto('/checkout-step-one.html')
  }

  async fillShippingInfo(info: ShippingInfo) {
    await this.firstNameInput.fill(info.firstName)
    await this.lastNameInput.fill(info.lastName)
    await this.postalCodeInput.fill(info.postalCode)
    await this.continueButton.click()
    await this.page.waitForURL('/checkout-step-two.html')
  }

  async getSummaryTotal(): Promise<number> {
    const text = await this.getTextOf(this.summaryTotal)
    // Text format: 'Total: $32.39' → 32.39
    return parseFloat(text.replace(/[^0-9.]/g, ''))
  }

  async finish() {
    await this.finishButton.click()
    await this.page.waitForURL('/checkout-complete.html')
  }

  async isOrderComplete(): Promise<boolean> {
    return this.successHeader.isVisible()
  }

  async backToProducts() {
    await this.backHomeButton.click()
    await this.page.waitForURL('/inventory.html')
  }
}