import { mergeTests, expect } from '@playwright/test'
import { authFixtures } from './auth.fixture'
import { pageFixtures } from './pages.fixture'
import { apiFixtures } from './api.fixture'
import { healingFixtures } from './healing.fixture'

export const test = mergeTests(
    authFixtures, 
    pageFixtures, 
    apiFixtures, 
    healingFixtures

)
export { expect }