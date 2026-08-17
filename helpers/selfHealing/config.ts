/**
 * Configuration for self-healing
 */

export const CONFIG = {
    DEFAULT_TIMEOUT: 3_000,
    DEFAULT_MAX_RETRIES: 2,
    SNAPSHOT_MAX_LENGTH: 6000,
    INTERACTIVE_ELEMENTS_LIMIT: 30,
    // Deliberately NOT the same model as analyzeFailure/analyzeRisk/generateTests
    // (openai/gpt-oss-120b) — Groq's 8000 TPM cap is per-model, so a live test
    // run's self-healing calls get their own budget instead of competing with
    // CLI scripts that might run around the same time (e.g. analyzeFailure
    // right after a failed run). 20b is plenty for picking one CSS selector.
    GROQ_MODEL: 'openai/gpt-oss-20b',
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