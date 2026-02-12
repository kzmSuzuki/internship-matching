# 実装計画: Cloudflare Pages デプロイエラー修正

## ゴール
Cloudflare Pages へのデプロイ時に発生している `Internal Server Error` を解消し、正常に動作させること。

## 現状の課題
- Cloudflare Pages で `Internal Server Error` が発生。
- 原因特定のため、ローカルでの再現とログ解析が必要。
- `patch-handler.sh` による `Function()` 呼び出しのパッチ当てが不安定な可能性。

## 変更計画
### 1. 調査とデバッグ
- [x] ローカル環境での `npm run build:cf` の成功確認
- [x] `wrangler pages dev` (または `npm run preview`) でのエラー再現
- [x] `Function()` や `eval()` を使用しているライブラリの特定と排除/置換
- [x] `npm run preview` で `TypeError: Cannot convert undefined or null to object` を確認
- [x] エラー箇所の特定 (`handler.mjs`: `function i(e2,t2,r2)`)

### 2. 設定修正
- [ ] `patch-handler.sh` に `merge` 関数の Null ガードを追加する処理を実装
- [ ] `open-next.config.ts` の確認（必要であれば）

### 3. 検証
- [ ] ローカルでのプレビュー動作確認
- [ ] Cloudflare Pages への再デプロイ

## ユーザーレビューが必要な事項
- `patch-handler.sh` は無理やりコードを書き換えているため、根本的な解決（問題のあるライブラリの使用停止など）が可能であればそちらを優先するかどうか。
