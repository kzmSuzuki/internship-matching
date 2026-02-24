# 追加実装タスクリスト

- [x] 学生ロール: 求人一覧の表形式化 (`src/app/(student)/student/jobs/page.tsx`)
  - [x] テーブルレイアウトへの変更
  - [x] 各カラムヘッダーでのフィルタリング・ソート機能の実装

- [x] 企業ロール: カレンダー入力と応募管理統合
  - [x] 実施期間のカレンダー入力化 (`company/jobs/new/page.tsx`, `company/jobs/[id]/edit/page.tsx`)
  - [x] 面談日設定のカレンダー入力化 (`company/jobs/[id]/page.tsx`)
  - [x] 「求人管理」詳細への「応募者管理」機能の完全統合
  - [x] インターン管理画面への遷移ボタン追加
  - [x] 独立した応募者管理画面 (`company/applicants/page.tsx`) の削除
  - [x] サイドバーからの「応募者管理」メニュー削除

- [x] 共通: ログイン画面の改修 (`src/app/(auth)/login/page.tsx`)
  - [x] 「企業の方はこちら」フォームの常時表示化

- [x] 管理者ロール: 応募者・面談日表示 (`src/app/(admin)/admin/jobs/page.tsx` 等)
  - [x] 求人一覧に承認済み学生名の表示
  - [x] 面談日が設定されている場合の表示追加
