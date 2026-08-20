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

  // ── Step 1: Shipping Information ──────────────────────────────

  get firstNameInput() { return this.page.getByTestId('firstName') }
  get lastNameInput() { return this.page.getByTestId('lastName') }
  get postalCodeInput() { return this.page.getByTestId('postalCode') }
  get continueButton() { return this.page.getByTestId('continue') }

  /** On this (step-two review) page, navigates to /inventory.html — NOT /cart.html. */
  get cancelButton() { return this.page.getByTestId('cancel') }
  get errorMessage() { return this.page.getByTestId('error') }

  // ── Step 2: Order Review ──────────────────────────────────────

  get summaryItems() { return this.page.locator('.cart_item') }
  get summarySubtotal() { return this.page.locator('.summary_subtotal_label') }
  get summaryTax() { return this.page.locator('.summary_tax_label') }
  get summaryTotal() { return this.page.locator('.summary_total_label') }
  get finishButton() { return this.page.getByTestId('finish') }

  // ── Step 3: Confirmation ──────────────────────────────────────

  get successHeader() { return this.page.locator('.complete-header') }
  get successText() { return this.page.locator('.complete-text') }
  get backHomeButton() { return this.page.getByTestId('back-to-products') }

  // ── Standard methods ──────────────────────────────────────────

  async goto() {
    await this.page.goto('/checkout-step-one.html')
  }

  /**
   * COMPOSITE: fills all three fields, clicks continueButton, AND waits for
   * navigation to step-two — a complete action, not just a fill. Never call
   * continueButton.click() again right after this (double-click bug). Don't
   * use this for a validation-error test either: with an empty field there
   * is no navigation, so the waitForURL() below hangs until the test times
   * out — fill each input yourself and click continueButton once instead.
   */
  async fillShippingInfo(info: ShippingInfo) {
    await this.firstNameInput.fill(info.firstName)
    await this.lastNameInput.fill(info.lastName)
    await this.postalCodeInput.fill(info.postalCode)
    await this.continueButton.click()
    await this.page.waitForURL('/checkout-step-two.html')
  }

  async getSummaryTotal(): Promise<number> {
    const text = await this.getTextOf(this.summaryTotal)
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

  // ── Self-healing methods — use BasePage wrappers ──────────────

  /** COMPOSITE — same behavior/caveats as fillShippingInfo() above, healed. */
  async fillShippingInfoHealed(info: ShippingInfo) {
    await this.fillHealed(this.firstNameInput, info.firstName, 'First Name input field')
    await this.fillHealed(this.lastNameInput, info.lastName, 'Last Name input field')
    await this.fillHealed(this.postalCodeInput, info.postalCode, 'Zip/Postal Code input field')
    await this.clickHealed(
      this.continueButton,
      'Continue button — submits the shipping form',
    )
    await this.page.waitForURL('/checkout-step-two.html')
  }

  async getSummaryTotalHealed(): Promise<number> {
    const text = await this.getTextOfHealed(
      this.summaryTotal,
      'Order total label showing the final price',
    )
    return parseFloat(text.replace(/[^0-9.]/g, ''))
  }

  async finishHealed() {
    await this.clickHealed(
      this.finishButton,
      'Finish button — completes the order on the review page',
    )
    await this.page.waitForURL('/checkout-complete.html')
  }

  async backToProductsHealed() {
    await this.clickHealed(
      this.backHomeButton,
      'Back to Products button — returns to catalog after order completion',
    )
    await this.page.waitForURL('/inventory.html')
  }
}