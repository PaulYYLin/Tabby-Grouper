# Tabby Grouper

> 繁體中文版請見 [README.md](./README.md).

A Chrome MV3 extension that uses AI to automatically analyse and group tabs. Supports [OpenRouter](https://openrouter.ai), [OpenAI](https://platform.openai.com), and [Google Gemini](https://aistudio.google.com) — call your model of choice (Claude, Gemini, GPT, etc.) — and clusters related tabs into the same Chrome tab group based **only on tab title, hostname, and up to 80 characters of the URL path**. Tab content is never read; query strings and URL fragments are never transmitted.

## Features

- One-click grouping of tabs in the current window
- Bring your own API key — pick OpenRouter / OpenAI / Google Gemini and any model
- Per-provider API key and model are stored independently — switching providers does not overwrite each other
- Custom filter instructions (e.g. "only group work-related tabs", "only handle YouTube and GitHub")
- **Cross-session task memory**: every successful grouping is saved as a "task". Reopen Chrome the next day and the popup asks whether to one-click restore yesterday's research session
- **Personalised memory (optional, off by default)**: opt in from the options page to let the AI gradually learn your naming and instruction style. When enabled, past group names and instructions are sent back to your AI provider to be summarised, producing a small amount of extra usage. Samples and the distilled summary stay on this device only (see PRIVACY)
- API keys live only in `chrome.storage.sync`; task snapshots live only in `chrome.storage.local`. Nothing routes through a developer-operated server
- Strict output validation: `tabIds` must be in the whitelist, group names cannot be empty, each group must contain at least 2 tabs

## Installation

### Build from source

```bash
npm install
npm run build
```

The build emits the unpacked extension under `dist/`. Open `chrome://extensions`, enable **Developer mode** in the top-right corner, click **Load unpacked**, and pick the `dist/` directory.

### Package

```bash
npm run zip
```

Produces `tabby-grouper.zip` in the project root, ready for upload to the Chrome Web Store or for distribution.

## Usage

1. After installing, click the Tabby Grouper toolbar icon → **"Open settings"**
2. Pick an AI provider, paste the matching API key ([OpenRouter](https://openrouter.ai/keys) / [OpenAI](https://platform.openai.com/api-keys) / [Google AI Studio](https://aistudio.google.com/apikey)); the model name is optional
3. Back in the popup, optionally type a filter instruction (max 512 chars) and press **"Group tabs in current window"**

### Task memory and restore

- Every successful AI grouping saves each group as a "task" snapshot (name, colour, tab titles, and URLs).
- Switch to the **Tasks** tab in the popup to see all snapshots; each can be **Restored** or **Deleted** individually.
- When all tabs in a group are closed, the task is marked **archived**; the next time you open the popup (or restart Chrome), a banner appears asking whether to restore it.
- Archived tasks are auto-removed after 7 days; you can also delete any task manually.
- All task data lives only in `chrome.storage.local` and is **never** transmitted to OpenRouter or any third party.

### Personalised memory (optional)

- **Off by default.** To enable, tick **"Personalised memory"** on the options page.
- Once enabled, each successful grouping locally records three kinds of strings: group names you renamed yourself, AI-generated names you kept without renaming, and instructions you typed. Each list is capped to a small recent window.
- Once enough samples accumulate, the extension makes one additional call to your selected AI provider to summarise the samples into a short hint that is injected into the next grouping run — this incurs a **small amount of extra usage** on your provider account.
- Samples and the distilled hint live only in `chrome.storage.local` (not synced, not uploaded). Disabling the toggle stops both the recording and the summarisation calls immediately; existing on-device data is preserved.
- See the **"Optional feature: personalised memory"** section in [PRIVACY.md](./PRIVACY.md) for full details.

## Development

```bash
npm run dev          # Vite dev mode
npm run type-check   # TypeScript type-check
npm run test         # Vitest unit tests
npm run gen:icons    # Regenerate icons in all sizes from the source image
```

Stack: Vite + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin) + plain TypeScript, no UI framework.

## Project structure

```
src/
├── background.ts         # Service worker: handle messages, call APIs, create groups, register tabGroups listeners
├── lib/
│   ├── openrouter.ts     # AI provider (OpenRouter / OpenAI / Gemini) calls and output validation
│   ├── grouping.ts       # Shared helpers: pickColor, isGroupableTab
│   ├── tasks.ts          # Task type, storage key constants, retention/capacity caps
│   ├── storage.ts        # chrome.storage.local reads/writes, CAS lock, lazy prune
│   ├── groupSync.ts      # group↔task map rebuild, pendingResume detection, name/color sync
│   ├── resume.ts         # Task restore algorithm
│   ├── userPrefs.ts      # Personalised memory: sample collection + LLM distillation (gated by opt-in flag)
│   ├── messages.ts       # background ↔ popup message types (discriminated union)
│   ├── *.test.ts         # Vitest unit tests
├── popup/                # Toolbar popup UI (Group / Tasks views)
└── options/              # Options page (API key, model, dragged-tab policies, personalised memory)
```

## Limits and security

- **Instruction length cap is 512 chars** — enforced both by the textarea `maxlength` attribute and by a guard at the entry of `classifyTabs` / `reclassifyTabs`.
- **`max_tokens: 2048`** to avoid wasted tokens from runaway model output.
- **Prompt injection**: tab titles are untrusted external input, so a malicious page could in theory steer the LLM's response. The output is validated against `isGroupResultShape` and filtered through the `validIds` whitelist, so the worst case is a manipulated group name — no arbitrary code execution and no data exfiltration (the API key only ever appears in HTTP headers, never in the prompt).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## Privacy

See [PRIVACY.md](./PRIVACY.md). In short:

- What is sent to the AI provider (OpenRouter / OpenAI / Gemini) is the **tab title**, **hostname**, and **up to 80 characters of the URL path** (e.g. `github.com/anthropics/courses/co…`). **Query strings and URL fragments are always stripped and never transmitted.**
- Task snapshots (including full URLs, titles, and favicon URLs) live only in `chrome.storage.local` and are **never uploaded**; archived tasks are auto-removed after 7 days, and you can delete any task manually at any time.
- Tab content, cookies, form data, history, bookmarks, and other browser data are never read.
- **"Personalised memory" is off by default.** When enabled, past group names and instructions are additionally sent back to your AI provider for summarisation; the samples and the summary stay on this device.
