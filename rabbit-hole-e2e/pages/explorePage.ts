import { Page } from '@playwright/test'

export class ExplorePage {
  constructor(public readonly page: Page) { }

  // ── Locators ─────────────────────────────────────────────────

  get searchInput() { return this.page.getByTestId('search-input') }
  get followButton() { return this.page.getByTestId('follow') }
  get surpriseButton() { return this.page.getByTestId('surprise') }
  get loadingIndicator() { return this.page.getByTestId('loading') }
  get nodeName() { return this.page.getByTestId('node-name') }
  get branches() { return this.page.getByTestId('branch') }
  get trail() { return this.page.getByTestId('trail') }
  get errorState() { return this.page.getByTestId('error') }
  get retryButton() { return this.page.getByTestId('retry') }

  // NodeCard renders before the branches.map() list, and branches carry
  // their own copies of these same buttons — .first() always means the
  // node's own button, never a branch's.
  get addToCrateButton() { return this.page.getByRole('button', { name: 'Add to crate' }).first() }
  get inCrateButton() { return this.page.getByRole('button', { name: 'In crate' }).first() }
  get digDeeperButton() { return this.page.getByRole('button', { name: 'Dig deeper' }).first() }
  get closeNotesButton() { return this.page.getByRole('button', { name: 'Close notes' }) }
  get nodePlayButton() { return this.page.getByRole('button', { name: 'Play preview' }).first() }
  get nodeStopButton() { return this.page.getByRole('button', { name: 'Stop preview' }).first() }

  branch(index = 0) { return this.branches.nth(index) }

  notesText(text: string) { return this.page.getByText(text) }

  // ── Actions ──────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/')
  }

  async search(artist: string) {
    await this.searchInput.fill(artist)
  }

  async follow(artist: string) {
    await this.search(artist)
    await this.followButton.click()
  }

  async surpriseMe() {
    await this.surpriseButton.click()
  }

  async retry() {
    await this.retryButton.click()
  }

  async addToCrate() {
    await this.addToCrateButton.click()
  }

  async digDeeper() {
    await this.digDeeperButton.click()
  }

  async closeNotes() {
    await this.closeNotesButton.click()
  }

  async playNodePreview() {
    await this.nodePlayButton.click()
  }

  async goHereOnBranch(index = 0) {
    await this.branch(index).getByRole('button', { name: 'Go here' }).click()
  }

  async playBranchPreview(index = 0) {
    await this.branch(index).getByRole('button', { name: 'Play preview' }).click()
  }

  branchStopButton(index = 0) {
    return this.branch(index).getByRole('button', { name: 'Stop preview' })
  }

  async jumpToTrailBreadcrumb(name: string) {
    await this.trail.getByRole('button', { name }).click()
  }
}
