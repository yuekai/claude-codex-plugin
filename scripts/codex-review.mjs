#!/usr/bin/env node
/**
 * codex-review.mjs
 *
 * Sends a plan to OpenAI Codex for review and returns feedback.
 *
 * Input (JSON on stdin):
 *   { "task": "original task description", "plan": "the plan to review", "context": "relevant file contents" }
 *
 * Output (stdout): Codex's review feedback as plain text.
 *
 * Usage:
 *   echo '{"task":"...","plan":"...","context":"..."}' | node scripts/codex-review.mjs [workdir]
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

  let prompt = `You are a senior software architect reviewing an implementation plan.

## Original Task
${task}

## Proposed Plan
${plan}`;

  if (context) {
    prompt += `

## Codebase Context
The following are relevant file contents from the codebase:

${context}`;
  }

  prompt += `

## Your Review Instructions
Please review this plan critically. For each concern, provide:
1. **Issue**: What is wrong or could be improved
2. **Severity**: Critical / Important / Minor
3. **Suggestion**: A concrete alternative or fix

Also note what aspects of the plan are good and should be kept.

End with a summary: should the plan be accepted as-is, accepted with minor changes, or needs major revision?`;

  const turn = await thread.run(prompt);
  const text = extractText(turn);
  process.stdout.write(text);
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
  console.error("codex-review failed:", err.message || err);
  process.exit(1);
});
