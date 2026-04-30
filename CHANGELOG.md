# Changelog

本檔案記錄此專案的所有重要變更。格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本號採 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [0.4.0] - 2026-04-30

### 新增
- **「個人化記憶」選用功能（預設關閉）**：在設定頁啟用後，會在本機記錄使用者親自命名的群組名稱、AI 命名後使用者沿用的名稱、以及使用者下過的指令；累積足夠樣本後，會額外呼叫一次選定的 AI 供應商把樣本摘要成提示，於下次分組時注入給 AI 參考。
- 設定頁新增 ⓘ tooltip 解釋個人化記憶機制與會產生的額外 AI 用量
- 新增英文版 README（README.en.md）

### 變更
- PRIVACY.md 同步揭露「個人化記憶」啟用後送出的資料類別（過往群組名稱與指令文字），並說明預設關閉、僅本機儲存、可隨時關閉
- README 新增「個人化記憶（選用）」段落
- CLAUDE.md 更新 storage table 與新增 user-preferences 段落

## [0.3.1] - 2026-04-26

### 新增
- 多 AI 供應商支援：OpenRouter、OpenAI、Google Gemini，皆走 OpenAI-compatible Chat Completions
- 設定頁新增「AI 供應商」下拉選單，切換時自動更新 API Key 連結、預設模型、placeholder
- API Key 與模型改為**每個供應商各自記一份**：切換供應商時自動載入該家先前儲存的設定，不互相覆蓋

### 變更
- `manifest.json` `host_permissions` 加入 `api.openai.com` 與 `generativelanguage.googleapis.com`
- 錯誤訊息改為通用化：`OpenRouter 401: …` → `OpenRouter / OpenAI / Gemini 401: …`
- 舊版單一 `apiKey` / `model` 設定首次讀取時會自動遷移為 OpenRouter 的紀錄

## [0.3.0] - 2026-04-26

### 新增
- 多語言（i18n）支援與語言選項
- 任務搜尋功能
- 任務摘要顯示
- 待加入分頁（pending additions）：偵測屬於既有任務的新分頁並提示一鍵加入

### 變更
- 重構 background 與 popup 腳本，簡化任務管理流程
- 重構任務渲染與 UI 互動
- 改善 popup UI 樣式與設定/popup 配色（brand / accent CSS 變數）
- 圖示資產改用 PNG，移除舊版 SVG 與 icon 生成腳本對應調整

## [0.2.0] - 先前版本

- 任務管理：儲存、恢復、刪除分組快照
- 任務綁定與 group 同步
- 任務資料儲存於 `chrome.storage.local`，含保留期限與容量上限
- 隱私權政策更新

## [0.1.0] - 初始版本

- 一鍵 AI 分組目前視窗的分頁
- OpenRouter API 整合，使用者自備 API Key 與模型
- 自訂過濾規則
