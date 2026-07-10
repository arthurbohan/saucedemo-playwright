import { test, expect } from '../../fixtures'

test.describe('Login page', () => {
    test.describe('Page load', () => {

        test('page title — Swag Labs', async ({ loginPage, page }) => {
            await expect(page).toHaveTitle('Swag Labs')
        })

        test('username field is visible', async ({ loginPage }) => {
            await expect(loginPage.usernameInput).toBeVisible()
        })

        test('password field is visible', async ({ loginPage }) => {
            await expect(loginPage.passwordInput).toBeVisible()
        })

        test('Login button is visible', async ({ loginPage }) => {
            await expect(loginPage.loginButton).toBeVisible()
        })

        test('login hint block is visible', async ({ loginPage }) => {
            await expect(loginPage.credentialsHint).toBeVisible()
            await expect(loginPage.passwordHint).toBeVisible()
        })

        test('login hints are visible', async ({ loginPage }) => {
            await expect(loginPage.credentialsHint).toBeVisible()
            await expect(loginPage.passwordHint).toBeVisible()
            const text1 = await loginPage.getTextOf(loginPage.credentialsHint)
            expect(text1).toContain('standard_user')
            const text2 = await loginPage.getTextOf(loginPage.passwordHint)
            expect(text2).toContain('secret_sauce')
        })

    })

    test.describe('Successful login', () => {

        test('standard_user goes to /inventory.html', async ({ loginPage, page }) => {
            await loginPage.loginAs('standard_user')
            await expect(page).toHaveURL(/inventory/)
        })

        test('problem_user can log in', async ({ loginPage, page }) => {
            await loginPage.loginAs('problem_user')
            await expect(page).toHaveURL(/inventory/)
        })

        test('performance_glitch_user logs in slowly but successfully', async ({ loginPage, page }) => {
            await loginPage.loginAs('performance_glitch_user')
            await expect(page).toHaveURL(/inventory/, { timeout: 20000 })
        })

        test('after successful login username/password fields are cleared', async ({ loginPage, page }) => {
            await loginPage.loginAs('standard_user')
            await expect(page).toHaveURL(/inventory/)

            await page.goBack()
            await expect(loginPage.usernameInput).toHaveValue('')
            await expect(loginPage.passwordInput).toHaveValue('')
        })

    })

    test.describe('Failed login', () => {

        test('locked_out_user sees lockout message', async ({ loginPage }) => {
            await loginPage.loginAs('locked_out_user')
            expect(await loginPage.isErrorVisible()).toBe(true)

            const text = await loginPage.getErrorText()
            expect(text).toContain('locked out')
        })

        test('wrong password shows error', async ({ loginPage }) => {
            await loginPage.login('standard_user', 'wrong_password')

            expect(await loginPage.isErrorVisible()).toBe(true)
            const text = await loginPage.getErrorText()
            expect(text).toContain('do not match')
        })

        test('empty username — error "Username is required"', async ({ loginPage }) => {
            await loginPage.login('', 'secret_sauce')

            const text = await loginPage.getErrorText()
            expect(text).toContain('Username is required')
        })

        test('empty password — error "Password is required"', async ({ loginPage }) => {
            await loginPage.login('standard_user', '')

            const text = await loginPage.getErrorText()
            expect(text).toContain('Password is required')
        })

        test('X button hides the error message', async ({ loginPage }) => {
            await loginPage.login('standard_user', 'wrong')
            expect(await loginPage.isErrorVisible()).toBe(true)

            await loginPage.dismissError()
            expect(await loginPage.isErrorVisible()).toBe(false)
        })

        test('after error URL remains on the main page', async ({ loginPage, page }) => {
            await loginPage.login('wrong_user', 'wrong_pass')
            await expect(page).toHaveURL('https://www.saucedemo.com/')
        })

    })

})