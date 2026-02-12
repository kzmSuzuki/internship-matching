# セキュリティ強化 実装計画

## 方針
不正アクセス防止のため、以下の修正を行う。

### 1. API (`src/app/api/pdf/[fileId]/route.ts`)
- **問題**: 現状、認証なしで誰でもアクセス可能。`firebase-admin` が `package.json` にないため、Edge Runtime (Cloudflare) でのトークン検証導入は困難。
- **対策**: クライアントサイドでの認証チェックを強制するため、このAPIルートを削除し、クライアントから直接署名付きURLを取得する方式（またはGAS側で検証）に切り替えるのが本来望ましいが、今回は影響範囲を最小限にするため、**「隠しAPI」とし、重要なデータ扱わない前提**で運用するか、簡易的なトークン検証ロジックを実装する。
- **現実解**: `Authorization` ヘッダーを受け取り、Firebase AuthのREST API (`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=[API_KEY]`) を叩いてトークンの有効性を確認する処理を追加する。これにより、サーバーレス環境でもAdmin SDKなしで検証可能。

### 2. Firestoreルール (`firestore.rules`)
- **修正**:
  - `match /users/{userId}`: `role` フィールドの `update` を `isAdmin()` に限定し、自己昇格を防ぐ。
  - `match /dailyReports/{reportId}`: `read` 権限を、`resource.data.studentId == request.auth.uid` (作成者) または `isAdmin()` に加え、企業の場合はマッチングID経由での検証が必要だが、データ構造上難しいため、一時的に「認証済み企業」かつ「IDを知っている」状態に限定するか、可能な範囲で絞る。**今回は「認証済み」かつ「ID指定」で良しとするが、コメントでリスクを明記。**
  - `match /evaluations/{evalId}`: 関係者のみに限定。

### 3. 環境変数 (`.env.local` / `.dev.vars`)
- **質問への回答**: `GAS_API_KEY` はローカル開発時 (`next dev`) は `.env.local` に、Cloudflare Workersのエミュレーション時 (`npm run preview` / `wrangler pages dev`) は `.dev.vars` に記載する必要があります。
- **作業**: `.env.local` と `.dev.vars` に `GAS_API_KEY` を追加します（値はユーザーに確認またはプレースホルダー）。

- **作業**: `.env.local` と `.dev.vars` に `GAS_API_KEY` を追加します（値はユーザーに確認またはプレースホルダー）。

### 4. 環境変数 (`NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN`)
- **質問への回答**: `NEXT_PUBLIC_` がついているためフロントエンドから見えます。これは「Googleログイン時のUX（間違ったアカウントでログインしようとしたら即座にエラーを出す）」のために必要です。
- **セキュリティ**: フロントエンドで見えても、「このドメイン以外は拒否する」というルール自体は秘密情報ではないため、セキュリティリスクは低いです。ただし、**サーバーサイド（FirestoreルールやFunctions）での検証が本質的な守り**となります。今回はGoogle認証後のチェックをクライアントサイドで行っていますが、より堅牢にするには `firebase-admin` を使ったサーバーサイド検証が必要です（現状の構成では導入コストが高いため、リスク許容範囲内とします）。

### 5. クライアントサイド
- `page.tsx` 等でのリダイレクト処理はUX向上のみを目的とし、セキュリティ担保はサーバーサイド/DB側で行うことを再確認。

## 実行タスク
1.  `firestore.rules` の修正 (最優先)
2.  `src/app/api/pdf/[fileId]/route.ts` への認証ロジック追加または廃止検討
