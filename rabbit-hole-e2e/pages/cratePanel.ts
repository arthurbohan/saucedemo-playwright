import { Page } from '@playwright/test'

export class CratePanel {
  constructor(public readonly page: Page) { }

  get toggle() { return this.page.getByTestId('crate-toggle') }
  get panel() { return this.page.getByTestId('crate-panel') }
  get removeButton() { return this.page.getByRole('button', { name: 'Remove from crate' }) }

  async open() {
    await this.toggle.click()
  }

  async removeItem() {
    await this.removeButton.click()
  }

  /** Clicks an artist name inside the panel — relaunches explore from that point. */
  async selectArtist(name: string) {
    await this.panel.getByRole('button', { name }).click()
  }
}
