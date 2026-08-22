import { Page } from '@playwright/test'

export class AuthPanel {
  constructor(public readonly page: Page) { }

  get loginLink() { return this.page.getByTestId('login') }
  get logout() { return this.page.getByTestId('logout') }
}
