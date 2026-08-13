import { Page, Locator } from '@playwright/test'
import { heal } from '../../helpers/selfHealing'

export abstract class BasePage {
  constructor(public readonly page: Page) { }

  abstract goto(): Promise<void>

  // ── Standard helpers ──────────────────────────────────────────

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  getCurrentUrl(): string {
    return this.page.url()
  }

  async getTitle(): Promise<string> {
    return this.page.title()
  }

  async getTextOf(locator: Locator): Promise<string> {
    await locator.waitFor({ state: 'visible' })
    return locator.innerText()
  }

  // ── Self-healing helpers ──────────────────────────────────────
  // Each method tries the original locator first.
  // If it fails within 3s → asks Groq for an alternative.
  // On success → logs a warning with the healed selector.
  // Available in every Page Object via `this.`

  /**
   * Heals the locator and clicks it.
   *
   * @example
   * await this.clickHealed(this.loginButton, 'Login submit button')
   */
  async clickHealed(locator: Locator, description: string): Promise<void> {
    const { locator: healed } = await heal(this.page, locator, description)
    await healed.click()
  }

  /**
   * Heals the locator and fills it with text.
   *
   * @example
   * await this.fillHealed(this.usernameInput, 'standard_user', 'Username input field')
   */
  async fillHealed(locator: Locator, value: string, description: string): Promise<void> {
    const { locator: healed } = await heal(this.page, locator, description)
    await healed.fill(value)
  }

  /**
   * Heals the locator and selects a dropdown option.
   *
   * @example
   * await this.selectOptionHealed(this.sortDropdown, 'lohi', 'Product sort dropdown')
   */
  async selectOptionHealed(locator: Locator, option: string, description: string): Promise<void> {
    const { locator: healed } = await heal(this.page, locator, description)
    await healed.selectOption(option)
  }

  /**
   * Heals the locator and waits for it to become visible.
   *
   * @example
   * await this.waitForVisibleHealed(this.inventoryList, 'Product inventory list')
   */
  async waitForVisibleHealed(locator: Locator, description: string): Promise<void> {
    const { locator: healed } = await heal(this.page, locator, description)
    await healed.waitFor({ state: 'visible' })
  }

  /**
   * Heals the locator and returns its inner text.
   *
   * @example
   * const text = await this.getTextOfHealed(this.summaryTotal, 'Order total label')
   */
  async getTextOfHealed(locator: Locator, description: string): Promise<string> {
    const { locator: healed } = await heal(this.page, locator, description)
    await healed.waitFor({ state: 'visible' })
    return healed.innerText()
  }

  /**
   * Heals the locator and checks a checkbox.
   *
   * @example
   * await this.checkHealed(this.rememberMe, 'Remember me checkbox')
   */
  async checkHealed(locator: Locator, description: string): Promise<void> {
    const { locator: healed } = await heal(this.page, locator, description)
    await healed.check()
  }

  /**
   * Heals the locator and returns whether it is visible.
   * Does NOT throw if not found — returns false instead.
   *
   * @example
   * const visible = await this.isVisibleHealed(this.cartBadge, 'Cart badge counter')
   */
  async isVisibleHealed(locator: Locator, description: string): Promise<boolean> {
    try {
      const { locator: healed } = await heal(this.page, locator, description)
      return healed.isVisible()
    } catch {
      return false
    }
  }
}