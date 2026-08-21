#!/usr/bin/env bash
#
# .github/scripts/notify-telegram.sh
#
# Sends the run status to Telegram, with a short AI-analysis snippet
# attached when the run failed and an analysis was generated.
#
# All untrusted values (PR title, ref name, etc.) come in via env vars set
# by the workflow — never interpolate ${{ }} directly into this file, that
# reintroduces the script-injection risk this extraction exists to avoid.
#
# Runs in three contexts:
#   1. CI, on push to main (the merge landing) — see on-merge.yml. Reports on
#      find-pr-run's resolved pr-checks.yml run rather than a fresh one.
#   2. CI, on workflow_dispatch — see full-regression.yml. A heavy/full
#      regression run, deliberately kept off the PR gate; reports on itself.
#   3. Locally, via .github/scripts/runRegression.sh (EVENT_NAME=local) — the
#      same full regression, run from a laptop instead of CI.
#
# Required env vars:
#   E2E_STATUS, API_STATUS        — both carry find-pr-run's single overall conclusion
#   EVENT_NAME                    — 'pull_request', 'merged', 'manual' (full-regression.yml), or 'local'
#   PR_NUMBER                     — the merged PR's number, from find-pr-run (empty outside context 1)
#   PR_TITLE                      — the merged PR's title, from find-pr-run (empty outside context 1)
#   TRIGGERED_BY                  — github.actor, only set for EVENT_NAME=manual
#   REF_NAME                      — github.ref_name
#   REPO_OWNER, REPO_NAME         — github.repository_owner / repo name
#   RUN_URL                       — link to the run being reported on
#   COMMIT_SHA                    — github.sha
#   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
#   AI_SUMMARY_PATH                — path to ai-analysis-summary.md, if downloaded

set -euo pipefail

if [[ "$E2E_STATUS" == "success" && "$API_STATUS" == "success" ]]; then
  STATUS_ICON="PASSED"
  STATUS_TEXT="All tests passed"
elif [[ "$E2E_STATUS" == "cancelled" || "$API_STATUS" == "cancelled" ]]; then
  STATUS_ICON="CANCELLED"
  STATUS_TEXT="Run was cancelled"
else
  STATUS_ICON="FAILED"
  STATUS_TEXT="Tests failed"
fi

ALLURE_URL="https://${REPO_OWNER}.github.io/${REPO_NAME}/"

if [[ "$EVENT_NAME" == "pull_request" ]]; then
  TRIGGER="PR #${PR_NUMBER}: ${PR_TITLE}"
elif [[ "$EVENT_NAME" == "manual" ]]; then
  TRIGGER="Full regression, triggered by ${TRIGGERED_BY:-someone} (${REF_NAME})"
elif [[ "$EVENT_NAME" == "local" ]]; then
  TRIGGER="Local regression run (${REF_NAME})"
else
  TRIGGER="Push to ${REF_NAME}"
fi

# `merged` is a merge announcement, not a fresh test report — pr-checks.yml
# already had to pass for this push to exist, so there's no Allure report to
# link (that only gets (re)published from full-regression.yml / npm run
# regression, on demand) and no separate E2E/API breakdown to show.
if [[ "$EVENT_NAME" == "merged" ]]; then
  if [[ "$STATUS_ICON" == "PASSED" ]]; then
    MESSAGE="*Merged — PR #${PR_NUMBER}*

${PR_TITLE}
→ ${REF_NAME} · ${COMMIT_SHA}

✅ All required checks passed

🔗 [CI run](${RUN_URL})"
  else
    MESSAGE="*Merged — PR #${PR_NUMBER}*

${PR_TITLE}
→ ${REF_NAME} · ${COMMIT_SHA}

⚠️ pr-checks.yml did not report a clean pass (${E2E_STATUS}) for this commit — possibly a direct push that bypassed review.

🔗 [CI run](${RUN_URL})"
  fi
