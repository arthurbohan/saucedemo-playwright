import { Page, Locator } from '@playwright/test'

export abstract class BasePage {
  constructor(protected page: Page) {}

  // Каждый наследник обязан реализовать метод goto()
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

  // Хелпер: ждёт появления элемента и возвращает его текст
  async getTextOf(locator: Locator): Promise<string> {
    await locator.waitFor({ state: 'visible' })
    return locator.innerText()
  }
}