#!/usr/bin/env node
/**
 * codex-implement.mjs
 *
 * Sends a task + refined plan to OpenAI Codex for implementation.
 * Codex will make actual file changes in the working directory.
 *
 * Input (JSON on stdin):
 *   { "task": "task description", "plan": "refined implementation plan", "context": "relevant file contents" }
 *
 * Output (stdout): Summary of changes made, plus a git diff.
 *
 * Usage:
 *   echo '{"task":"...","plan":"...","context":"..."}' | node scripts/codex-implement.mjs [workdir]
 */

import { execSync } from "node:child_process";

const globalRoot = execSync("npm root -g", { encoding: "utf-8" }).trim();
const { Codex } = await import(`${globalRoot}/@openai/codex-sdk/dist/index.js`);

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  const { task, plan, context } = input;

  if (!task || !plan) {
    console.error("Error: Both 'task' and 'plan' fields are required in stdin JSON.");
    process.exit(1);
  }

  const workdir = process.argv[2] || process.cwd();

  const codex = new Codex();
  const thread = codex.startThread({ workingDirectory: workdir });

  let prompt = `You are a senior software engineer. Implement the following task according to the plan.

## Task
${task}

## Implementation Plan
${plan}`;

  if (context) {
    prompt += `

## Codebase Context
The following are relevant file contents from the codebase:

${context}`;
  }

  prompt += `

## Instructions
- Implement ALL changes described in the plan.
- Create, modify, or delete files as needed.
- Follow existing code conventions in the repository.
- Write clean, well-structured code.
- Include appropriate error handling.
- After making changes, provide a summary of what you did.`;

  const turn = await thread.run(prompt);
  const text = extractText(turn);

  // Capture a diff of what changed
  let diff = "";
  try {
    diff = execSync("git diff && git diff --cached", {
      cwd: workdir,
      encoding: "utf-8",
      timeout: 10000,
    });
  } catch {
    // Not a git repo or git not available; skip diff
  }

  // Capture untracked files
  let untracked = "";
  try {
    untracked = execSync("git ls-files --others --exclude-standard", {
      cwd: workdir,
      encoding: "utf-8",
      timeout: 10000,
    });
  } catch {
    // ignore
  }

  process.stdout.write("## Codex Implementation Summary\n\n");
  process.stdout.write(text);

  if (diff) {
    process.stdout.write("\n\n## Git Diff of Changes\n\n```diff\n");
    process.stdout.write(diff);
    process.stdout.write("\n```\n");
  }

  if (untracked.trim()) {
    process.stdout.write("\n\n## New Files Created\n\n");
    for (const f of untracked.trim().split("\n")) {
      process.stdout.write(`- ${f}\n`);
    }
  }
}

function extractText(turn) {
  if (typeof turn === "string") return turn;
  if (turn?.message?.content) return turn.message.content;
  if (turn?.content) {
    if (typeof turn.content === "string") return turn.content;
    if (Array.isArray(turn.content)) {
      return turn.content
        .filter((c) => c.type === "text" || c.type === "output_text")
        .map((c) => c.text)
        .join("\n");
    }
  }
  if (turn?.text) return turn.text;
  return JSON.stringify(turn, null, 2);
}

main().catch((err) => {
  console.error("codex-implement failed:", err.message || err);
  process.exit(1);
});
