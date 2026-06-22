"""Salla Partners Agent Kit — Hermes plugin.

Auto-registers every skill under ../.agents/skills/ as a Hermes skill.

Skills live in the canonical tree at the repo root (`.agents/skills/`), shared
with the Claude, Cursor, Codex, and Gemini client manifests. Hermes loads them
on demand via:

    skill_view("salla-partners:<skill-name>")

There is no `hermes salla` CLI passthrough: a Salla Partner acts through the
remote Salla Partners MCP server (see ../.mcp.json and docs/getting-started.md),
not a local CLI.
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# The plugin folder is `.hermes-plugin/`, which sits next to `.agents/` in the
# salla-partners-agent-kit repo. install.sh symlinks .hermes-plugin/ into
# ~/.hermes/plugins/, so resolve() before walking up — otherwise the parent is
# the symlink directory (~/.hermes/plugins) and .agents/skills/ is missing.
_PLUGIN_DIR = Path(__file__).resolve().parent
_SKILLS_DIR = _PLUGIN_DIR.parent / ".agents" / "skills"


def _discover_skills() -> list[tuple[str, Path]]:
    """Return (skill_name, SKILL.md path) for every shared skill."""
    if not _SKILLS_DIR.is_dir():
        logger.warning(".agents/skills/ directory missing at %s", _SKILLS_DIR)
        return []

    found: list[tuple[str, Path]] = []
    for child in sorted(_SKILLS_DIR.iterdir()):
        if not child.is_dir():
            continue
        skill_md = child / "SKILL.md"
        if skill_md.is_file():
            found.append((child.name, skill_md))
        else:
            logger.debug("Skipping %s — no SKILL.md", child.name)
    return found


def register(ctx) -> None:
    """Hermes entry point. Called once at startup."""
    skills = _discover_skills()
    for skill_name, skill_md in skills:
        ctx.register_skill(skill_name, skill_md)
    logger.info("salla-partners: registered %d skills", len(skills))
