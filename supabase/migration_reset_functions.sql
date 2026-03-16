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

  -- Supabase の安全機能回避のため WHERE id IS NOT NULL を付与（全件削除と同義）
  DELETE FROM order_items   WHERE id IS NOT NULL;
  DELETE FROM orders        WHERE id IS NOT NULL;
  DELETE FROM daily_openings WHERE id IS NOT NULL;
  DELETE FROM daily_closings WHERE id IS NOT NULL;
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

  -- 注文データ
  DELETE FROM order_items    WHERE id IS NOT NULL;
  DELETE FROM orders         WHERE id IS NOT NULL;
  DELETE FROM daily_openings  WHERE id IS NOT NULL;
  DELETE FROM daily_closings  WHERE id IS NOT NULL;

  -- マスタデータ（products → categories の順で削除）
  DELETE FROM products        WHERE id IS NOT NULL;
  DELETE FROM categories      WHERE id IS NOT NULL;
  DELETE FROM payment_methods WHERE id IS NOT NULL;
END;
$$;

-- 実行権限を認証済みユーザーに付与（RLSはfunc内でチェック）
GRANT EXECUTE ON FUNCTION reset_order_data() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_all_data() TO authenticated;
