---
name: policy-align
description: Audit current code against the project's documented policies (PRIVACY.md, README.md, CLAUDE.md, manifest). Use when the user wants to verify code/policy alignment, before a release, or after touching network/storage/manifest code.
---

# Policy alignment audit

This skill audits the Tabby Grouper codebase against the policies it has committed to in `PRIVACY.md`, `README.md`, `CLAUDE.md`, and `manifest.config.ts`. The goal is **drift detection**: surface places where code no longer matches what the docs (and the Web Store listing) claim.

## How to run

Work through every section below in order. For each check:
1. Run the listed Grep / Read.
2. Compare against the **expected** value.
3. Record any mismatch as a finding.

At the end, output a single report grouped by severity. Do not modify code unless the user explicitly asks for fixes — this is an audit skill.

## 1. Privacy invariant: only title + hostname + ≤80 char path leaves the device

PRIVACY.md and README.md both promise: query strings and URL fragments are stripped before transmission; full URLs never leave the device.

Checks:
- `Grep` for `urlForPrompt` in `src/lib/openrouter.ts`. The function must:
  - parse via `new URL(url)`
  - use only `u.hostname` and `u.pathname` — **never** `u.search`, `u.hash`, `u.href`, or `url` (the raw arg) in the returned string
  - truncate path to `MAX_URL_TAIL_LEN` (80)
- `Grep` for `tab.url` and `\.url` inside the body of `buildUserPrompt` / `classifyTabs` / `reclassifyTabs` in `src/lib/openrouter.ts`. The raw `tab.url` must only flow through `urlForPrompt`, never directly into the prompt string or `JSON.stringify(...)` body.
- `Grep` for `pageContent|innerHTML|document\.body|chrome\.scripting|executeScript` across `src/`. None should exist — extension must not read tab content.
- Confirm `MAX_URL_TAIL_LEN = 80` in `src/lib/openrouter.ts`. If it differs from the "80 characters" claim in PRIVACY.md / README.md, that is a **critical** finding.

## 2. Endpoint allowlist matches manifest host_permissions

Expected endpoints (from `PROVIDERS` in `src/lib/openrouter.ts`):
- `https://openrouter.ai/api/v1/chat/completions`
- `https://api.openai.com/v1/chat/completions`
- `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`

Checks:
- `Grep` for `fetch\(` and `https://` across `src/`. Every outbound URL must point at one of the three hosts above. Any other host is a **critical** finding.
- The three hosts must each appear in `manifest.config.ts` `host_permissions`. Extra hosts in `host_permissions` that are no longer used in `PROVIDERS` are a **medium** finding (over-broad permission).
- The same three hosts are listed in PRIVACY.md (English + 繁中 sections) and README. If a provider was added or removed, both docs must reflect it.

## 3. No telemetry, analytics, or developer-controlled servers

PRIVACY.md commits: no Google Analytics, no telemetry, no tracking, no developer-operated server.

Checks:
- `Grep` for `analytics|telemetry|posthog|sentry|amplitude|mixpanel|googletagmanager|gtag\(|fetch.*paul\.yy|navigator\.sendBeacon` across `src/` and `package.json`. Any hit is **critical**.
- `Grep` for `chrome\.runtime\.sendNativeMessage` — should not appear.

## 4. API key handling

PRIVACY.md commits: API key only in `chrome.storage.sync`, only sent to the user-selected provider, only in the `Authorization` header (never in prompt body).

Checks:
- `Grep` for `apiKey` in `src/lib/openrouter.ts`. It must only appear in HTTP headers (`Authorization: Bearer ${apiKey}`), never in the messages array, system prompt, or user prompt.
- `Grep` for `apiKey` writes (`storage\.local\.set.*apiKey|storage\.session\.set.*apiKey`). API keys must only ever be written to `chrome.storage.sync`.
- `Grep` for `console\.(log|info|warn|error)` near apiKey — keys must not be logged.

## 5. Storage bucket discipline (CLAUDE.md table)

| Bucket | Allowed keys |
|---|---|
| `chrome.storage.sync` | `provider`, `apiKeys`, `models`, `lang`, `addDraggedTabPolicy`, `removeDraggedTabPolicy` |
| `chrome.storage.local` | `tabby:tasks:v1` (TASKS_KEY) |
| `chrome.storage.session` | `tabby:groupTaskMap`, `tabby:tabGroupCache`, `tabby:pendingResume`, `tabby:pendingAdditions` |

