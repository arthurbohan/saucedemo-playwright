import { test, expect } from '@playwright/test'

test('L1: страница логина загружается', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Swag Labs')
  await expect(page.locator('[data-test="username"]')).toBeVisible()
  await expect(page.locator('[data-test="password"]')).toBeVisible()
  await expect(page.locator('[data-test="login-button"]')).toBeVisible()
})

test('L1: на странице видны подсказки с логинами', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#login_credentials')).toBeVisible()
  await expect(page.locator('.login_password')).toBeVisible()
})

test('L1: Пустые поля показывают ошибку', async ({ page }) => { 
  await page.goto('/')
  await page.locator('[data-test="login-button"]').click()
  await expect(page.locator('[data-test="error"]')).toBeVisible()
  await expect(page.locator('[data-test="error"]')).toContainText('Username is required')
})

test('L1: успешный логин переходит на /inventory.html', async ({ page }) => {
  await page.goto('/')

  await page.locator('[data-test="username"]').fill('standard_user')
  await page.locator('[data-test="password"]').fill('secret_sauce')
  await page.locator('[data-test="login-button"]').click()

  await expect(page).toHaveURL('/inventory.html')
  await expect(page.locator('.inventory_list')).toBeVisible()
})

test('L1: заблокированный пользователь видит ошибку', async ({ page }) => {
  await page.goto('/')

  await page.locator('[data-test="username"]').fill('locked_out_user')
  await page.locator('[data-test="password"]').fill('secret_sauce')
  await page.locator('[data-test="login-button"]').click()

  // locked_out_user не может войти
  await expect(page.locator('[data-test="error"]')).toBeVisible()
  await expect(page.locator('[data-test="error"]')).toContainText('locked out')
})

test('L1: неверный пароль показывает ошибку', async ({ page }) => {
  await page.goto('/')

  await page.locator('[data-test="username"]').fill('standard_user')
  await page.locator('[data-test="password"]').fill('НЕВЕРНЫЙ_ПАРОЛЬ')
  await page.locator('[data-test="login-button"]').click()

  await expect(page.locator('[data-test="error"]')).toBeVisible()
  await expect(page).toHaveURL('/')
})


test('L1: два независимых контекста — разные сессии', async ({ browser }) => {
  // Создаём два отдельных BrowserContext — как два разных браузера
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()

  const page1 = await ctx1.newPage()
  const page2 = await ctx2.newPage()

  await page1.goto('https://www.saucedemo.com')
  await page1.locator('[data-test="username"]').fill('standard_user')
  await page1.locator('[data-test="password"]').fill('secret_sauce')
  await page1.locator('[data-test="login-button"]').click()
  await expect(page1).toHaveURL(/inventory/)

  await page2.goto('https://www.saucedemo.com')
  await expect(page2).toHaveURL('https://www.saucedemo.com/')

  await ctx1.close()
  await ctx2.close()
})