# 更新紀錄

## 2026-07-01

### 新玩法機制

- 監測資料點改為具備雨量緩解功能，每收集一個可降低 `6 mm` 累積雨量，並顯示青色 `-6mm` 浮動提示。
- 新增雨量警戒分級機制。進入黃色警戒後，泥甲巨石怪會加速，坍方警示的落石節奏也會變密集；逼近紅色警戒時再進一步升級。
- 新增坍方警示系統，在指定區域先出現落石警告，再由上方落下落石，形成新的垂直威脅。

### 關卡與道具平衡

- 防災背心維持在前段保證出現。
- 安全帽改到關卡中後段保證出現，避免前段就過度強化。
- 關卡前約 `38%` 區間的神秘方塊不再開出安全帽，改為以金幣與背心為主。

### 視覺與 UI

- 分頁圖示改為安全帽階段的 Gene。
- 讀取畫面改為安全帽 Gene 靜態圖，搭配旋轉動畫維持載入感。
- Gene 被怪物、民眾或落石擊中時，加入短暫鏡頭震動效果。

### 修正項目

- 修正結算頁文案錯字，將「陽降雨量」修正為「當降雨量」。
- 修正坍方落石會被漂浮磚塊擋住的問題，現在只會被真正固定地形阻擋。
- 更新 `index.html` 內多個腳本版本號，降低瀏覽器快取舊版腳本的風險。

### 主要異動檔案

- `index.html`
- `assets/css/style.css`
- `javascript/game.js`
- `javascript/game/blocks.js`
- `javascript/game/entities-control.js`
- `javascript/game/hud-control.js`
- `javascript/game/player-control.js`
- `javascript/game/hazards.js`
- `javascript/game/levels/level-1.js`
