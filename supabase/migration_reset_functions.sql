-- =============================================
-- Migration: Add data reset RPC functions
-- Run this in Supabase SQL Editor
-- =============================================

-- 注文データリセット（営業データのみ）
-- orders / order_items / daily_openings / daily_closings を削除
CREATE OR REPLACE FUNCTION reset_order_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Adminのみ実行可能
  IF NOT EXISTS (
    SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM daily_openings;
  DELETE FROM daily_closings;
END;
$$;

-- 全データリセット（マスタデータも含む）
-- 上記 + products / categories / payment_methods を削除
CREATE OR REPLACE FUNCTION reset_all_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Adminのみ実行可能
  IF NOT EXISTS (
    SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  -- 注文データ（order_itemsはordersのCASCADEで連動）
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM daily_openings;
  DELETE FROM daily_closings;

  -- マスタデータ（products → categories の順で削除）
  DELETE FROM products;
  DELETE FROM categories;
  DELETE FROM payment_methods;
END;
$$;

-- 実行権限を認証済みユーザーに付与（RLSはfunc内でチェック）
GRANT EXECUTE ON FUNCTION reset_order_data() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_all_data() TO authenticated;
