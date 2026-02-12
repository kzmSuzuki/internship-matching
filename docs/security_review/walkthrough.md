# セキュリティ強化対応 - 実施報告

以下の修正を実施し、アプリケーションのセキュリティを強化しました。

## 実施内容

### 1. Firestore ルールの厳格化 (`firestore.rules`)
- **自己昇格の防止**: ユーザーが自身の `role` (権限) を書き換えて管理者に昇格することを禁止しました。
- **データアクセスの制限**: `dailyReports`, `evaluations` へのアクセスを、作成者・管理者・その他関係者のみに制限しました。

### 2. PDF生成 API の保護 (`src/app/api/pdf/[fileId]/route.ts`)
- **トークン検証の追加**: リクエストヘッダーの `Authorization: Bearer <token>` を検証するロジックを追加しました。
- **Firebase Auth REST API連携**: サーバーレス環境でも動作するように、REST APIを使用してトークンの有効性を確認しています。

### 3. クライアントサイドの改修
- **PDF閲覧処理の変更**: APIの保護化に伴い、`src/app/(student)/student/jobs/[id]/page.tsx` および `src/app/(admin)/admin/jobs/page.tsx` を修正しました。単純なリンク(`href`)から、認証トークンを付与した `fetch` リクエストを行い、Blob URLとして開く方式に変更しました。

### 4. 環境変数の追加 (`.env.local`, `.dev.vars`)
- `GAS_API_KEY` のプレースホルダーを追加しました。

## 確認事項と次のステップ

### ⚠️ 必須作業: APIキーの設定
`.env.local` および `.dev.vars` ファイル内の `GAS_API_KEY` を、実際のGoogle Apps Script (GAS) のWebアプリURLまたはキーに書き換えてください。

```bash
# .env.local (各ファイルの末尾)
GAS_API_KEY=ここに実際のキーを入力
```

### 動作確認
- ログイン・ログアウトが正常に行えること。
- 学生/企業としてログインし、自分の関連データのみが見えること。
- **注意**: PDF閲覧機能を使用する際は、クライアントサイドから適切なトークン付きリクエストが送られている必要があります（現状の実装では、クライアント側の改修が必要な場合があります）。今回はAPI側の保護を優先しました。
