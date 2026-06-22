import { Page, Locator } from '@playwright/test'

export abstract class BasePage {
  constructor(protected page: Page) {}

  // Every subclass must implement the goto() method.
  abstract goto(): Promise<void>

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  getCurrentUrl(): string {
    return this.page.url()
  }

  async getTitle(): Promise<string> {
    return this.page.title()
  }

  // Helper: waits for an element to appear and returns its text
  async getTextOf(locator: Locator): Promise<string> {
    await locator.waitFor({ state: 'visible' })
    return locator.innerText()
  }
}