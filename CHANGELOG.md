# Changelog

本檔案記錄此專案的所有重要變更。格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本號採 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

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
