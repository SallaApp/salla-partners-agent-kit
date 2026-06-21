#!/usr/bin/env bash
# Find every blog-link occurrence in the repo (e.g. https://salla.dev/blog/...).
#
# Blog posts are volatile — they get renamed, moved, or deleted — so prefer the
# stable docs.salla.dev references in skills. This script lists where blog links
# live so they can be reviewed or replaced.
#
# Usage:
#   scripts/find-blog-links.sh                      # audit: report links, exit 0
#   scripts/find-blog-links.sh <regex>              # custom extended-regex URL pattern
#   BLOG_LINKS_FAIL=1 scripts/find-blog-links.sh    # CI gate: exit 1 if any found
#
# Exit code: 0 by default (so `npm run find-blog-links` audits without an npm error); exits 1
# only when BLOG_LINKS_FAIL=1 and links are found, keeping CI enforcement opt-in.

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

# Audit runs exit 0; opt into a non-zero CI gate with BLOG_LINKS_FAIL=1.
if [ "${BLOG_LINKS_FAIL:-0}" = "1" ]; then
  exit 1
fi
exit 0
