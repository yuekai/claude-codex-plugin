---
name: codex
description: Orchestrates a collaborative workflow where Claude creates a plan, OpenAI Codex reviews it, Claude refines, then Codex implements the code changes. Use when you want Codex to review your plans and write the implementation code.
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, Agent
argument-hint: <task description>
---

# Codex Collaborative Workflow

You orchestrate a collaborative coding workflow between Claude and OpenAI Codex. Claude handles planning and orchestration, Codex handles plan review and code implementation.

## Task
$ARGUMENTS

## Workflow

### Phase 1: Explore and Plan

1. **Understand the task**: Read the task description above. Explore the codebase as needed using Read, Grep, and Glob to understand the current state, existing patterns, and relevant files.

2. **Create an initial plan**: Write a detailed implementation plan that includes:
   - Files to create or modify (with full paths)
   - Key architectural decisions and rationale
   - Step-by-step implementation order
   - Edge cases and error handling considerations
   - Relevant existing code patterns to follow

### Phase 2: Codex Plan Review

3. **Get Codex review**: Invoke the `codex-plan-reviewer` agent. Pass it the original task and your detailed plan. The agent will gather relevant file contents and send everything to Codex for review.

   Example Agent invocation:
   ```
   Review this implementation plan.

   ## Task
   <the original task from $ARGUMENTS>

   ## Plan
   <your detailed plan>

   ## Files to gather context from
   <list the key files the reviewer should read>
   ```

4. **Process Codex's feedback**: Read the review carefully. For each issue:
   - **Critical**: Must be resolved before proceeding
   - **Important**: Should be resolved unless you have a strong counterargument
   - **Minor**: Consider resolving; note if intentionally skipped

5. **Refine the plan**: Produce an updated plan that incorporates Codex's feedback. Note what was changed and why.

### Phase 3: Codex Implementation

6. **Invoke Codex implementer**: Pass the task and refined plan to the `codex-implementer` agent. The agent will gather relevant source files and send everything to Codex for implementation.

   Example Agent invocation:
   ```
   Implement the following task according to the refined plan.

   ## Task
   <the original task from $ARGUMENTS>

   ## Refined Plan
   <the refined plan incorporating Codex's review feedback>

   ## Files to gather context from
   <list the key files the implementer should read before sending to Codex>
   ```

7. **Review results**: Examine the implementation summary and diff returned by the implementer. Use Read, Grep, and Glob to verify the changes in the actual files. Check for:
   - Correctness and completeness
   - Code quality and consistency with existing patterns
   - No unintended side effects

### Phase 4: Report

8. **Report to user**: Provide a clear summary including:
   - What was planned (brief)
   - Key feedback from Codex's review (brief)
   - What was implemented (the diff or summary of changes)
   - Any concerns or follow-up items

## Error Handling

- If the Codex review script fails (e.g., not authenticated), inform the user they need to run `codex login` or set `CODEX_API_KEY`, and offer to proceed without Codex review.
- If the Codex implementation fails, inform the user and offer to implement the refined plan yourself using standard Claude Code tools.
- If changes look incorrect after implementation, flag specific concerns to the user rather than silently accepting them.
