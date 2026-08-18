/**
 * .github/scripts/cleanup-artifacts.js
 *
 * Deletes workflow-run artifacts older than the retention window, except AI
 * reports / self-healing summaries / test-failure artifacts, which are kept
 * longer for post-mortem review.
 *
 * Invoked from playwright.yml via actions/github-script:
 *   script: |
 *     const cleanup = require('./.github/scripts/cleanup-artifacts.js')
 *     await cleanup({ github, context })
 */

const RETENTION_DAYS = 7
const KEEP_LONGER_PREFIXES = ['ai-analysis', 'self-healing', 'test-artifacts']

module.exports = async ({ github, context }) => {
  const { data: artifacts } = await github.rest.actions.listWorkflowRunArtifacts({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId,
  })

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000

  for (const artifact of artifacts.artifacts) {
    if (KEEP_LONGER_PREFIXES.some(prefix => artifact.name.startsWith(prefix))) {
      continue
    }

    const created = new Date(artifact.created_at).getTime()
    if (created < cutoff) {
      console.log(`🗑️ Deleting old artifact: ${artifact.name}`)
      await github.rest.actions.deleteArtifact({
        owner: context.repo.owner,
        repo: context.repo.repo,
        artifact_id: artifact.id,
      })
    }
  }
}
