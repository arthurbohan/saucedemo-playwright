import { faker } from '@faker-js/faker'
import { ShippingInfo } from '../pages/checkoutPage'

export class ShippingInfoBuilder {
  private data: ShippingInfo = {
    firstName:  faker.person.firstName(),
    lastName:   faker.person.lastName(),
    postalCode: faker.location.zipCode('#####'),
  }

  withFirstName(value: string): this {
    this.data.firstName = value
    return this
  }

  withLastName(value: string): this {
    this.data.lastName = value
    return this
  }

  withPostalCode(value: string): this {
    this.data.postalCode = value
    return this
  }

  // ── Негативные сценарии ───────────────────────────────────────

  withEmptyFirstName(): this {
    this.data.firstName = ''
    return this
  }

  withEmptyLastName(): this {
    this.data.lastName = ''
    return this
  }

  withEmptyPostalCode(): this {
    this.data.postalCode = ''
    return this
  }

  build(): ShippingInfo {
    return { ...this.data }
  }
}