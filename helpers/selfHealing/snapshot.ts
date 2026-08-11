/**
 * Page snapshot strategies
 */

import type { Page } from './types'
import { CONFIG, INTERACTIVE_SELECTORS } from './config'

export async function getPageSnapshot(page: Page): Promise<string> {
    try {
        const snapshot = await page.ariaSnapshot({
            mode: 'ai',
            depth: 20,
        })
        if (snapshot?.length) return snapshot
    } catch {
        // Silent fallback
    }

    try {
        const snapshot = await page.ariaSnapshot({ mode: 'ai' })
        const snapshotText = typeof snapshot === 'string' 
            ? snapshot 
            : JSON.stringify(snapshot, null, 2)
        if (snapshotText) return snapshotText
    } catch {
        // Silent fallback
    }

    try {
        const domStructure = await getDOMStructure(page)
        if (domStructure.interactiveElements.length > 0) {
            return JSON.stringify(domStructure, null, 2)
        }
    } catch {
        // Silent fallback
    }

    try {
        const text = await page.locator('body').innerText()
        if (text?.length) {
            return text.slice(0, CONFIG.SNAPSHOT_MAX_LENGTH)
        }
    } catch {
        // Silent fallback
    }

    try {
        const html = await getPageHTML(page)
        if (html) return html
    } catch {
        // Silent fallback
    }

    return 'No snapshot available'
}

export async function getInteractiveElements(page: Page): Promise<string> {
    try {
        const elements = await page.evaluate((selectors: string[]) => {
            const result: string[] = []
            
            for (const selector of selectors) {
                document.querySelectorAll(selector).forEach((el) => {
                    const text = el.textContent?.trim()
                    const ariaLabel = el.getAttribute('aria-label')
                    const testId = el.getAttribute('data-testid')
                    const test = el.getAttribute('data-test')
                    const role = el.getAttribute('role')
                    const id = el.id

                    let desc = `<${el.tagName.toLowerCase()}`
                    if (id) desc += ` id="${id}"`
                    if (testId) desc += ` data-testid="${testId}"`
                    if (test) desc += ` data-test="${test}"`
                    if (ariaLabel) desc += ` aria-label="${ariaLabel}"`
                    if (role) desc += ` role="${role}"`
                    if (text && text.length < 50) desc += ` text="${text}"`
                    desc += '>'
                    result.push(desc)
                })
            }
            return result.slice(0, 30)
        }, INTERACTIVE_SELECTORS)

        return elements.join('\n')
    } catch {
        return 'Unable to get interactive elements'
    }
}

async function getDOMStructure(page: Page) {
    return await page.evaluate(() => {
        const getElementInfo = (el: Element, depth: number = 0): any => {
            if (depth > 5) return null

            const info: any = { tag: el.tagName.toLowerCase() }

            const attrs = [
                'id', 'class', 'data-testid', 'data-test',
                'aria-label', 'role', 'name', 'type',
                'placeholder', 'value'
            ]
            
            for (const attr of attrs) {
                const value = el.getAttribute(attr)
                if (value) info[attr] = value
            }

            const text = el.textContent?.trim()
            if (text && text.length < 100) info.text = text

            const children = Array.from(el.children)
            if (children.length > 0 && children.length <= 10) {
                info.children = children
                    .slice(0, 5)
                    .map((child) => getElementInfo(child, depth + 1))
                    .filter(Boolean)
            }

            return info
        }

        const elements: any[] = []
        const selectors = [
            'button', 'a', 'input', 'select', 'textarea',
            '[role="button"]', '[role="link"]', '[role="combobox"]',
            '[role="listbox"]', '[data-testid]', '[data-test]', '[aria-label]'
        ]

        for (const selector of selectors) {
            document.querySelectorAll(selector).forEach((el) => {
                const info = getElementInfo(el)
                if (info && (info['data-testid'] || info['data-test'] || 
                    info['aria-label'] || info.text || info.role)) {
                    const key = `${info.tag}_${info.text || ''}_${info['data-testid'] || ''}`
                    if (!elements.some((e) => 
                        `${e.tag}_${e.text || ''}_${e['data-testid'] || ''}` === key
                    )) {
                        elements.push(info)
                    }
                }
            })
        }

        return {
            interactiveElements: elements.slice(0, 50),
            visibleText: document.body.textContent?.replace(/\s+/g, ' ').trim().slice(0, 1000),
            title: document.title,
            url: window.location.href,
        }
    })
}

async function getPageHTML(page: Page): Promise<string | null> {
    const html = await page.evaluate(() => {
        const main = document.querySelector('main, #main, .main, [role="main"]')
        if (main) return main.outerHTML.slice(0, 2000)
        return document.body.outerHTML.slice(0, 2000)
    })
    return html || null
}