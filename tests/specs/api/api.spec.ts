import { test, expect } from '../../fixtures'
import { PostBuilder } from '../../builders'
import type { Post, Comment, User, Todo } from '../../types/api.types'

test.describe('GET: Posts', () => {

  test('Get all posts — an array of 100 elements', async ({ apiClient }) => {
    const res = await apiClient.get('posts')

    expect(res.status()).toBe(200)

    const posts = await res.json() as Post[]
    expect(Array.isArray(posts)).toBe(true)
    expect(posts).toHaveLength(100)
  })

  test('Get a post by ID — the structure is identical', async ({ apiClient }) => {
    const res = await apiClient.get('posts/1')

    expect(res.ok()).toBeTruthy()

    const post = await res.json() as Post
    expect(post.id).toBe(1)
    expect(post.userId).toBeDefined()
    expect(post.title).toBeTruthy()
    expect(post.body).toBeTruthy()
  })

  test('Get a non-existent post — 404', async ({ apiClient }) => {
    const res = await apiClient.get('posts/9999')
    expect(res.status()).toBe(404)
  })

  test('Filter posts by userId — returns only posts by that user', async ({ apiClient }) => {
    const res = await apiClient.get('posts?userId=1')

    expect(res.status()).toBe(200)

    const posts = await res.json() as Post[]
    expect(posts.length).toBeGreaterThan(0)
    posts.forEach(post => expect(post.userId).toBe(1))
  })

  test('Get comments for a post — nested route', async ({ apiClient }) => {
    const res = await apiClient.get('posts/1/comments')

    expect(res.status()).toBe(200)

    const comments = await res.json() as Comment[]
    expect(comments.length).toBeGreaterThan(0)
    comments.forEach(c => expect(c.postId).toBe(1))
    comments.forEach(c => expect(c.email).toContain('@'))
  })

})

test.describe('GET: Users', () => {

  test('Get all users — exactly 10', async ({ apiClient }) => {
    const res = await apiClient.get('users')

    expect(res.status()).toBe(200)

    const users = await res.json() as User[]
    expect(users).toHaveLength(10)
  })

  test('Each user has required fields', async ({ apiClient }) => {
    const res = await apiClient.get('users')
    const users = await res.json() as User[]

    users.forEach(user => {
      expect(user.id).toBeDefined()
      expect(user.name).toBeTruthy()
      expect(user.username).toBeTruthy()
      expect(user.email).toContain('@')
    })
  })

  test('Get user by ID', async ({ apiClient }) => {
    const res = await apiClient.get('users/1')

    expect(res.ok()).toBeTruthy()

    const user = await res.json() as User
    expect(user.id).toBe(1)
    expect(user.name).toBe('Leanne Graham')
    expect(user.username).toBe('Bret')
  })

})

test.describe('GET: Todos', () => {

  test('Get all todos — 200 items', async ({ apiClient }) => {
    const res = await apiClient.get('todos')

    expect(res.status()).toBe(200)

    const todos = await res.json() as Todo[]
    expect(todos).toHaveLength(200)
  })

  test('Filter todos by completion status', async ({ apiClient }) => {
    const res = await apiClient.get('todos')
    const todos = await res.json() as Todo[]

    const completed = todos.filter(t => t.completed)
    const uncompleted = todos.filter(t => !t.completed)

    expect(completed.length).toBeGreaterThan(0)
    expect(uncompleted.length).toBeGreaterThan(0)
  })

  test('Filter todos by completed=true', async ({ apiClient }) => {
    const res = await apiClient.get('todos?completed=true')

    expect(res.status()).toBe(200)

    const todos = await res.json() as Todo[]
    todos.forEach(t => expect(t.completed).toBe(true))
  })

})

