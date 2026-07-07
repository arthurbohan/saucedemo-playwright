import { mergeTests, expect } from '@playwright/test'
import { authFixtures }  from './auth.fixture'
import { pageFixtures }  from './pages.fixture'
import { apiFixtures }   from './api.fixture'

export const test = mergeTests(authFixtures, pageFixtures, apiFixtures)
export { expect }