elif [[ "$EVENT_NAME" == "local" ]]; then
  # No CI run to link to, and the public Allure URL is whatever was last
  # published (a merge or a CI full-regression run) - showing it here would
  # read as this run's report when it is not. runRegression.sh already
  # opens the real one (npm run allure:open) right after this fires.
  MESSAGE="*Playwright Tests — ${STATUS_ICON}*

Status: ${STATUS_TEXT}
Trigger: ${TRIGGER}
Commit: ${COMMIT_SHA}

E2E: ${E2E_STATUS}
API: ${API_STATUS}

📄 Full report: allure-report/index.html (opened locally)"
else
  MESSAGE="*Playwright Tests — ${STATUS_ICON}*

Status: ${STATUS_TEXT}
Trigger: ${TRIGGER}
Commit: ${COMMIT_SHA}

E2E: ${E2E_STATUS}
API: ${API_STATUS}

📊 [Allure Report](${ALLURE_URL})
🔗 [GitHub Actions](${RUN_URL})"
fi

# Append a short AI-analysis snippet if one was downloaded — applies in any
# context (a failed manual/local regression, or a rare merged-but-failing
# bypass). Prefer the "Manual Tester Verdict" rollup (product bug vs
# test/environment issue, plain language, no code) over a blind first-lines
# grab — it's written for exactly this audience. Falls back to the old
# generic snippet for analyses that predate that section (e.g. a cache hit
# from before this prompt existed).
if [[ -n "${AI_SUMMARY_PATH:-}" && -f "$AI_SUMMARY_PATH" ]]; then
  # Each grep below legitimately finds nothing when its section is absent
  # (that IS the "try the next fallback" signal) — grep exits 1 on no
  # match, and under set -euo pipefail that would kill the whole script
  # right here instead of falling through, so every attempt is `|| true`.
  AI_SNIPPET=$(sed -n '/^## 🧭 Manual Tester Verdict$/,/^---$/p' "$AI_SUMMARY_PATH" | sed '1d;$d' | grep -v "^$" || true)
  if [[ -z "$AI_SNIPPET" ]]; then
    # No rollup section — a single-failure report skips it (see
    # reporter.ts) since it would just repeat the one Detailed Analysis
    # entry's own verdict back to back. Pull that verdict directly instead
    # of falling through to a blind first-lines grab, which would pick up
    # the Summary stats (already shown elsewhere in this message) first.
    AI_SNIPPET=$(sed -n '/^## Manual Verdict$/,/^## /p' "$AI_SUMMARY_PATH" | sed '1d;$d' | grep -v "^$" || true)
  fi
  if [[ -z "$AI_SNIPPET" ]]; then
    AI_SNIPPET=$(grep -v "^#\|^---\|^$" "$AI_SUMMARY_PATH" | head -5 | tr '\n' ' ' || true)
  fi
  if [[ -n "$AI_SNIPPET" ]]; then
    if [[ "$EVENT_NAME" == "local" ]]; then
      DETAIL_HINT="full analysis in ${AI_SUMMARY_PATH}"
    else
      DETAIL_HINT="full analysis available in GitHub Actions logs"
    fi
    MESSAGE="${MESSAGE}

AI Analysis (brief):
${AI_SNIPPET}
(${DETAIL_HINT})"
  fi
fi

curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${TELEGRAM_CHAT_ID}\",
    \"text\": $(printf '%s' "$MESSAGE" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
    \"parse_mode\": \"Markdown\",
    \"disable_web_page_preview\": false
  }"

# Send the full report as a file too, when there's a real failure analysis to attach
if [[ "$STATUS_ICON" == "FAILED" && -n "${AI_SUMMARY_PATH:-}" && -f "$AI_SUMMARY_PATH" ]]; then
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" \
    -F "chat_id=${TELEGRAM_CHAT_ID}" \
    -F "document=@${AI_SUMMARY_PATH}" \
    -F "caption=📄 AI Analysis Report" \
    -F "parse_mode=Markdown"
fi
