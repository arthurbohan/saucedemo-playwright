/**
 * .github/scripts/find-pr-run.js
 *
 * On pull_request:closed (merged == true), finds the pull_request-triggered
 * CI run that already tested this exact code, so publish-allure and
 * notify-telegram can reuse its artifacts instead of re-running the whole
 * suite a second time.
 *
 * The trigger event hands us the PR's head SHA directly
 * (context.payload.pull_request.head.sha) — no need to guess which PR a
 * commit belongs to, so this is just a direct lookup by that SHA. Works for
 * every merge strategy (merge commit, squash, rebase): head_sha is the last
 * commit of the PR branch itself, unaffected by how it landed on main.
 *
 * Invoked from playwright.yml via actions/github-script:
 *   script: |
 *     const find = require('./.github/scripts/find-pr-run.js')
 *     await find({ github, context, core })
 */

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo
  const pr = context.payload.pull_request

  const { data: runs } = await github.rest.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: 'playwright.yml',
    event: 'pull_request',
    status: 'completed',
    per_page: 30,
  })

  const match = runs.workflow_runs.find((run) => run.head_sha === pr.head.sha)

  if (!match) {
    core.warning(`No completed pull_request run found for PR #${pr.number} (head ${pr.head.sha}) — skipping artifact reuse.`)
    core.setOutput('run_id', '')
    core.setOutput('conclusion', '')
    core.setOutput('pr_number', String(pr.number))
    return
  }

  core.info(`PR #${pr.number} → CI run ${match.id} (${match.conclusion})`)
  core.setOutput('run_id', String(match.id))
  core.setOutput('conclusion', match.conclusion || 'unknown')
  core.setOutput('pr_number', String(pr.number))
}
