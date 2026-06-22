import { test as base, expect, Page } from '@playwright/test'

type SauceDemoFixtures = {
    loginPage: Page
    inventoryPage: Page
    problemUserPage: Page
    cartPage: Page
}

export const test = base.extend<SauceDemoFixtures>({
    loginPage: async ({ page }, use) => {
        console.log('  [fixture] loginPage: открываю страницу логина')
        await page.goto('/')
        await use(page)
    },
    inventoryPage: async ({ page }, use) => {
        console.log('  [fixture] inventoryPage: устанавливаю сессию standard_user')

        await page.goto('/')
        await page.context().addCookies([{
            name: 'session-username',
            value: 'standard_user',
            domain: 'www.saucedemo.com',
            path: '/',
        }])

        await page.goto('/inventory.html')
        await expect(page.locator('.inventory_list')).toBeVisible()

        await use(page)

        console.log('  [fixture] inventoryPage: очищаю сессию')
        await page.evaluate(() => localStorage.clear())
    },
    problemUserPage: async ({ page }, use) => {
        console.log('  [fixture] problemUserPage: логинюсь через UI как problem_user')

        await page.goto('/')
        await page.context().addCookies([{
            name: 'session-username',
            value: 'problem_user',
            domain: 'www.saucedemo.com',
            path: '/',
        }])

        await page.goto('/inventory.html')
        await expect(page.locator('.inventory_list')).toBeVisible()

        await use(page)

        console.log('  [fixture] problemUserPage: очищаю сессию')
        await page.evaluate(() => localStorage.clear())
    },

    cartPage: async ({ inventoryPage }, use) => {
        console.log('  [fixture] cartPage: добавляю Sauce Labs Backpack и перехожу в корзину')
        const page = inventoryPage
        await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click()
        await page.goto('/cart.html')
        await expect(page.locator('.cart_item .inventory_item_name')).toBeVisible()

        await use(page)

        console.log('  [fixture] cartPage: очищаю сессию')
        await page.evaluate(() => localStorage.clear())
    }
})

export { expect }

test('L2: loginPage fixture — форма готова к использованию', async ({ loginPage }) => {
    await expect(loginPage.locator('[data-test="username"]')).toBeVisible()
    await expect(loginPage.locator('[data-test="login-button"]')).toBeVisible()
    await expect(loginPage).toHaveURL('https://www.saucedemo.com/')
})

test('L2: inventoryPage fixture — сразу на странице товаров', async ({ inventoryPage }) => {
    await expect(inventoryPage).toHaveURL(/inventory/)
    const items = inventoryPage.locator('.inventory_item')
    await expect(items).toHaveCount(6)
})

test('L2: inventoryPage — все 6 товаров видны', async ({ inventoryPage }) => {
    const itemNames = await inventoryPage.locator('.inventory_item_name').allTextContents()
    expect(itemNames).toContain('Sauce Labs Backpack')
    expect(itemNames).toContain('Sauce Labs Bike Light')
    expect(itemNames).toContain('Sauce Labs Bolt T-Shirt')
    expect(itemNames).toContain('Sauce Labs Fleece Jacket')
    expect(itemNames).toContain('Sauce Labs Onesie')
    expect(itemNames).toContain('Test.allTheThings() T-Shirt (Red)')
})

test('L2: inventoryPage — иконка корзины показывает 0 товаров', async ({ inventoryPage }) => {
    const badge = inventoryPage.locator('.shopping_cart_badge')
    await expect(badge).not.toBeVisible()
})

test('L2: добавить товар в корзину — бейдж показывает 1', async ({ inventoryPage }) => {
    await inventoryPage.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click()
    await expect(inventoryPage.locator('.shopping_cart_badge')).toHaveText('1')
})

test('L2: problemUserPage — сессия работает, но UI содержит баги', async ({ problemUserPage }) => {
    await expect(problemUserPage).toHaveURL(/inventory/)
    const images = problemUserPage.locator('.inventory_item_img img')
    const srcs = await images.evaluateAll(imgs =>
        imgs.map((img: any) => img.src)
    )
    const uniqueSrcs = new Set(srcs)
    console.log(`  problem_user видит ${uniqueSrcs.size} уникальных картинок из ${srcs.length}`)
})

test('L2: ЗАДАНИЕ — cartPage содержит backpack', async ({ cartPage }) => {
    await expect(cartPage.locator('.cart_item .inventory_item_name')).toHaveText('Sauce Labs Backpack')
})