# 機能改善タスク (Phase 3: Visual Confirmation Fix)

## UI調整
*   管理者画面 (`/admin/jobs`) の削除済み求人カードの色が反映されない問題を修正。
    *   原因: `.glass` クラスのスタイルが `className` を上書きしていた（または競合していた）。
    *   対策: `!bg-gray-300` 等の `!important`修飾子を使用して強制的に適用。

## 完了条件
*   削除済み求人の背景が濃いグレー(`bg-gray-300`)で表示されること。
