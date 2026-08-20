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
  //
  // All take the same shape: (locator, ...args, description) — description
  // is a plain-English hint for what the element is, used only if healing
  // is needed. e.g. this.clickHealed(this.loginButton, 'Login submit button')

  /** Heals the locator, then clicks it. */
  async clickHealed(locator: Locator, description: string): Promise<void> {
    const { locator: healed } = await heal(this.page, locator, description)
    await healed.click()
  }

  /** Heals the locator, then fills it with text. */
  async fillHealed(locator: Locator, value: string, description: string): Promise<void> {
    const { locator: healed } = await heal(this.page, locator, description)
    await healed.fill(value)
  }

  /** Heals the locator, then selects a dropdown option. */
  async selectOptionHealed(locator: Locator, option: string, description: string): Promise<void> {
    const { locator: healed } = await heal(this.page, locator, description)
    await healed.selectOption(option)
  }

  /** Heals the locator, then waits for it to become visible. */
  async waitForVisibleHealed(locator: Locator, description: string): Promise<void> {
    const { locator: healed } = await heal(this.page, locator, description)
    await healed.waitFor({ state: 'visible' })
  }

  /** Heals the locator, then returns its inner text. */
  async getTextOfHealed(locator: Locator, description: string): Promise<string> {
    const { locator: healed } = await heal(this.page, locator, description)
    await healed.waitFor({ state: 'visible' })
    return healed.innerText()
  }

  /** Heals the locator, then checks a checkbox. */
  async checkHealed(locator: Locator, description: string): Promise<void> {
    const { locator: healed } = await heal(this.page, locator, description)
    await healed.check()
  }

  /** Heals the locator, then returns whether it's visible. Does NOT throw if not found — returns false instead. */
  async isVisibleHealed(locator: Locator, description: string): Promise<boolean> {
    try {
      const { locator: healed } = await heal(this.page, locator, description)
      return healed.isVisible()
    } catch {
      return false
    }
  }
}
