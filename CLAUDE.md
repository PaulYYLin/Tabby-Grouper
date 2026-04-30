# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev (HMR, builds to dist/)
npm run build        # Production build to dist/
npm run type-check   # tsc --noEmit
npm run test         # Vitest single run
npm run test:watch   # Vitest watch mode
npm run zip          # Package dist/ → tabby-grouper.zip
npm run gen:icons    # Regenerate icons from public/logo.png via sharp
```

Run a single test file: `npx vitest run src/lib/openrouter.test.ts`.

To load locally: `npm run build`, then in `chrome://extensions` enable Developer Mode and "Load unpacked" pointing at `dist/`.

## Architecture

Chrome MV3 extension, **no framework** — Vite + `@crxjs/vite-plugin` + plain TypeScript + DOM APIs. Three entry points wired in `manifest.config.ts`:

- `src/background.ts` — service worker; the only place that talks to LLM providers and `chrome.tabGroups`
- `src/popup/` — toolbar popup (Group / Tasks tabs)
- `src/options/` — options page (provider, API key, model, policies, language)

UI ↔ background communication is a single `chrome.runtime.sendMessage` channel typed by the discriminated union in `src/lib/messages.ts`. **All new actions must add a variant there**; the background `handleMessage` switch is exhaustive.

### Storage layout (load-bearing — pick the right bucket)

| Bucket | What lives there | Why |
|---|---|---|
| `chrome.storage.sync` | `provider`, `apiKeys` (per-provider record), `models` (per-provider record), `lang`, `addDraggedTabPolicy`, `removeDraggedTabPolicy`, `userPrefsEnabled` (opt-in toggle for personalised memory, defaults to off) | User settings, syncs across devices |
| `chrome.storage.local` | `tabby:tasks:v1` — the `TasksState` (grouping snapshots); `tabby:userPrefs:v1` — auto-learned naming/instruction samples + LLM-distilled hint cache | Survives Chrome restarts; never synced across devices |
| `chrome.storage.session` | `tabby:groupTaskMap`, `tabby:tabGroupCache`, `tabby:pendingResume`, `tabby:pendingAdditions` | Ephemeral caches rebuilt on `onStartup` / `onInstalled` |

Legacy single-key `apiKey` / `model` are coerced into the per-provider records by `coerceProviderRecord` in `src/lib/openrouter.ts` — keep that path when touching settings code.

### Tasks lifecycle

A "task" = a snapshot of one Chrome tab group. `Task` shape lives in `src/lib/tasks.ts`. Constants there are caps the storage layer enforces (`ARCHIVE_TTL_MS = 7d`, `MAX_TASKS = 200`, `MAX_TABS_PER_TASK = 200`).

All writes to `TASKS_KEY` go through `withTasksLock` in `src/lib/storage.ts` — a single promise chain serialising mutations and running `pruneAndCap` on every read/write. **Never call `chrome.storage.local.set({[TASKS_KEY]: …})` directly**; use `mutateTask` / `addTask` / `deleteTask` so the lock + prune invariants hold.

Group ↔ task linkage:
- New group created from `handleGroupTabs` → `bindNewGroup` writes to `groupTaskMap` (session storage).
- Service worker restart → `groupTaskMap` is gone. `rebuildGroupTaskMap` (in `groupSync.ts`) re-pairs live `chrome.tabGroups` with `Task` records by **same name + same color + Jaccard(URL set) ≥ 0.5**. Don't loosen this without thinking through false matches.
- `chrome.tabGroups.onRemoved` → `archiveGroup` flips status to `archived` and stamps `archivedAt`. Archived tasks > 7 days are dropped by `pruneAndCap`.

Dragged-tab handling: `chrome.tabs.onUpdated` watches `changeInfo.groupId`. When a tab joins/leaves a tracked group, `onTabJoinedGroup` / `onTabLeftGroup` consult `getDraggedTabPolicy(kind)`:
- `'always'` / `'never'` — apply or skip silently
- `'ask'` — enqueue a `PendingAddition` (session) and fire a `chrome.notifications` button dialog. Resolution flows through `RESOLVE_PENDING_ADDITION` whether the user clicks the popup row or a notification button.

