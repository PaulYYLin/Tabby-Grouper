# Tabby Grouper Privacy Policy

_Last updated: 2026-04-20_

Tabby Grouper（下稱「本擴充功能」）由 paul.yy.lin@gmail.com 開發與維護。我們重視你的隱私，以下說明本擴充功能會如何處理你的資料。

## 我們收集哪些資料

本擴充功能只會在你主動點擊「分組目前視窗的分頁」按鈕時，讀取以下資料：

- 目前視窗中分頁的 **標題**（`tab.title`）
- 目前視窗中分頁的 **網址**（`tab.url`）
- 你在設定頁輸入的 **OpenRouter API Key** 與（選填的）**模型名稱**

我們**不會**收集你的瀏覽歷史、書籤、Cookie、表單內容、密碼或任何其他瀏覽器資料。

## 我們如何使用這些資料

- **分頁標題與網址**：僅在你按下分組按鈕時，透過 HTTPS 傳送到 OpenRouter API（`https://openrouter.ai`）進行主題分類。請求完成後，這些資料**不會被本擴充功能儲存**於任何地方，也不會被傳送到我們或第三方的伺服器。
- **OpenRouter API Key 與模型名稱**：僅儲存於 Chrome 的 `chrome.storage.sync`（跟隨你 Google 帳號同步，端對端加密），**不會**傳送給本擴充功能的開發者或任何第三方，僅用於向 OpenRouter API 發送你的請求。

## 第三方服務

本擴充功能會將分頁標題與網址傳送至 OpenRouter API，並由 OpenRouter 代為轉發給你選擇的模型提供者（Anthropic、Google、OpenAI、Meta 等）。整個流程受 [OpenRouter 隱私權政策](https://openrouter.ai/privacy) 與 OpenRouter 所選模型原廠的條款共同規範。你需要自行申請並提供 OpenRouter API Key；本擴充功能不介入你與 OpenRouter 或下游模型提供者之間的資料關係。

## 我們不做的事

- 不販售或分享你的任何資料。
- 不使用 Google Analytics、埋點、廣告或任何追蹤工具。
- 不在遠端伺服器建立帳號或個人檔案。
- 不儲存、記錄或傳送分頁標題／網址到本擴充功能開發者自營的任何服務。

## 權限說明

| 權限 | 用途 |
| --- | --- |
| `tabs` | 讀取目前視窗分頁的標題與網址，作為 AI 分類依據 |
| `tabGroups` | 依 AI 分類結果建立與命名 Chrome 分頁群組 |
| `storage` | 在本機／Chrome 同步儲存你的 OpenRouter API Key 與模型設定 |
| `host_permissions: openrouter.ai` | 呼叫 OpenRouter API |

## 資料保留

- 分頁標題與網址：**不保留**（僅於單次請求存活於記憶體中）。
- API Key：保留於 `chrome.storage.sync`，直到你清空欄位或移除本擴充功能。

## 你的權利

你可以隨時：

- 在設定頁清空 API Key。
- 從 Chrome 移除本擴充功能，所有本機／同步儲存的設定將一併被 Chrome 清除。

## 變更

本政策如有變更，將更新上述「Last updated」日期。若變更影響資料處理方式，我們會在商店說明中通知。

## 聯絡方式

如對本政策有疑問，請透過 Email 聯絡：paul.yy.lin@gmail.com
