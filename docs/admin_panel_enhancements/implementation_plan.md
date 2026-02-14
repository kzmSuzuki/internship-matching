# 実装計画: 最終調整 (Phase 3)

## 1. 機能削除
*   **対象**: `src/app/(admin)/admin/companies/page.tsx`
*   **内容**:
    *   `handleDeleteCompany` 関数および関連する `deleteDoc` 処理を削除。
    *   UI（モーダル内の削除ボタン）を削除。
    *   不要になったインポート（`firebase/firestore`, `Trash2` アイコンなど）を削除。

## 2. その他（完了済み）
*   企業求人削除の論理削除対応。
*   PDF閲覧のポップアップ対策。
