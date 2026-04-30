---
name: commit
description: Analyze the working-tree diff, classify it as a SemVer bump (major / minor / patch / none), update package.json + CHANGELOG.md when appropriate, and create a commit with a message in the project's existing style. Use when the user asks to commit, ship, or release the current changes.
---

# commit

Automate the commit workflow for Tabby Grouper:

1. Inspect the diff.
2. Classify the change as **major / minor / patch / none** (SemVer).
3. Propose version bump + commit message; **confirm with the user** before writing anything.
4. On approval: bump `package.json` (manifest auto-syncs via `pkg.version`), insert a `CHANGELOG.md` entry for minor/major, stage with explicit paths, commit.

Never push. Never amend. Follow the git safety protocol in CLAUDE.md and the Bash-tool commit instructions (heredoc message, `Co-Authored-By: Claude Opus 4.7 (1M context)` trailer).

## Step 1 — Inspect

Run in parallel:
- `git status` (no `-uall`)
- `git diff` (unstaged)
- `git diff --staged`
- `git log --oneline -10`
- `Read` `package.json` for the current `version`

If the working tree is clean (nothing staged, nothing unstaged, no untracked files worth committing), stop and tell the user there is nothing to commit. Do not create an empty commit.

## Step 2 — Classify the bump

Walk the diff and pick the **highest** category that applies. SemVer in this codebase:

| Bump | Triggers |
|---|---|
| **major** | Breaking change. Examples: `Message` variant **removed**; `TASKS_KEY` / storage key renamed or schema field removed without migration; manifest `permissions` or `host_permissions` host **removed**; provider **removed** from `PROVIDERS` in `src/lib/openrouter.ts`; privacy invariant weakened (`urlForPrompt` exposing more than `hostname` + `pathname`, `MAX_URL_TAIL_LEN` raised above 80, `MAX_INSTRUCTION_LEN` reduced below 512, telemetry/analytics introduced) |
| **minor** | New user-visible capability. Examples: new `Message` variant **added**; new provider in `PROVIDERS`; new manifest permission/host **added**; new setting in options page; new popup/options UI feature; new exported public function in `src/lib/` |
| **patch** | Bug fix, perf, internal refactor without API change, dependency bump, validation hardening, error-message wording, doc-only updates to PRIVACY.md / README.md that affect commitments |
| **none** | No runtime behavior change. Examples: edits only under `.claude/`, `CLAUDE.md`, internal `*.md` (not PRIVACY/README), `*.test.ts`, comments, formatting. **Do not bump the version for these.** |

Heuristics, applied in order — first match wins:

1. `manifest.config.ts` — permission/host **removed** → major; **added** → minor.
2. `src/lib/messages.ts` — variant removed → major; variant added → minor.
3. `src/lib/openrouter.ts` `PROVIDERS` — provider removed → major; added → minor.
4. `src/lib/openrouter.ts` constants (`MAX_URL_TAIL_LEN`, `MAX_INSTRUCTION_LEN`, `MAX_AI_SUMMARY_LEN`) — value relaxed past the number documented in PRIVACY.md / README.md → **stop and ask the user**; this is likely a privacy/contract regression and should run `policy-align` first.
5. `src/lib/storage.ts` / `src/lib/tasks.ts` — `TASKS_KEY` rename, schema field removed, `withTasksLock` / `pruneAndCap` weakened, cap constants reduced → major.
6. Any new file under `src/popup/`, `src/options/`, `src/lib/` that exports something new and is wired into a UI/message path → minor.
7. Anything else under `src/` that changes runtime behavior → patch.
8. Only `.claude/`, root `*.md` (excluding PRIVACY.md / README.md / CHANGELOG.md), `*.test.ts`, comments, `.gitignore` → none.

Tie-breakers:
- If unsure between two categories, pick the **lower** and explain why in the proposal — the user can override.
- Mixed diffs (e.g. a new feature + a bug fix in the same commit) take the **highest** category.
- If the diff touches PRIVACY.md / README.md *commitments* (numbers, host list, permission table) the underlying code change must justify a corresponding bump — flag any drift to the user before committing.

## Step 3 — Compose the commit message

Style (verified from `git log`): English, single line, sentence case, leading verb (`Implement`, `Add`, `Update`, `Refactor`, `Fix`, `Enhance`, `Remove`). **No conventional-commit prefix** (`feat:` / `fix:`) — the codebase does not use them. Keep under ~70 chars when possible; use the body only if a one-liner cannot carry the why.

Reference shapes already in history:
- `Implement task name editing feature with UI updates and localization`
- `Add policy alignment audit skill and CLAUDE.md guidance for code practices`
- `Update privacy policy and README to clarify data handling and transmission details`
- `Release 0.3.1: Add multi-provider support and enhance settings`

For a **release** commit (any minor or major bump), prefix with `Release X.Y.Z:` to match prior release commits. For patch bumps, no prefix is needed unless the user wants to mark it as a release.

## Step 4 — CHANGELOG.md (only for minor / major)

`CHANGELOG.md` is in **繁體中文**, Keep a Changelog format. Insert the new entry **above** the most recent version block, separated from it by a blank line. Date format: `YYYY-MM-DD`, using today's date from the `# currentDate` block in CLAUDE.md context.

Template:

```
## [X.Y.Z] - YYYY-MM-DD

### 新增
- ...

### 變更
- ...

### 修正
- ...

### 移除
- ...
```

Only include the sections that apply. Bullet style: short noun-led phrases in 繁體中文, matching existing entries (see the 0.3.1 / 0.3.0 blocks for tone).

For **patch** and **none**, do not touch CHANGELOG.md.

## Step 5 — Propose, then confirm

Output a single proposal to the user — nothing else, no preamble:

```
Bump:      <none | patch X.Y.Z → X.Y.(Z+1) | minor X.Y.Z → X.(Y+1).0 | major X.Y.Z → (X+1).0.0>
Reason:    <one sentence — the specific diff signal that drove the choice>
Files:     <explicit paths to be staged>
Message:   <proposed commit message, exactly as it will be written>
CHANGELOG: <none | the entry block to be inserted>
```

Then ask: `Proceed?`. Wait for the user's confirmation. **Do not** edit, stage, or commit before they say yes. If they ask to adjust the bump, the message, or the file list, regenerate the proposal and ask again.

## Step 6 — Execute (only after the user confirms)

In order:

1. If bumping: `Edit` `package.json` to update `"version"`. **Do not** edit `manifest.config.ts` — it derives from `pkg.version`.
2. If a CHANGELOG entry was proposed: `Edit` `CHANGELOG.md` to insert the new block above the previous one.
3. Stage with explicit paths only — `git add <path1> <path2> …`. Never `git add -A` or `git add .`.
4. Commit using the heredoc form (per CLAUDE.md), with the `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer.
5. Run `git status` to confirm the commit landed and the tree is clean.

If a pre-commit hook fails: investigate the cause, fix it, re-stage, and create a **new** commit. Do not `--amend` and do not `--no-verify`.

## Out of scope

- Pushing, opening PRs, tagging releases — leave those to the user.
- Splitting a large diff into multiple commits — you may suggest it in the proposal, but let the user drive the split.
- Editing `manifest.config.ts` for the version field (it reads from `package.json`).
- Touching `chrome.storage.local` migration logic without an explicit user request — schema changes are major bumps and need their own discussion.
