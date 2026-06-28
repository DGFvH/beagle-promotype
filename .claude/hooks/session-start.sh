#!/bin/bash
# SessionStart hook for Claude Code on the web.
# Installs npm dependencies so build/dev/preview work in cloud sessions.
set -euo pipefail

# Only run in the remote (Claude Code on the web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

echo "[session-start] Installing npm dependencies..."
npm install

echo "[session-start] Dependencies ready."
