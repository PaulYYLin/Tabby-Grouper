# Tabby Grouper Privacy Policy

_Last updated: 2026-04-26_

Tabby Grouper（下稱「本擴充功能」）由 paul.yy.lin@gmail.com 開發與維護。我們重視你的隱私，以下說明本擴充功能會如何處理你的資料。

## 我們收集哪些資料

本擴充功能只會在你主動點擊「分組目前視窗的分頁」按鈕時，讀取以下資料：

- 目前視窗中分頁的 **標題**（`tab.title`）
- 目前視窗中分頁的 **網址**（`tab.url`）
- 你在設定頁選擇的 **AI 供應商**（OpenRouter / OpenAI / Google Gemini）、輸入的 **API Key** 與（選填的）**模型名稱**

我們**不會**收集你的瀏覽歷史、書籤、Cookie、表單內容、密碼或任何其他瀏覽器資料。

## 我們如何使用這些資料

- **分頁標題與網址**：僅在你按下分組按鈕時，透過 HTTPS 傳送到你所選擇的 AI 供應商端點進行主題分類（OpenRouter `https://openrouter.ai`、OpenAI `https://api.openai.com`、或 Google Gemini `https://generativelanguage.googleapis.com`）。請求完成後，這些資料**不會被本擴充功能儲存**於任何地方，也不會被傳送到我們或其他第三方的伺服器。
- **API Key 與模型名稱**：僅儲存於 Chrome 的 `chrome.storage.sync`（跟隨你 Google 帳號同步，端對端加密），**不會**傳送給本擴充功能的開發者或任何第三方，僅用於向你選擇的 AI 供應商發送請求。

## 第三方服務

本擴充功能會將分頁標題與網域傳送至你選擇的 AI 供應商。整個流程受該供應商的隱私權政策規範：

- **OpenRouter**：[OpenRouter 隱私權政策](https://openrouter.ai/privacy)。OpenRouter 會代為轉發給你指定的模型原廠（Anthropic、Google、OpenAI、Meta 等），亦受該模型原廠的條款共同規範。
- **OpenAI**：[OpenAI Privacy Policy](https://openai.com/policies/privacy-policy/)。
- **Google Gemini**（Google AI Studio / Generative Language API）：[Google Privacy Policy](https://policies.google.com/privacy)、[Gemini API Terms](https://ai.google.dev/gemini-api/terms)。

你需要自行申請並提供對應的 API Key；本擴充功能不介入你與所選 AI 供應商之間的資料關係。

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
| `storage` | 在本機儲存任務快照（群組名稱、顏色、分頁標題與網址）；在 Chrome 同步儲存你的 AI 供應商選擇、API Key 與模型設定 |
| `host_permissions: openrouter.ai` / `api.openai.com` / `generativelanguage.googleapis.com` | 呼叫你所選擇的 AI 供應商 API |

## 資料保留

- **AI 分組請求過程中的分頁標題與網址**：**不保留**（僅於單次 AI 供應商請求存活於記憶體中，不會跨請求保留）。
- **任務 (Task) 快照**：當你按下「分組目前視窗的分頁」並成功建立群組時，本擴充功能會把該群組的名稱、顏色、各分頁的標題、網址、favicon 連結，存入 `chrome.storage.local`（**僅本機，不同步、不上傳**），用於日後在「任務」分頁列表中顯示與「一鍵恢復」。
  - 你可以在「任務」分頁手動刪除任一筆任務。
  - 任務若被封存（例如群組關閉），預設保留 7 天後自動清除。
  - 解除安裝本擴充功能時，所有任務資料將由 Chrome 一併清除。
- **API Key（每家供應商各一份）**：保留於 `chrome.storage.sync`，直到你清空欄位或移除本擴充功能。

## 你的權利

你可以隨時：

- 在設定頁清空 API Key。
- 從 Chrome 移除本擴充功能，所有本機／同步儲存的設定將一併被 Chrome 清除。

## 變更

本政策如有變更，將更新上述「Last updated」日期。若變更影響資料處理方式，我們會在商店說明中通知。

## 聯絡方式

如對本政策有疑問，請透過 Email 聯絡：paul.yy.lin@gmail.com
