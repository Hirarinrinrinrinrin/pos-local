-- =============================================
-- Migration: 支払方法テーブルの追加
-- Supabase ダッシュボードの SQL Editor で実行してください
-- =============================================

-- 1. payment_methods テーブルを作成
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  requires_change BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. インデックス
CREATE INDEX IF NOT EXISTS idx_payment_methods_key ON payment_methods(key);

-- 3. RLS を有効化
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- 4. 認証済みユーザーは読み取り可
CREATE POLICY "Authenticated users can read payment_methods"
  ON payment_methods FOR SELECT TO authenticated USING (true);

-- 5. admin のみ CRUD 可
CREATE POLICY "Admin can manage payment_methods"
  ON payment_methods FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. orders テーブルの payment_method CHECK 制約を削除（任意の文字列を許可）
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- 7. デフォルトデータを挿入
INSERT INTO payment_methods (name, key, requires_change, sort_order) VALUES
  ('現金', 'cash', true, 1),
  ('カード', 'card', false, 2)
ON CONFLICT (key) DO NOTHING;
