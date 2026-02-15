# 実装計画：セキュリティ修正、クリーンアップ、メール通知機能

## ゴール
1.  **セキュリティ**: APIキーの保護、不要なログの削除、GASスクリプトの安全化。
2.  **クリーンアップ**: デバッグ用コードの削除。
3.  **メール通知**: 応募、承認、マッチング成立時のメール自動送信。

## ユーザーレビューが必要な事項
> [!IMPORTANT]
> **GAS (Google Apps Script) の手動更新手順**
> セキュリティ強化のため、以下の手順でGASを更新してください：
> 1. `gas/Code.gs` の内容をエディタで更新（ファイル内容は後ほど提示します）。
> 2. GASエディタの [プロジェクトの設定] (歯車アイコン) > [スクリプト プロパティ] を開く。
> 3. 以下のプロパティを追加・設定する：
>    - `PDF_FOLDER_ID`: PDFを保存するGoogle DriveフォルダID
>    - `API_KEY`: 任意のシークレット文字列（推測困難なもの）
> 4. [デプロイ] > [新しいデプロイ] から、種類「ウェブアプリ」を選択し、**すべてのユーザー** がアクセスできるようにしてデプロイ。
> 5. 取得したウェブアプリURLとAPIキーを、Next.jsの `.env.local` に設定：
>    - `GAS_API_URL`: ウェブアプリURL
>    - `GAS_API_KEY`: 設定したAPIキー

## 変更内容

### 1. セキュリティ & クリーンアップ

#### [MODIFY] [gas/Code.gs](file:///Users/kazuma/Documents/dev/intern/internship-matching/gas/Code.gs)
- ハードコードされた認証情報を削除し、`ScriptProperties` を使用。
- メール送信アクションの堅牢化。

#### [MODIFY] [src/app/api/pdf/upload/route.ts](file:///Users/kazuma/Documents/dev/intern/internship-matching/src/app/api/pdf/upload/route.ts)
- `console.log` の削除（特にペイロードやAPIキーの一部を出力している箇所）。
- エラーハンドリングの整理。

#### [MODIFY] [src/app/api/pdf/[fileId]/route.ts](file:///Users/kazuma/Documents/dev/intern/internship-matching/src/app/api/pdf/[fileId]/route.ts)
- `console.log` の削除。

#### [MODIFY] [src/app/(company)/company/jobs/page.tsx](file:///Users/kazuma/Documents/dev/intern/internship-matching/src/app/(company)/company/jobs/page.tsx)
- デバッグログの削除。

#### [MODIFY] [src/components/layout/Sidebar.tsx](file:///Users/kazuma/Documents/dev/intern/internship-matching/src/components/layout/Sidebar.tsx)
- デバッグログの削除。

### 2. メール通知機能

#### [NEW] `src/app/api/send-email/route.ts`
- サーバーサイドでGASのメール送信エンドポイントを叩くAPIルート。
- APIキーをクライアントに露出させないためのプロキシとして機能。

#### [NEW] `src/lib/sendEmail.ts`
- メール送信APIを呼び出すためのヘルパー関数。

#### [MODIFY] [src/services/matching.ts](file:///Users/kazuma/Documents/dev/intern/internship-matching/src/services/matching.ts)
- 以下のタイミングでメール送信をトリガーするように修正：
    1. **学生応募時 (`applyJob`)**: 学生へ「応募完了メール」。
    2. **管理者承認時 (`approveByAdmin`)**: 企業へ「新規応募通知メール」。
    3. **企業オファー時 (`approveByCompany`)**: 学生へ「オファー受信メール」。
    4. **学生承諾時 (`acceptMatchByStudent`)**: 企業へ「マッチング成立メール」。
- 各メソッド内で、対象ユーザー（学生/企業）のメールアドレスをFirestoreから取得するロジックを追加。

## 検証計画

### 手動検証
1.  **セキュリティ確認**:
    - `grep` コマンドで `console.log` や APIキー文字列がコードに残っていないか最終確認。
    - PDFアップロード機能が正常に動作し、GAS側で認証エラーが起きないか確認。
2.  **メール通知テスト**:
    - 実際にアプリケーション上で求人応募フローを一通り実施し、指定したメールアドレス（自分のアドレス等に変更してテスト）にメールが届くか確認。
    - ※GASの `MailApp` の送信数上限（1日100通程度）に注意。
