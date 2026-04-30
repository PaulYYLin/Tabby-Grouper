# Tabby Grouper Privacy Policy

_Last updated: 2026-04-30_

> 繁體中文版請往下捲動到 [中文版隱私權政策](#繁體中文-traditional-chinese)。

---

## English

Tabby Grouper ("the Extension") is developed and maintained by paul.yy.lin@gmail.com. We take your privacy seriously. This document describes how the Extension handles your data.

### What data we collect

The Extension reads the following data only when you actively click the "Group current window's tabs" button:

- The **title** (`tab.title`) of each tab in your current window
- The **URL** (`tab.url`) of each tab in your current window
- Your **AI provider** selection (OpenRouter / OpenAI / Google Gemini), the **API key** you entered, and the (optional) **model name** configured on the options page

We **do not** collect your browsing history, bookmarks, cookies, form data, passwords, or any other browser data.

### How we use this data

- **Tab data sent to the AI provider**: when you press the Group button, the Extension transmits via HTTPS the **title** of each tab plus its **hostname and up to 80 characters of the URL path** (e.g. `github.com/anthropics/courses/co…`) to the AI provider you selected (OpenRouter `https://openrouter.ai`, OpenAI `https://api.openai.com`, or Google Gemini `https://generativelanguage.googleapis.com`) for topic classification. **Query strings (`?key=value`) and URL fragments (`#section`) are always stripped before transmission and are never sent**; full URLs never leave your device. After the request completes, **the Extension does not store this data anywhere**, and it is **never sent to the developer or any other third party**.
- **API key and model name**: stored only in `chrome.storage.sync` (synchronized through your Google account, encrypted by Chrome). They are **never** sent to the developer or any third party — only to the AI provider you selected.

### Third-party services

The Extension transmits tab titles, hostnames, and short URL path prefixes (as described above) to the AI provider you selected. The end-to-end flow is governed by that provider's privacy policy:

- **OpenRouter**: [OpenRouter Privacy Policy](https://openrouter.ai/privacy). OpenRouter forwards your request to the underlying model vendor you specified (Anthropic, Google, OpenAI, Meta, etc.), which is also subject to that vendor's own terms.
- **OpenAI**: [OpenAI Privacy Policy](https://openai.com/policies/privacy-policy/).
- **Google Gemini** (Google AI Studio / Generative Language API): [Google Privacy Policy](https://policies.google.com/privacy), [Gemini API Terms](https://ai.google.dev/gemini-api/terms).

You are responsible for obtaining and providing the corresponding API key. The Extension does not intermediate the data relationship between you and your selected AI provider.

### What we do not do

- We do not sell or share your data with anyone.
- We do not use Google Analytics, telemetry, advertising, or any tracking tools.
- We do not create accounts or user profiles on remote servers.
- We do not store, log, or transmit tab titles or URLs to any service operated by the Extension's developer.

### Permissions

| Permission | Purpose |
| --- | --- |
| `tabs` | Read the title and URL of tabs in your current window, used as input for AI classification |
| `tabGroups` | Create and name Chrome tab groups based on AI classification results |
| `storage` | Locally store task snapshots (group name, color, tab titles and URLs); sync your AI provider selection, API key, and model settings via Chrome |
| `notifications` | Notify you when grouping completes, fails, or when the Extension asks whether to add/remove a dragged tab to/from a tracked group |
| `host_permissions: openrouter.ai / api.openai.com / generativelanguage.googleapis.com` | Call the AI provider API you selected |

### Data retention

- **Tab titles and URLs during AI grouping requests**: **not retained** (exists only in memory during a single AI provider request and is discarded immediately after).
- **Task snapshots**: when you press "Group current window's tabs" and a group is successfully created, the Extension stores that group's name, color, and each tab's title, URL, and favicon URL in `chrome.storage.local` (**local only — not synced, not uploaded**), so it can be displayed in the Tasks tab and restored with one click later.
  - You can manually delete any task at any time from the Tasks tab.
  - If a task is archived (e.g. when the group is closed), it is automatically deleted after 7 days by default.
  - Uninstalling the Extension causes Chrome to delete all task data along with it.
- **API keys (one per provider)**: kept in `chrome.storage.sync` until you clear the field or uninstall the Extension.

### Your rights

You may at any time:

- Clear your API key on the options page.
- Remove the Extension from Chrome — all locally stored and synced settings will be deleted by Chrome along with the Extension.

### Changes

If this policy changes, we will update the "Last updated" date above. If a change materially affects how data is handled, we will note it in the Web Store description.

### Contact

If you have questions about this policy, please contact us via email: paul.yy.lin@gmail.com

---

## 繁體中文 / Traditional Chinese

Tabby Grouper（下稱「本擴充功能」）由 paul.yy.lin@gmail.com 開發與維護。我們重視你的隱私，以下說明本擴充功能會如何處理你的資料。

### 我們收集哪些資料

本擴充功能只會在你主動點擊「分組目前視窗的分頁」按鈕時，讀取以下資料：

- 目前視窗中分頁的 **標題**（`tab.title`）
- 目前視窗中分頁的 **網址**（`tab.url`）
- 你在設定頁選擇的 **AI 供應商**（OpenRouter / OpenAI / Google Gemini）、輸入的 **API Key** 與（選填的）**模型名稱**

我們**不會**收集你的瀏覽歷史、書籤、Cookie、表單內容、密碼或任何其他瀏覽器資料。

### 我們如何使用這些資料

- **送往 AI 供應商的分頁資料**：當你按下分組按鈕時，本擴充功能會透過 HTTPS 傳送每個分頁的**標題**，加上**網域與最多 80 字元的網址路徑前綴**（例如 `github.com/anthropics/courses/co…`）到你選擇的 AI 供應商端點進行主題分類（OpenRouter `https://openrouter.ai`、OpenAI `https://api.openai.com`、或 Google Gemini `https://generativelanguage.googleapis.com`）。**Query string（`?key=value`）與網址 fragment（`#section`）一律會在傳送前移除，絕不送出**；完整網址不會離開你的裝置。請求完成後，這些資料**不會被本擴充功能儲存**於任何地方，也不會被傳送到我們或其他第三方的伺服器。
- **API Key 與模型名稱**：僅儲存於 Chrome 的 `chrome.storage.sync`（跟隨你 Google 帳號同步，由 Chrome 加密），**不會**傳送給本擴充功能的開發者或任何第三方，僅用於向你選擇的 AI 供應商發送請求。

### 第三方服務

本擴充功能會將分頁標題、網域與短路徑前綴（如上述）傳送至你選擇的 AI 供應商。整個流程受該供應商的隱私權政策規範：

- **OpenRouter**：[OpenRouter 隱私權政策](https://openrouter.ai/privacy)。OpenRouter 會代為轉發給你指定的模型原廠（Anthropic、Google、OpenAI、Meta 等），亦受該模型原廠的條款共同規範。
- **OpenAI**：[OpenAI Privacy Policy](https://openai.com/policies/privacy-policy/)。
- **Google Gemini**（Google AI Studio / Generative Language API）：[Google Privacy Policy](https://policies.google.com/privacy)、[Gemini API Terms](https://ai.google.dev/gemini-api/terms)。

你需要自行申請並提供對應的 API Key；本擴充功能不介入你與所選 AI 供應商之間的資料關係。

### 我們不做的事

- 不販售或分享你的任何資料。
- 不使用 Google Analytics、埋點、廣告或任何追蹤工具。
- 不在遠端伺服器建立帳號或個人檔案。
- 不儲存、記錄或傳送分頁標題／網址到本擴充功能開發者自營的任何服務。

### 權限說明

| 權限 | 用途 |
| --- | --- |
| `tabs` | 讀取目前視窗分頁的標題與網址，作為 AI 分類依據 |
| `tabGroups` | 依 AI 分類結果建立與命名 Chrome 分頁群組 |
| `storage` | 在本機儲存任務快照（群組名稱、顏色、分頁標題與網址）；在 Chrome 同步儲存你的 AI 供應商選擇、API Key 與模型設定 |
| `notifications` | 在分組完成、失敗，或詢問是否將拖曳的分頁加入／移出已追蹤群組時通知你 |
| `host_permissions: openrouter.ai` / `api.openai.com` / `generativelanguage.googleapis.com` | 呼叫你所選擇的 AI 供應商 API |

### 資料保留

- **AI 分組請求過程中的分頁標題與網址**：**不保留**（僅於單次 AI 供應商請求存活於記憶體中，請求結束即丟棄）。
- **任務 (Task) 快照**：當你按下「分組目前視窗的分頁」並成功建立群組時，本擴充功能會把該群組的名稱、顏色、各分頁的標題、網址、favicon 連結，存入 `chrome.storage.local`（**僅本機，不同步、不上傳**），用於日後在「任務」分頁列表中顯示與「一鍵恢復」。
  - 你可以在「任務」分頁手動刪除任一筆任務。
  - 任務若被封存（例如群組關閉），預設保留 7 天後自動清除。
  - 解除安裝本擴充功能時，所有任務資料將由 Chrome 一併清除。
- **API Key（每家供應商各一份）**：保留於 `chrome.storage.sync`，直到你清空欄位或移除本擴充功能。

### 你的權利

你可以隨時：

- 在設定頁清空 API Key。
- 從 Chrome 移除本擴充功能，所有本機／同步儲存的設定將一併被 Chrome 清除。

### 變更

本政策如有變更，將更新上述「Last updated」日期。若變更影響資料處理方式，我們會在商店說明中通知。

### 聯絡方式

如對本政策有疑問，請透過 Email 聯絡：paul.yy.lin@gmail.com
