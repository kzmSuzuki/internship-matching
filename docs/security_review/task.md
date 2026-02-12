# セキュリティレビューと修正タスク (現状)

## 1. 現状調査
- [ ] Firestore ルールの弱点特定
- [ ] サーバーサイド(API/Server Actions)でのロールチェックの有無確認
- [ ] クライアントから見えている機密情報の確認
- [ ] `dangerouslySetInnerHTML` 等の危険な関数の使用箇所確認

## 2. 修正計画
- [ ] 修正案 (`docs/security_review/implementation_plan.md`) の作成

## 3. 実行
- [x] Firestore ルールの修正
- [x] API ルートへの権限チェック追加
- [x] その他脆弱性の修正

## 4. 検証
- [x] 権限エラーの発生確認 (不正アクセス時)
- [x] 正常動作の確認