Checks:
- `Grep` for `chrome\.storage\.local\.set` across `src/`. Any write whose key includes `TASKS_KEY` or the literal `tabby:tasks` **must** be inside `src/lib/storage.ts` (`withTasksLock` path). Direct writes elsewhere are **critical** (breaks the lock invariant).
- `Grep` for each bucket and confirm no key is being written to the wrong bucket (e.g. `apiKey` to `local`, `tasks` to `sync`).

## 6. Constants match documented numbers

| Constant | Source of truth | Documented in |
|---|---|---|
| `ARCHIVE_TTL_MS` | `src/lib/tasks.ts` = `7 * 24 * 60 * 60 * 1000` | "7 天 / 7 days" in PRIVACY.md and README.md |
| `MAX_TASKS` | `src/lib/tasks.ts` = 200 | (internal cap, not user-facing — only check code) |
| `MAX_TABS_PER_TASK` | `src/lib/tasks.ts` = 200 | (internal cap) |
| `MAX_AI_SUMMARY_LEN` | `src/lib/tasks.ts` = 200 | (internal cap) |
| `MAX_INSTRUCTION_LEN` | `src/lib/openrouter.ts` = 512 | "512 字" in README.md and any popup textarea `maxlength` |
| `MAX_URL_TAIL_LEN` | `src/lib/openrouter.ts` = 80 | "80 characters / 80 字元" in PRIVACY.md and README.md |

Checks:
- Read each constant and the doc string. If they disagree, the **doc is authoritative** for user-facing promises (privacy, retention, instruction limit) — that's a critical drift unless the doc is also being updated.
- For `MAX_INSTRUCTION_LEN`: `Grep` for `maxlength` in `src/popup/`. The textarea cap must equal the constant. README's "512 字" must match too.

## 7. LLM output validation rules still in place

CLAUDE.md commits these rules in `src/lib/openrouter.ts`:
- `tabIds` must be in the whitelist (`validIds` / `freeIdSet`)
- each id appears at most once across output groups (`used` set)
- new groups need ≥ 2 tabs and a non-empty `groupName`
- summaries truncated to `MAX_AI_SUMMARY_LEN`
- `reclassifyTabs`: existing-group members may only stay or leave — never move to another group

Checks:
- `Grep` in `openrouter.ts` for `freeIdSet`, `validIds`, `used`, `tabIds.length < 2` (or similar guards). Each rule should still have a code path. If any guard was removed, that's a **critical** finding (output validation regression).
- `Grep` for the cross-group-move filter inside `reclassifyTabs` (look for the loop that drops tabs whose original group differs from the proposed one).

## 8. Prompt language lock

CLAUDE.md commits: system + user prompt force `groupName` / `summary` to the UI language (`zh` → 繁體中文, `en` → English) regardless of user instruction.

Checks:
- Read the `system` and `user` prompt builders in `src/lib/openrouter.ts`. Both must include the language-lock clause for the current `lang`. If a recent edit weakened the wording (e.g. removed "regardless of"), flag it.

## 9. Manifest permissions match documented permissions

PRIVACY.md has a permissions table. Manifest must match exactly:
- `permissions`: `tabs`, `tabGroups`, `storage`, `notifications`
- `host_permissions`: openrouter.ai, api.openai.com, generativelanguage.googleapis.com (and only these)

Any extra permission in manifest that isn't in the PRIVACY.md table is a **medium** finding — either tighten the manifest or update PRIVACY.md.

## 10. CHANGELOG / version sanity (light check)

- `package.json` `version` should match the latest `CHANGELOG.md` entry header.
- PRIVACY.md "Last updated" date should be ≥ the date of the most recent commit that touched data flow (`src/lib/openrouter.ts`, `src/lib/storage.ts`, `manifest.config.ts`). Use `git log --oneline -- src/lib/openrouter.ts src/lib/storage.ts manifest.config.ts | head -5`.

## Reporting format

Output a single report. No fluff, no progress narration:

```
# Policy alignment report

## Critical (privacy / contract violations)
- <file:line> <one-line finding> → expected: <what>; found: <what>

## Medium (drift, over-broad permission, doc mismatch)
- ...

## OK
- <one line per check that passed, grouped by section number>
```

If everything passes, say so plainly in one sentence. Don't pad the report.

## Out of scope

- Don't refactor or "clean up" code while auditing.
- Don't change docs to match drifted code without asking — usually the **doc** is the contract and the code needs to come back into line.
- Don't touch tests beyond reading them.
- Don't run the build or dev server; this is a static audit.
