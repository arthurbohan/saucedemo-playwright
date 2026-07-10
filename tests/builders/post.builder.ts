import { faker } from '@faker-js/faker'
import { Post }  from '../types/api.types'

export class PostBuilder {
  private data: Omit<Post, 'id'> = {
    userId: faker.number.int({ min: 1, max: 10 }),
    title:  faker.lorem.sentence(),
    body:   faker.lorem.paragraph(),
  }

  withUserId(value: number): this {
    this.data.userId = value
    return this
  }

  withTitle(value: string): this {
    this.data.title = value
    return this
  }

  withBody(value: string): this {
    this.data.body = value
    return this
  }

  build(): Omit<Post, 'id'> {
    return { ...this.data }
  }
}