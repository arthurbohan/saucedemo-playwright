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
# Required env vars:
#   E2E_STATUS, API_STATUS        — needs.test-e2e.result / needs.test-api.result
#   EVENT_NAME                    — github.event_name
#   PR_NUMBER, PR_TITLE           — set only when EVENT_NAME == 'pull_request'
#   REF_NAME                      — github.ref_name
#   REPO_OWNER, REPO_NAME         — github.repository_owner / repo name
#   RUN_URL                       — link to this Actions run
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
else
  TRIGGER="Push to ${REF_NAME}"
fi

MESSAGE="*Playwright Tests — ${STATUS_ICON}*

Status: ${STATUS_TEXT}
Trigger: ${TRIGGER}
Commit: ${COMMIT_SHA}

E2E: ${E2E_STATUS}
API: ${API_STATUS}

📊 [Allure Report](${ALLURE_URL})
🔗 [GitHub Actions](${RUN_URL})"

# Append a short AI-analysis snippet if one was downloaded
if [[ -n "${AI_SUMMARY_PATH:-}" && -f "$AI_SUMMARY_PATH" ]]; then
  AI_SNIPPET=$(grep -v "^#\|^---\|^$" "$AI_SUMMARY_PATH" | head -5 | tr '\n' ' ')
  if [[ -n "$AI_SNIPPET" ]]; then
    MESSAGE="${MESSAGE}

AI Analysis (brief):
${AI_SNIPPET}
(full analysis available in GitHub Actions logs)"
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
