---
name: commit-and-push-current-diff
description: Review, validate, commit, and push all intended changes currently present in the active Git worktree. Use when the user asks to commit and push the current diff, working tree, staged and unstaged changes, or all local repository changes to the current branch.
---

# Commit and Push Current Diff

Commit only the changes already present when invoked, including new skill files created as part of the user's current request. Preserve unrelated user edits and never rewrite history.

## Workflow

1. Inspect repository and branch state with `git status --short --branch`, `git diff --stat`, `git diff`, `git diff --cached`, and `git log -5 --oneline`.
2. List untracked files explicitly. Inspect their contents or metadata sufficiently to identify generated artifacts, secrets, credentials, environment files, and unexpectedly large files.
3. Determine whether every change belongs in the requested commit. Do not discard, rewrite, or exclude an ambiguous change silently. Ask the user only when inclusion is materially unclear or unsafe.
4. Run the smallest relevant validation for the changed files. Prefer repository-defined checks. For this repository, run `npm run build` and `npm run test:sites` when the diff affects the app, runtime, hosting, worker, or Sites handoff. For documentation-only or skill-only changes, run the directly applicable validator instead.
5. Derive a concise commit message from the actual diff and follow the repository's recent commit style. Do not ask for a message unless the user supplied one or the intent cannot be represented accurately.
6. Stage the intended current worktree changes with explicit paths when practical. Use `git add -A` only after confirming the entire worktree is in scope.
7. Review `git diff --cached --stat` and `git diff --cached` before committing. Verify that no secret, credential, local environment file, or unintended artifact is staged.
8. Create one non-amended commit. Do not use `--no-verify`, change Git configuration, amend an existing commit, rebase, force-push, or bypass hooks unless the user explicitly requests it.
9. Push the current branch to its configured upstream. If no upstream exists, use `git push -u origin <current-branch>` only after confirming `origin` is the intended remote. Never push to a different branch implicitly.
10. Verify the final state with `git status --short --branch` and report the commit hash, subject, pushed remote/branch, validation results, and any remaining changes.

## Failure handling

- If validation or a commit hook fails, stop and report the failure. Fix it only when the fix is clearly within the user's requested scope; otherwise request direction.
- If the remote rejects the push, inspect the reason. Do not force-push. Report divergence or authentication problems with the safest next action.
- If the push requires network or credential approval, request the required approval and continue after it is granted.
- Never claim success until the commit exists locally and the push is confirmed by Git.