test.describe('POST: resources creation', () => {

  test('builder: create post with random data — 201 + returns id', async ({ apiClient }) => {
    const payload = new PostBuilder().withUserId(1).build()

    const res = await apiClient.post('posts', payload)

    expect(res.status()).toBe(201)

    const post = await res.json() as Post
    expect(post.title).toBe(payload.title)
    expect(post.body).toBe(payload.body)
    expect(post.userId).toBe(1)
    expect(post.id).toBe(101)
  })

  test('builder: create posts for multiple users', async ({ apiClient }) => {
    const payloads = [1, 2, 3].map(userId =>
      new PostBuilder().withUserId(userId).build()
    )

    for (const payload of payloads) {
      const res = await apiClient.post('posts', payload)
      expect(res.status()).toBe(201)

      const post = await res.json() as Post
      expect(post.userId).toBe(payload.userId)
      expect(post.title).toBe(payload.title)
    }
  })

  test('builder: create post with specific title', async ({ apiClient }) => {
    const payload = new PostBuilder()
      .withUserId(5)
      .withTitle('QA Automation with Playwright')
      .build()

    const res = await apiClient.post('posts', payload)

    expect(res.status()).toBe(201)

    const post = await res.json() as Post
    expect(post.title).toBe('QA Automation with Playwright')
    expect(post.userId).toBe(5)
  })

  test('create a post without userId — server still accepts it', async ({ apiClient }) => {
    const payload = new PostBuilder()
      .withTitle('Post without explicit userId')
      .build()

    const res = await apiClient.post('posts', payload)

    expect(res.status()).toBe(201)

    const post = await res.json() as Post
    expect(post.title).toBe(payload.title)
    expect(post.id).toBeDefined()
  })

})

test.describe('PUT / PATCH: resources update', () => {

  test('builder: PUT fully replaces the post', async ({ apiClient }) => {
    const payload = new PostBuilder()
      .withUserId(1)
      .withTitle('Updated via Builder')
      .build()

    const res = await apiClient.put('posts/1', { id: 1, ...payload })

    expect(res.status()).toBe(200)

    const post = await res.json() as Post
    expect(post.title).toBe('Updated via Builder')
    expect(post.userId).toBe(1)
    expect(post.id).toBe(1)
  })

  test('builder: PATCH updates only the provided fields', async ({ apiClient }) => {
    const payload = new PostBuilder().withTitle('Only Title Patched').build()

    const res = await apiClient.patch('posts/1', { title: payload.title })

    expect(res.status()).toBe(200)

    const post = await res.json() as Post
    expect(post.title).toBe(payload.title)
    expect(post.id).toBe(1)
  })

})

test.describe('DELETE: resources deletion', () => {

  test('Delete a post — 200 with empty body', async ({ apiClient }) => {
    const res = await apiClient.delete('posts/1')

    expect(res.status()).toBe(200)

    const body = await res.json() as object
    expect(body).toEqual({})
  })

})

test.describe('Chain of requests — full CRUD cycle', () => {

  test('builder: create → get → update → delete', async ({ apiClient }) => {
    // 1. CREATE
    const createPayload = new PostBuilder().withUserId(1).build()

    const createRes = await apiClient.post('posts', createPayload)
    expect(createRes.status()).toBe(201)
    const created = await createRes.json() as Post
    console.log(`\n  Created: id=${created.id}, title="${created.title}"`)

    // 2. GET
    const getRes = await apiClient.get('posts/1')
    expect(getRes.status()).toBe(200)
    const fetched = await getRes.json() as Post
    expect(fetched.id).toBe(1)

    // 3. UPDATE 
    const updatePayload = new PostBuilder()
      .withUserId(1)
      .withTitle('Updated in CRUD cycle')
      .build()

    const updateRes = await apiClient.put('posts/1', { id: 1, ...updatePayload })
    expect(updateRes.status()).toBe(200)
    const updated = await updateRes.json() as Post
    expect(updated.title).toBe('Updated in CRUD cycle')

    // 4. DELETE
    const deleteRes = await apiClient.delete('posts/1')
    expect(deleteRes.status()).toBe(200)

    console.log('  CRUD cycle completed successfully ✅')
  })

  test('get user → their posts → comments to the first post', async ({ apiClient }) => {
    // 1. Get the user
    const userRes = await apiClient.get('users/1')
    const user = await userRes.json() as User
    expect(user.id).toBe(1)

    // 2. Get their posts
    const postsRes = await apiClient.get(`posts?userId=${user.id}`)
    const posts = await postsRes.json() as Post[]
    expect(posts.length).toBeGreaterThan(0)

    // 3. Get the first post and its comments
    const firstPost = posts[0]
    const commentsRes = await apiClient.get(`posts/${firstPost.id}/comments`)
    const comments = await commentsRes.json() as Comment[]

    expect(comments.length).toBeGreaterThan(0)
    comments.forEach(c => expect(c.postId).toBe(firstPost.id))

    console.log(`\n  User: ${user.name}`)
    console.log(`  Posts: ${posts.length}`)
    console.log(`  Comments to post #${firstPost.id}: ${comments.length}`)
  })

})