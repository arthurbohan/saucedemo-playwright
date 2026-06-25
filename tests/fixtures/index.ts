import { mergeTests, expect } from '@playwright/test'
import { authFixtures }  from './auth.fixture'
import { pageFixtures }  from './pages.fixture'

export const test = mergeTests(authFixtures, pageFixtures)
export { expect }