#!/bin/zsh
# Runs the drug-list change check unattended (from launchd) and shows a macOS notification when something
# changed. Output is appended to the log file given as the first argument.
set -u
cd "$(dirname "$0")/.." || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
LOG="${1:-/dev/stdout}"

{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') drug-list check"
  OUTPUT="$(npm run --silent formularies:check 2>&1)"
  STATUS=$?
  echo "$OUTPUT"
  echo "exit code: $STATUS"
} >> "$LOG"

if [ "$STATUS" -ne 0 ] || print -r -- "$OUTPUT" | grep -q '^LOOK'; then
  osascript -e 'display notification "An insurer changed or posted a drug list. See the log, then rebuild the lists." with title "Medical Insurance Hunter"'
fi
exit 0
