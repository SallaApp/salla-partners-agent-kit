# Salla Partners AI Plugin Foundation

A foundation for building an AI coding assistance plugin (Claude, Gemini, Copilot, and more) to guide agents with the right skills, commands, agents, and hooks for Salla app development.

## Installation

To add this plugin to your workspace:

```bash
npx skills add SallaApp/salla-partners-ai-plugin
```

## Repository Structure

The core capability of this plugin is the `salla-app-builder` skill which provides the following reference documents:

- **[SKILL.md](skills/salla-app-builder/SKILL.md):** Main entry point mapping developer queries to reference files.
- **[app-functions.md](skills/salla-app-builder/references/app-functions.md):** Writing Salla App Functions in TypeScript (execution context, sandbox constraints, Resp builder API).
- **[communication-app.md](skills/salla-app-builder/references/communication-app.md):** Schema and payload reference for Salla Communication App events.
- **[embedded-app.md](skills/salla-app-builder/references/embedded-app.md):** Configuring Embedded Pages, Salla SDK handshake, and the "No-Chrome" design rule.
- **[oauth.md](skills/salla-app-builder/references/oauth.md):** Implementing the webhook-based "Easy Mode" OAuth flow.
- **[salla-api.md](skills/salla-app-builder/references/salla-api.md):** Invoking Salla Admin API endpoints and reading/writing App Settings.
- **[webhooks.md](skills/salla-app-builder/references/webhooks.md):** Signature verification, retry policy, and lifecycle webhook events.

## Validation & Scoring

To evaluate the quality of the skill and its reference files locally using the LLM-as-a-judge validator:

```bash
# Score SKILL.md and all reference files:
skill-validator score evaluate skills/salla-app-builder --provider claude-cli

# Force a re-evaluation of scores (bypassing cache):
skill-validator score evaluate skills/salla-app-builder --provider claude-cli --rescore

# View scores for each individual reference file:
skill-validator score evaluate skills/salla-app-builder --provider claude-cli --rescore --display files
```

## Code Quality & Formatting

Before committing changes to any reference `.md` files, make sure to format them using Prettier:

```bash
pnpx prettier . --write
```
