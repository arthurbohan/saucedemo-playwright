/*
 * API client for JSONPlaceholder — a free, public REST API 
 * with no authentication or registration required. 
 * 
 * baseURL: https://jsonplaceholder.typicode.com 
 * Resources: /posts, /comments, /users, /todos, /albums, /photos 
 * 
 * POST/PUT/PATCH/DELETE are simulated — data is not actually saved, 
 * but the server returns the correct statuses and response structures. 
 */

import { test as base, APIRequestContext } from '@playwright/test'

export type ApiFixtures = {
    apiClient: {
        get: (path: string) => ReturnType<APIRequestContext['get']>
        post: (path: string, data?: unknown) => ReturnType<APIRequestContext['post']>
        put: (path: string, data?: unknown) => ReturnType<APIRequestContext['put']>
        patch: (path: string, data?: unknown) => ReturnType<APIRequestContext['patch']>
        delete: (path: string) => ReturnType<APIRequestContext['delete']>
    }
}

export const apiFixtures = base.extend<ApiFixtures>({

    apiClient: async ({ playwright }, use) => {

        const apiContext = await playwright.request.newContext({
            baseURL: 'https://jsonplaceholder.typicode.com/',
            extraHTTPHeaders: {
                'Content-Type': 'application/json',
            },
        })

        await use({
            get: (path) => apiContext.get(path),
            post: (path, data?) => apiContext.post(path, { data }),
            put: (path, data?) => apiContext.put(path, { data }),
            patch: (path, data?) => apiContext.patch(path, { data }),
            delete: (path) => apiContext.delete(path),
        })

        await apiContext.dispose()
    },

})