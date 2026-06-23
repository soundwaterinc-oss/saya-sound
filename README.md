# SAYA / 紗綾形 Sound Engine

**EL-SYSTEMA 系列・第2号機。** 籠目（kagome-sound）と同一アーキテクチャを継承し、
**幾何模様＝紗綾形（卍つなぎの連続格子）／音色＝金属・ガラス・漆の打鳴（モーダル合成）** に差し替えたもの。

> 籠目が「三角格子 × 撥弦（Karplus-Strong）× 開放的」なら、
> SAYA は **「直交格子 × 打鳴（Modal）× 閉じたループ（カノン）」**。

## 核心

紗綾形は角度を持たない直交格子（0°/90°のみ）なので、籠目の angle マッピングは無意味になる。
代わりに**連続する卍パス（鎖 / chain）をトレースし、それを旋律フレーズ／カノン声部に割り当てる**のが本ツール最大の発明点。

## 開発

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # dist/ に静的出力
npm run preview
```

Vanilla JS（ES Modules）。フレームワーク不要。Web Audio API + Web MIDI + Canvas 2D。

## 使い方

1. **再生** を押すと AudioContext が起動し、紗綾形の鎖を走査して打鳴が始まる。
2. **SOURCE** — プロシージャル生成（卍/逆/市松、密度、アーム長…）か、画像ドロップ（直交Hough検出）。
3. **MAPPING WEIGHTS** — gridX/gridY/chainPos/depth/length の重み（chainPos が籠目の angle を置換）。
4. **SCALE / RHYTHM** — slendro/pelog/stretched-JI 等のガムラン系音律 + Gridded リズム。
5. **POLYRHYTHM SCANNERS** — 複数ポインタが鎖を弧長順に走査（3:4:5 等）。
6. **CANON** — 同一鎖を N 声部が位相オフセットで読む（unison / interval / spiral=Shepard的）。
7. **SYNTH** — MACRO/MID/MICRO の3層。Modal Bell / Bowed Glass / 漆鼓 / Prepared / Tine。各 ADSR。
8. **FX** — Reverb（size 長め推奨）/ Delay（カノンと干渉させると絡みが増す）。
9. **MIDI OUT** — 層→チャンネル（MACRO=1, MID=2, MICRO=3）。

## アーキテクチャ

```
geometry/  sayagata → chains（鎖トレース）→ features → mapping
audio/     scheduler（lookahead 25ms/0.1s）→ polyrhythm / canon → voices → engine(FX)
           voices/  modal（共鳴BPバンク）/ glass（持続励起）/ prepared / noiseburst / karplus
ui/        canvas（発音フラッシュ）/ controls / theme（漆黒×金×朱）
state.js   全パラメータの単一ストア
```

## 部分音テーブル（modal.js）

| 音色 | partial ratios | 性格 |
| --- | --- | --- |
| Bell | 0.56, 0.92, 1.19, 1.71, 2.00, 2.74, 3.00, 3.76, 4.07 | 古典的な鐘 |
| Glass | 1.0, 2.01, 3.03, 4.06, 5.1 | 透明・グラスハーモニカ |
| 漆鼓 | 1.0, 1.59, 2.14, 2.30, 2.65, 2.92 | 膜＋胴・短décay |
| Tine | 1.0, 6.27, 17.1 | 金属タイン・倍音まばら |

## デプロイ

Cloudflare Pages（`saya-sound.pages.dev` 想定）。`npm run build` → `dist/` を配信。

---

EL-SYSTEMA / SAYA — 紗綾形は「不断長久（絶え間なく続く）」の吉祥文様。閉じて絡むループはそのままカノンになる。
