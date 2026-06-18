#!/usr/bin/env bash
# Find every blog-link occurrence in the repo (e.g. https://salla.dev/blog/...).
#
# Blog posts are volatile — they get renamed, moved, or deleted — so prefer the
# stable docs.salla.dev references in skills. This script lists where blog links
# live so they can be reviewed or replaced.
#
# Usage:
#   scripts/find-blog-links.sh              # default: any http(s) URL with "/blog/"
#   scripts/find-blog-links.sh <regex>      # custom extended-regex URL pattern
#
# Exit code: 0 if none found, 1 if any blog links exist (handy as a CI gate).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERN="${1:-https?://[A-Za-z0-9._-]+/blog/[A-Za-z0-9._/?#=&%-]*}"

# Tracked files only (respects .gitignore) when in a git repo; else recurse.
if git rev-parse --git-dir >/dev/null 2>&1; then
  matches="$(git grep -nIoE "$PATTERN" -- . ':(exclude)scripts/find-blog-links.sh' 2>/dev/null || true)"
else
  matches="$(grep -rnIoE --exclude-dir=.git --exclude-dir=node_modules \
    --exclude=find-blog-links.sh "$PATTERN" . 2>/dev/null | sed 's|^\./||' || true)"
fi

if [ -z "$matches" ]; then
  echo "✓ No blog links found."
  exit 0
fi

count="$(printf '%s\n' "$matches" | wc -l | tr -d ' ')"
echo "Found $count blog-link occurrence(s):"
echo
printf '%s\n' "$matches"
echo
echo "Unique URLs ($(printf '%s\n' "$matches" | sed -E 's/^[^:]+:[0-9]+://' | sort -u | wc -l | tr -d ' ')):"
printf '%s\n' "$matches" | sed -E 's/^[^:]+:[0-9]+://' | sort -u | sed 's/^/  /'

exit 1