The `tabGroupCache` (tabId → groupId) exists because `chrome.tabs.onUpdated`'s `changeInfo.groupId` only carries the new value; we need the old to fire `onTabLeftGroup`.

### LLM call boundary (`src/lib/openrouter.ts`)

Two modes:
- `classifyTabs` — initial grouping of free tabs only.
- `reclassifyTabs` — used by `handleGroupTabs` when there are tracked groups; takes `existingGroups` + `freeTabs`. **Existing members may only stay or leave their group** — never move to another existing group or new group. The post-LLM filter enforces this on top of the system prompt; when modifying it, preserve both.

All providers (OpenRouter / OpenAI / Gemini) share an OpenAI-compatible Chat Completions endpoint defined in the `PROVIDERS` table. Adding a provider = adding an entry there + extending the `Provider` union + entry in `coerceProviderRecord`.

Output validation rules that every code path must keep:
- `tabIds` must be in the whitelist (`validIds` / `freeIdSet`); fabricated ids are dropped.
- Each id appears at most once across all output groups (`used` set).
- New groups need ≥ 2 tabs and a non-empty `groupName`.
- Summaries truncated to `MAX_AI_SUMMARY_LEN` (200).
- `MAX_INSTRUCTION_LEN` (512) is enforced both in the textarea (`maxlength`) and at the function entry — keep both in sync.

Prompt language: system + user prompts have **hard rules** locking `groupName` / `summary` to the UI language (`zh` → 繁體中文, `en` → English) regardless of what the user instruction says. If you edit prompts, do not weaken these locks — the UI assumes them.

### User preferences (auto-learned, opt-in)

**Off by default.** Gated by the `userPrefsEnabled` flag in `chrome.storage.sync`; `isUserPrefsEnabled()` in `src/lib/userPrefs.ts` returns `true` only when that key is the literal `true`. Every entry point in `background.ts` (`handleGroupTabs` reads + records, `handleUpdateTaskName` records) MUST be guarded by this flag — privacy disclosure depends on the feature being inert when the user has not opted in. PRIVACY.md describes the flag behaviour in user-facing language; keep that section in sync.

When enabled, `src/lib/userPrefs.ts` collects three sample buckets in `tabby:userPrefs:v1` (local only): `userNames` (strong signal — names the user typed via rename), `aiNames` (weak signal — names the AI produced and the user kept), `instructions`. Each is a capped recency buffer.

A separate LLM call distills these into a ≤ 600-char `distilled` hint, gated by `MIN_SAMPLES_TO_DISTILL` and `REDISTILL_THRESHOLD`. The distill call is **fire-and-forget after grouping** in `handleGroupTabs` — failures are swallowed so they never block grouping. The cached hint is read synchronously into the next grouping prompt as a `<user_naming_preferences>` block, explicitly labelled as a soft hint subordinate to the current instruction and the system's hard rules.

### i18n

`src/lib/i18n.ts` is the single dictionary (`zh` / `en`) with a `tFor(lang)` lookup; entries can be strings or functions. `applyDomI18n` walks `data-i18n` / `data-i18n-attr-*` in HTML. The background also reads `lang` (cached, refreshed via `onLangChange`) so error strings match the popup's language.

## Project conventions

- **KISS / YAGNI** — this codebase deliberately stays framework-free and avoids speculative abstractions. Don't add a UI library, state manager, or generic event bus to solve a one-off problem.
- TypeScript is strict (`noUnusedLocals`, `noUnusedParameters`). Discriminated unions over class hierarchies (see `Message`).
- Tests are colocated as `*.test.ts` next to the unit. Test files exist for `openrouter`, `tasks`, `resume` — pure-logic modules. The Chrome runtime modules (`background.ts`, `groupSync.ts`, `storage.ts`) are tested manually in the loaded extension; mocking `chrome.*` is intentionally avoided.
- Privacy invariant: only tab **title + hostname + up to `MAX_URL_TAIL_LEN` (80) chars of URL path** ever leaves the device (see `urlForPrompt` in `src/lib/openrouter.ts`). Query strings and URL fragments are stripped before transmission. Full URLs (with query/fragment) live in `chrome.storage.local` only. Anything that would send a query string, URL fragment, or page content to the network is a regression.
