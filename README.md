# Claude Code ↔ Codex Integration Plugin

A Claude Code plugin that integrates OpenAI Codex as an autonomous subagent with thread resume support.

## How It Works

1. You invoke `/codex <task>` in Claude Code
2. Claude sends the task to Codex via the bridge script (directly or through subagents)
3. Codex autonomously explores the codebase, reads/writes files, and runs commands in a sandbox
4. Claude reviews the results, and can follow up with Codex using thread resume

### Two-planner workflow

For complex tasks, Claude can use the **second planner** subagent to get Codex's independent take on the implementation plan. Claude then synthesizes both plans before handing off to the **implementer** subagent for execution.

## Setup

1. Install the Codex SDK globally:
   ```bash
   npm install -g @openai/codex-sdk
   ```

2. Authenticate with Codex:
   - **Already logged in**: If you've run `codex login` or are authenticated with the Codex CLI, no extra setup is needed.
   - **API key**: Set `export CODEX_API_KEY=your-key-here` in your environment.

3. Load the plugin in Claude Code:
   ```bash
   claude --plugin-dir /path/to/claude-codex-integration
   ```

## Usage

```
/codex Add a REST API endpoint for user authentication
```

## Components

| Component | Path | Purpose |
|-----------|------|---------|
| Skill | `skills/codex/SKILL.md` | `/codex` slash command — teaches Claude how to use Codex |
| Bridge Script | `scripts/codex.mjs` | Node.js bridge to the Codex SDK (unified entry point with thread resume) |
| Second Planner | `agents/codex-second-planner.md` | Subagent that sends tasks to Codex for independent plan generation |
| Implementer | `agents/codex-implementer.md` | Subagent that sends tasks and plans to Codex for autonomous implementation |

## Requirements

- Node.js 18+
- Codex CLI authentication (via `codex login`) or `CODEX_API_KEY` env var
- Claude Code with plugin support
