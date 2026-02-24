# 実装計画

1. **データモデル(`src/types/index.ts`)の更新**
   - `JobPosting` に `hasTransportation?: boolean;` および `hasAccommodation?: boolean;` を追加。
   - コメントの修正（想定アウトプット -> 期待する成果・想定アウトプット）。

2. **企業向け機能の更新**
   - 求人作成(`company/jobs/new/page.tsx`)および求人詳細(`company/jobs/[id]/page.tsx`)のUIへ、「期待する成果・想定アウトプット」のラベル修正と、「交通費の支給」「宿泊費の支給」の有無を選択・表示する要素を追加。
   - プロフィール画面(`company/profile/page.tsx`)のタイトル付近に、求人作成手順に関する注意文言を追加。

3. **学生向け機能の更新**
   - 求人詳細(`student/jobs/[id]/page.tsx`)のUIへ、ラベル修正ならびに「交通費の支給」「宿泊費の支給」の表示を追加。
   - 既に応募中・応募済みの場合のUIステータス表示下に、「間違って応募した場合は〜」という赤文字の注意書きを追加。

4. **管理者向け機能の更新**
   - `src/services/admin.ts` に新規メソッド `cancelApplication` と `cancelJob` を追加し、DBのステータスを`cancelled`および`closed`に変更する処理を実装。また `getAllApplications` メソッドで全ステータスの応募を取得できるようにする。
   - `admin/applications/page.tsx` に検索・フィルタ機能の拡張と「応募取消」「オファー取消」「承諾取消」それぞれのステータスに応じた取り消しボタンを追加。
   - `admin/jobs/page.tsx` に各求人を強制終了できる「求人の取消(強制取り消し)」ボタンを追加し、機能と連携させる。
