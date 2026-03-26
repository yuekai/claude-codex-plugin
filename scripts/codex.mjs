#!/usr/bin/env node
/**
 * codex.mjs — Unified bridge to OpenAI Codex SDK.
 *
 * Input (JSON on stdin):
 *   {
 *     "prompt":           "(required) instruction to send to Codex",
 *     "model":            "(optional) model name",
 *     "reasoningEffort":  "(optional) medium|high|xhigh",
 *     "sandboxMode":      "(optional) read-only|workspace-write",
 *     "threadId":         "(optional) resume a previous thread"
 *   }
 *
 * Output (stdout):
 *   Codex response text, optionally followed by a git diff section,
 *   and a <!-- CODEX_THREAD_ID: {id} --> trailer.
 *
 * Usage:
 *   echo '{"prompt":"..."}' | node scripts/codex.mjs [workdir]
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
  const { prompt, model, reasoningEffort, sandboxMode, threadId } = input;

  if (!prompt) {
    console.error("Error: 'prompt' field is required in stdin JSON.");
    process.exit(1);
  }

  const workdir = process.argv[2] || process.cwd();

  const codex = new Codex();
  const threadOptions = { workingDirectory: workdir };
  if (model) threadOptions.model = model;
  if (reasoningEffort) threadOptions.modelReasoningEffort = reasoningEffort;
  if (sandboxMode) threadOptions.sandboxMode = sandboxMode;

  const thread = threadId
    ? codex.resumeThread(threadId, threadOptions)
    : codex.startThread(threadOptions);

  const turn = await thread.run(prompt);
  const text = extractText(turn);

  process.stdout.write(text);

  // Capture git diff when Codex had write access
  if (sandboxMode === "workspace-write") {
    let diff = "";
    try {
      diff = execSync("git diff && git diff --cached", {
        cwd: workdir,
        encoding: "utf-8",
        timeout: 10000,
      });
    } catch {
      // Not a git repo or git not available
    }

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

  process.stdout.write(`\n\n<!-- CODEX_THREAD_ID: ${thread.id} -->`);
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
  console.error("codex failed:", err.message || err);
  process.exit(1);
});
