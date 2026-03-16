-- =============================================
-- Migration: Add daily_openings table
-- Run this in Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS daily_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  opening_cash INTEGER NOT NULL DEFAULT 0,          -- 釣り銭準備金合計（円）
  denomination_breakdown JSONB NOT NULL DEFAULT '{}',  -- 金種内訳 {"10000": 3, "1000": 5, ...}
  opened_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  note TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_openings_date ON daily_openings(date);

-- =============================================
-- 既存テーブルへのカラム追加（再実行時用）
-- =============================================
ALTER TABLE daily_openings
  ADD COLUMN IF NOT EXISTS denomination_breakdown JSONB NOT NULL DEFAULT '{}';

ALTER TABLE daily_openings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily_openings"
  ON daily_openings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage daily_openings"
  ON daily_openings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );
