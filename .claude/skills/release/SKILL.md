---
name: release
description: Bundle all unpushed commits on local main into a release — bump version, update CHANGELOG, run policy-align to fix any doc drift, commit it all under a single 🔖 release commit, push origin main, then create and push an annotated tag vX.Y.Z to trigger the Chrome Web Store release workflow. Use when the user wants to ship / release the current main branch.
---

# release

Roll the unpushed commits on local `main` into a single release: version bump + CHANGELOG + policy-align doc realignment, all in one 🔖 commit, push to `origin main`, then push an annotated tag `vX.Y.Z` to fire `.github/workflows/release.yml` (which uploads to the Chrome Web Store and creates a GitHub Release).

**Tag contract** (from `release.yml`): the workflow refuses to run unless (a) the tagged commit is on `origin/main` and (b) `vX.Y.Z` matches `package.json` exactly. So the order is **commit → push main → tag → push tag** — never tag before the commit reaches `origin/main`.

## Step 0 — Preconditions

- Must be on local `main`. If `git rev-parse --abbrev-ref HEAD` ≠ `main`, stop and tell the user to switch.
- Working tree must be clean (no uncommitted / staged changes, no untracked files worth committing). If dirty, stop — this skill operates on already-landed commits, not on the working copy.
- There must be unpushed commits on `main`. Run `git fetch origin main` (read-only) then `git log origin/main..HEAD --oneline`. If empty, stop — nothing to release.
- The proposed tag `vX.Y.Z` must not already exist locally or remotely. Run `git tag --list "v*"` and `git ls-remote --tags origin "v*"`. If it does, stop and tell the user — re-using a tag would either fail or republish a stale build.

## Step 1 — Inspect unpushed commits

Run in parallel:
- `git log origin/main..HEAD --oneline`
- `git log origin/main..HEAD` (full messages, for CHANGELOG wording)
- `git diff origin/main..HEAD --stat`
- `git diff origin/main..HEAD` — the full release diff
- `Read` `package.json` for the current `version`
- `Read` the top of `CHANGELOG.md` to confirm its latest header matches `package.json`

The **release diff** is the union of all unpushed commits — that is the surface used to classify the bump and to draft the CHANGELOG.

## Step 2 — Classify the bump

Walk the release diff, pick the **highest** category that applies:

| Bump | Triggers |
|---|---|
| **major** | Breaking change. `Message` variant **removed**; `TASKS_KEY` / storage key renamed or schema field removed without migration; manifest `permissions` / `host_permissions` host **removed**; provider **removed** from `PROVIDERS` in `src/lib/openrouter.ts`; privacy invariant weakened (`urlForPrompt` exposing more than `hostname` + `pathname`, `MAX_URL_TAIL_LEN` raised above 80, `MAX_INSTRUCTION_LEN` reduced below 512, telemetry/analytics introduced) |
| **minor** | New user-visible capability. New `Message` variant; new provider in `PROVIDERS`; new manifest permission/host **added**; new options/popup feature; new setting; new exported public function in `src/lib/` |
| **patch** | Bug fix, perf, internal refactor without API change, dependency bump, validation hardening, error-message wording, doc-only updates to PRIVACY.md / README.md that affect commitments |

There is no `none` path — you are releasing, so the version always bumps. If the release diff truly has no runtime change (only `.claude/`, internal docs, tests, comments), stop and tell the user this isn't a release.

Heuristics, applied in order — first match wins:

1. `manifest.config.ts` — permission/host **removed** → major; **added** → minor.
2. `src/lib/messages.ts` — variant removed → major; variant added → minor.
3. `src/lib/openrouter.ts` `PROVIDERS` — provider removed → major; added → minor.
4. `src/lib/openrouter.ts` constants (`MAX_URL_TAIL_LEN`, `MAX_INSTRUCTION_LEN`, `MAX_AI_SUMMARY_LEN`) — value relaxed past the number documented in PRIVACY.md / README.md → **stop and ask the user**; this is likely a privacy/contract regression.
5. `src/lib/storage.ts` / `src/lib/tasks.ts` — `TASKS_KEY` rename, schema field removed, `withTasksLock` / `pruneAndCap` weakened, cap constants reduced → major.
6. New file under `src/popup/`, `src/options/`, `src/lib/` that exports something new and is wired into a UI / message path → minor.
7. Anything else under `src/` that changes runtime behaviour → patch.

Tie-breakers:
- If unsure between two categories, pick the **lower** and explain why in the proposal — the user can override.
- Mixed diffs (feature + fix together) take the **highest** category.
- If the release diff touches PRIVACY.md / README.md *commitments* (numbers, host list, permission table) the underlying code change must justify it — flag any drift before committing.

## Step 3 — Run policy-align

Walk the checks in [`../policy-align/SKILL.md`](../policy-align/SKILL.md) against the working tree as it stands after the unpushed commits (i.e. right now):

1. Privacy invariant (`urlForPrompt` only exposes `hostname` + `pathname`, no raw `tab.url` / page content)
2. Endpoint allowlist matches `manifest.config.ts host_permissions` and PRIVACY.md / README.md host list
3. No telemetry / analytics / developer-controlled servers
4. API key only in `chrome.storage.sync`, only in `Authorization` header
5. Storage bucket discipline (TASKS_KEY writes only via `withTasksLock`)
6. Constants match documented numbers (`MAX_URL_TAIL_LEN` = 80, `MAX_INSTRUCTION_LEN` = 512, `ARCHIVE_TTL_MS` = 7 d)
7. LLM output validation rules in `openrouter.ts` (whitelist, dedup, ≥ 2 tabs, summary truncation, reclassify cross-group filter)
8. Prompt language lock (`zh` → 繁體中文, `en` → English, regardless of user instruction)
9. Manifest `permissions` / `host_permissions` match PRIVACY.md table
10. CHANGELOG / version sanity (top entry header matches `package.json`)

For each finding:
- **Critical** drift (privacy invariant broken, telemetry introduced, key leaving sync, undocumented host) → **stop and ask the user**. Do not silently rewrite docs to paper over a contract regression — the *code* is the bug.
- **Medium** drift confined to docs (PRIVACY.md / README.md / CLAUDE.md text: host list, permission table, "Last updated" date, version-dependent numbers) → **fix in this release** by editing the doc to match code, and list the fixes in the proposal.
- All clean → no doc edits needed; note "policy: pass" in the proposal anyway, so the user knows the audit ran.

## Step 4 — Compose CHANGELOG entry

CHANGELOG.md is in **繁體中文**, Keep a Changelog format. Insert the new block **above** the most recent version block, separated by a blank line. Date: today's date (from the `# currentDate` block in CLAUDE.md context), format `YYYY-MM-DD`.

Walk the unpushed commit list, group by intent:

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

Only include sections that apply. Bullets: short noun-led 繁體中文 phrases, matching tone of prior entries (look at the 0.4.0 / 0.3.1 blocks). Each bullet should map back to one or more of the unpushed commits.

## Step 5 — Compose commit message and tag message

**Commit message** format — subject-only, literal:

```
🔖 vX.Y.Z
```

No description, no body, no `+ changelog + policy` suffix, no `release` word. The CHANGELOG already records what shipped — the commit subject doesn't repeat it. The `v` prefix matches the tag name.

**Do not** add a `Co-Authored-By:` trailer. The repo convention is to omit it.

**Tag**: annotated tag named exactly `vX.Y.Z` (the `v` prefix is required by `release.yml` — `on: push: tags: 'v*'`). The tag message matches the commit subject:

```
🔖 vX.Y.Z
```

## Step 6 — Propose, then confirm

Output a single proposal to the user — nothing else, no preamble:

```
Branch:    main (N commits ahead of origin/main)
Commits:   <one `<sha> <subject>` line per unpushed commit>
Bump:      <patch X.Y.Z → X.Y.(Z+1) | minor → X.(Y+1).0 | major → (X+1).0.0>
Reason:    <one sentence — the specific diff signal that drove the choice>
Policy:    <pass | medium drift fixed: <files> | critical drift — STOP>
Files:     package.json, CHANGELOG.md[, <any policy-align doc fixes>]
Message:   🔖 vX.Y.Z
Tag:       vX.Y.Z (annotated) — triggers .github/workflows/release.yml (Chrome Web Store upload + GitHub Release)
CHANGELOG:
<the entry block to be inserted, verbatim>
```

Then ask: `Proceed with release commit, push main, and tag push (CI will publish to Chrome Web Store)?`. Wait for explicit confirmation. **Do not** edit files, stage, commit, push, or tag before the user says yes. If they want to adjust the bump, the message, the CHANGELOG, or the policy fix list, regenerate the proposal and ask again.

## Step 7 — Execute (only after the user confirms)

In order — and order matters for the CI tag check:

1. `Edit` `package.json` to update `"version"`. **Do not** edit `manifest.config.ts` — it derives from `pkg.version`.
2. `Edit` `CHANGELOG.md` to insert the new block above the previous one.
3. Apply any policy-align doc fixes from Step 3 (PRIVACY.md / README.md / etc.).
4. Stage with explicit paths only — `git add package.json CHANGELOG.md <doc-files>`. Never `git add -A` or `git add .`.
5. Commit using the heredoc form, no Co-Authored-By trailer:
   ```
   git commit -m "$(cat <<'EOF'
   🔖 vX.Y.Z
   EOF
   )"
   ```
6. `git status` to confirm the commit landed and the tree is clean.
7. `git push origin main`. The user authorised the push in Step 6 — do not re-prompt.
   - If the push is rejected (non-fast-forward — someone pushed first): **stop and ask the user**. Do not force-push, do not pull-rebase silently. Show `git status` + the rejection message. **Do not create the tag** — the release is on hold until main is sorted.
8. Create the annotated tag on the just-pushed commit:
   ```
   git tag -a vX.Y.Z -m "$(cat <<'EOF'
   🔖 vX.Y.Z
   EOF
   )"
   ```
9. `git push origin vX.Y.Z` — this fires the Chrome Web Store release workflow.
10. Report back to the user: the new version, the commit SHA, the tag, and a link to the Actions tab so they can watch the workflow (`https://github.com/<owner>/<repo>/actions`). Use `git remote get-url origin` to derive the owner/repo if needed.

If a pre-commit hook fails at step 5: investigate the cause, fix it, re-stage, and create a **new** commit. Do not `--amend`, do not `--no-verify`.

If tag creation or tag push fails at step 8 / 9: the commit is already on `origin/main` — do not try to undo it. Report the failure plainly and let the user retry the tag manually.

## Out of scope

- Force-pushing `main` or force-updating an existing tag — never, regardless of approval. The CI workflow assumes tags are immutable.
- Editing `manifest.config.ts` for the version field (reads from `package.json`).
- Editing `.github/workflows/release.yml` — the workflow contract (tag name, version match, on-main check) is load-bearing for this skill; changes to it need their own discussion.
- Storage / schema migrations — those are major bumps with their own discussion that must happen *before* this skill runs.
- Splitting unpushed commits into multiple releases — if the user wants two releases out of N commits, they need to do the split first.
- Opening a PR — `main` is the release branch here; this skill ships directly.
- Re-publishing an existing version (deleting + recreating a tag) — Chrome Web Store also rejects re-uploads of the same version. Bump the patch instead.
