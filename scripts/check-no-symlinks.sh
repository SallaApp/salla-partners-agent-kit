#!/usr/bin/env sh
# Fail if the distributable plugin contains ANY symlink (excluding .git / node_modules).
#
# Tracked in-tree symlinks (the old .cursor/skills + .github/skills mirrors) make the
# Codex/Cursor installers crash with Node fs.cp ERR_FS_CP_EINVAL. The plugin must ship a
# single real skill tree (.agents/skills/) and no symlinks.
set -eu

found=$(find . -path './.git' -prune -o -path './node_modules' -prune -o -type l -print)

if [ -n "$found" ]; then
  echo "✗ Symlinks found (not allowed — they break Codex/Cursor plugin install):"
  echo "$found"
  exit 1
fi

echo "✓ No symlinks in the distributable tree"
