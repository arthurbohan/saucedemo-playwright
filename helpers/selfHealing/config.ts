/**
 * Configuration for self-healing
 */

export const CONFIG = {
    DEFAULT_TIMEOUT: 3_000,
    DEFAULT_MAX_RETRIES: 2,
    SNAPSHOT_MAX_LENGTH: 6000,
    INTERACTIVE_ELEMENTS_LIMIT: 30,
} as const

export const VALID_ROLES = [
    'button',
    'link',
    'textbox',
    'checkbox',
    'radio',
    'combobox',
    'listbox',
    'option',
    'heading',
    'img',
    'table',
    'row',
    'cell',
    'dialog',
    'alert',
    'menu',
    'menuitem',
] as const

export const INTERACTIVE_SELECTORS = [
    'button',
    'a',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[role="combobox"]',
    '[role="listbox"]',
    '[data-testid]',
    '[data-test]',
    '[aria-label]',
] as const