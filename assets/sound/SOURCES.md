# 音效來源說明

以下音效已於 2026-07 替換為開源 CC0（公共領域）授權的音效，取代原本沿用 Super-Mario-Phaser base 模板、授權不明確的音效檔案。

## 來源

- **Sound effects Pack 2**（CC0）— https://opengameart.org/content/sound-effects-pack-2
  作者：phoenix1291 / SwissArcadeGameEntertainment（頁面註明可標示但非必要）

## 替換對照表

| 專案內檔名 | 來源檔案 |
|-----------|----------|
| `effects/jump.mp3` | Jump 1 - Sound effects Pack 2.mp3 |
| `effects/coin.mp3` | Coins 1 - Sound effects Pack 2.mp3 |
| `effects/powerup-appears.mp3` | Powerup 1 - Sound effects Pack 2.mp3 |
| `effects/consume-powerup.mp3` | Powerup 2 - Sound effects Pack 2.mp3 |
| `effects/powerdown.mp3` | Hit 1 - Sound effects Pack 2.mp3 |
| `effects/goomba-stomp.wav` | Hit 2 - Sound effects Pack 2.wav |
| `effects/kick.mp3` | Explosion 1 - Sound effects Pack 2.mp3 |
| `effects/fireball.mp3` | Laser-weapon 1 - Sound effects Pack 2.mp3 |
| `effects/time-warning.mp3` | Blip 1 - Sound effects Pack 2.mp3 |
| `effects/block-bump.wav` | Hit 3 - Sound effects Pack 2.wav |
| `effects/break-block.wav` | Explosion 2 - Sound effects Pack 2.wav |
| `effects/flagpole.mp3` | 1up 2 - Sound effects Pack 2.mp3 |
| `music/win.wav` | 1up 1 - Sound effects Pack 2.wav |
| `music/gameover.mp3` | Lose 1 - Sound effects Pack 2.mp3 |

## 未替換的音效

以下維持原檔，因為是完整音樂曲目（不是短音效），CC0 音效包裡沒有對應的替代品，需要另外找音樂類授權資源：

- `music/custom/red-alert-sprint.mp3`（主題曲）
- `music/underground/theme.mp3`、`music/overworld/theme.mp3`
- `music/overworld/hurry-up-theme.mp3`、`music/underground/hurry-up-theme.mp3`
- `effects/here-we-go.mp3`、`effects/cursed-here-we-go.mp3`、`effects/pause.wav`（目前遊戲流程中未實際觸發的音效，見對話中的死程式碼說明）

## 原始檔案備份

替換前的原始音效已備份至 `assets/sound/_original-backup/`，若對新音效不滿意可以隨時還原。

## 已移除的死音效（未刪除，僅搬移備份）

以下音效檔案在目前的關卡流程裡完全不會被觸發播放（只在原始 Mario 模板的管道進場序列或無法開啟的設定選單裡才會用到），已從 `assets/sound/` 移到 `assets/sound/_unused-backup/`，並同步移除 `game.js` 裡對應的載入與播放程式碼：

- `music/underground/theme.mp3`
- `music/overworld/theme.mp3`（原本就沒有任何程式碼載入這個檔案）
- `music/overworld/hurry-up-theme.mp3`
- `music/underground/hurry-up-theme.mp3`
- `effects/here-we-go.mp3`
- `effects/cursed-here-we-go.mp3`
- `effects/pause.wav`
