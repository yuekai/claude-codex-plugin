---
name: codex
description: Delegate tasks to an OpenAI Codex subagent. Codex can autonomously read/write files, run shell commands, and search the web in a sandboxed environment. Supports thread resume for follow-up interactions.
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, Agent
argument-hint: <task description>
---

# Codex Subagent

Codex is an autonomous coding agent (powered by OpenAI) that can read/write files, run shell commands, and search the web — all within a sandboxed environment. You communicate with Codex by sending it a prompt via the bridge script and reading its response.

## Task
$ARGUMENTS

## How to Invoke Codex

Construct a JSON payload and pipe it to the bridge script:

```bash
node "$CLAUDE_SKILL_DIR/../../scripts/codex.mjs" /path/to/workdir <<'ENDJSON'
{
  "prompt": "Your instruction to Codex here",
  "sandboxMode": "workspace-write"
}
ENDJSON
```

Use a Bash timeout of 600000–1200000ms (Codex may take time for complex tasks).

Codex is autonomous — it will explore the codebase, read files, and run commands on its own. You don't need to pre-gather file context. Just describe the task clearly.

### Output Format

The script outputs:
1. Codex's response text
2. Git diff and new files list (when `sandboxMode` is `workspace-write`)
3. A thread ID trailer: `<!-- CODEX_THREAD_ID: {id} -->`

## Thread Resume

Each Codex response includes a thread ID. To continue a conversation — send follow-ups, request corrections, or iterate on prior work — pass the `threadId` field of the Codex response that you wish to follow up/iterate on:

```json
{
  "prompt": "The auth middleware looks good but needs rate limiting. Add it.",
  "sandboxMode": "workspace-write",
  "threadId": "thread_abc123"
}
```

This is the key advantage over Claude's native subagents: Codex retains full context from prior interactions. Use this to iterate rather than starting from scratch.

## Configuration

| Field | Values | Description |
|-------|--------|-------------|
| `sandboxMode` | `read-only`, `workspace-write` | Controls file system access |
| `reasoningEffort` | `medium`, `high`, `xhigh` | How much reasoning Codex applies |
| `model` | model name string | Override the default Codex model |

All configuration fields are optional. Omit them to use defaults.

## Subagents

Two specialized subagents are available for common patterns:

- **`codex-second-planner`**: Sends a task summary to Codex so it can independently explore the codebase and produce its own implementation plan. Pass it the task and a summary of your planning discussion with the user. After receiving Codex's plan, compare it with your own and synthesize a combined plan with the best parts of both.
- **`codex-implementer`**: Sends a task + plan to Codex for autonomous implementation in `workspace-write` mode. Pass it the task, a summary of the planning discussion, and the plan to implement. Codex will explore the codebase and make the changes. Returns a summary and git diff.

Both subagents handle JSON construction, script invocation, and thread ID extraction. Codex explores the codebase autonomously — no need to pre-gather file context.
