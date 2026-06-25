import { Page } from '@playwright/test'
import { BasePage } from './basePage'

export type SauceUser =
    | 'standard_user'
    | 'locked_out_user'
    | 'problem_user'
    | 'performance_glitch_user'

export class LoginPage extends BasePage {
    constructor(page: Page) {
        super(page)
    }

    get usernameInput() {
        return this.page.getByTestId('username')
    }
    get passwordInput() {
        return this.page.getByTestId('password')
    }
    get loginButton() {
        return this.page.getByTestId('login-button')
    }
    get errorMessage() {
        return this.page.getByTestId('error')
    }
    get errorDismiss() {
        return this.page.getByTestId('error-button')
    }
    get credentialsHint() {
        return this.page.locator('#login_credentials')
    }
    get passwordHint() {
        return this.page.locator('.login_password')
    }

    async goto() {
        await this.page.goto('/')
        await this.loginButton.waitFor({ state: 'visible' })
    }

    async login(username: string, password: string) {
        await this.usernameInput.fill(username)
        await this.passwordInput.fill(password)
        await this.loginButton.click()
    }

    // A convenient shortcut is loginAs('standard') instead of a long string.
    async loginAs(user: SauceUser) {
        await this.login(user, 'secret_sauce')
    }

    async getErrorText(): Promise<string> {
        return this.getTextOf(this.errorMessage)
    }

    async dismissError() {
        await this.errorDismiss.click()
        await this.errorMessage.waitFor({ state: 'hidden' })
    }

    async isErrorVisible(): Promise<boolean> {
        return this.errorMessage.isVisible()
    }
}