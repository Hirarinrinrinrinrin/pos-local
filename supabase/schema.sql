-- =============================================
-- POS System Database Schema
-- =============================================

-- カテゴリ
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 商品
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),  -- 税込価格（円）
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  stock INTEGER,  -- NULL = 在庫管理なし
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- スタッフ（auth.usersと連携）
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')) DEFAULT 'cashier',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 支払方法
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                        -- 表示名（例: 現金、クレジットカード）
  key TEXT NOT NULL UNIQUE,                  -- 識別子（例: cash, card, paypay）
  requires_amount_input BOOLEAN NOT NULL DEFAULT false,  -- テンキーで金額入力が必要か
  requires_change BOOLEAN NOT NULL DEFAULT false,        -- お釣り計算が必要か（requires_amount_input=true が前提）
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 注文
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total INTEGER NOT NULL CHECK (total >= 0),
  payment_method TEXT NOT NULL,              -- payment_methods.key を格納
  payment_amount INTEGER NOT NULL CHECK (payment_amount >= 0),
  change_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('completed', 'refunded')) DEFAULT 'completed',
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 注文明細
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,       -- 注文時の商品名（変更に強くする）
  price INTEGER NOT NULL,   -- 注文時の単価
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- =============================================
-- インデックス
-- =============================================
CREATE INDEX IF NOT EXISTS idx_payment_methods_key ON payment_methods(key);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全テーブル参照可能
CREATE POLICY "Authenticated users can read payment_methods"
  ON payment_methods FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage payment_methods"
  ON payment_methods FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated users can read categories"
  ON categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read staff"
  ON staff FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read orders"
  ON orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read order_items"
  ON order_items FOR SELECT TO authenticated USING (true);

-- 注文は認証済みユーザーが作成可能
CREATE POLICY "Authenticated users can insert orders"
  ON orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can insert order_items"
  ON order_items FOR INSERT TO authenticated WITH CHECK (true);

-- 商品・カテゴリ管理はadminのみ（staffテーブルのrole確認）
CREATE POLICY "Admin can manage categories"
  ON categories FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can manage products"
  ON products FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- サンプルデータ
-- =============================================
INSERT INTO categories (name, sort_order) VALUES
  ('フード', 1),
  ('ドリンク', 2),
  ('デザート', 3)
ON CONFLICT DO NOTHING;

INSERT INTO payment_methods (name, key, requires_amount_input, requires_change, sort_order) VALUES
  ('現金', 'cash', true, true, 1),
  ('カード', 'card', false, false, 2)
ON CONFLICT (key) DO NOTHING;
