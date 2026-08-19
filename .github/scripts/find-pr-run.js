/**
 * .github/scripts/find-pr-run.js
 *
 * On a push to main (i.e. a merge landing), finds the pull_request-triggered
 * CI run (pr-checks.yml) that already tested this exact code, so
 * publish-allure and notify-telegram can reuse its artifacts instead of
 * re-running the whole suite a second time.
 *
 * Uses listPullRequestsAssociatedWithCommit — GitHub's own tracked
 * commit↔PR association — rather than guessing from the commit message, so
 * it works for every merge strategy (merge commit, squash, rebase), not
 * just "Create a merge commit".
 *
 * Invoked from on-merge.yml via actions/github-script:
 *   script: |
 *     const find = require('./.github/scripts/find-pr-run.js')
 *     await find({ github, context, core })
 */

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo

  const { data: prs } = await github.rest.repos.listPullRequestsAssociatedWithCommit({
    owner,
    repo,
    commit_sha: context.sha,
  })

  const merged = prs.find((pr) => pr.merged_at)
  if (!merged) {
    core.info(`No merged PR associated with ${context.sha} — likely a direct push to main. Skipping artifact reuse (publish-allure/notify-telegram will no-op).`)
    core.setOutput('run_id', '')
    core.setOutput('conclusion', '')
    core.setOutput('pr_number', '')
    core.setOutput('pr_title', '')
    return
  }

  const { data: runs } = await github.rest.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: 'pr-checks.yml',
    event: 'pull_request',
    status: 'completed',
    per_page: 30,
  })

  // Match by head SHA, not run.pull_requests — GitHub empties that array
  // retroactively once a PR closes (documented behavior: it only lists PRs
  // that are still open at the time of the API call), and by the time this
  // runs the PR is always already merged/closed. head_sha is a plain commit
  // SHA comparison and doesn't have that problem.
  const match = runs.workflow_runs.find((run) => run.head_sha === merged.head.sha)

  if (!match) {
    core.warning(`Found merged PR #${merged.number} but no completed pull_request run for it — skipping artifact reuse.`)
    core.setOutput('run_id', '')
    core.setOutput('conclusion', '')
    core.setOutput('pr_number', String(merged.number))
    core.setOutput('pr_title', merged.title || '')
    return
  }

  core.info(`PR #${merged.number} → CI run ${match.id} (${match.conclusion})`)
  core.setOutput('run_id', String(match.id))
  core.setOutput('conclusion', match.conclusion || 'unknown')
  core.setOutput('pr_number', String(merged.number))
  core.setOutput('pr_title', merged.title || '')
}
