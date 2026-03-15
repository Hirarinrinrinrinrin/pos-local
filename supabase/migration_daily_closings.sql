-- =============================================
-- Migration: Add daily_closings table
-- Run this in Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS daily_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_sales INTEGER NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  refund_count INTEGER NOT NULL DEFAULT 0,
  refund_total INTEGER NOT NULL DEFAULT 0,
  payment_breakdown JSONB NOT NULL DEFAULT '{}',
  closed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  note TEXT,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_closings_date ON daily_closings(date);

ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily_closings"
  ON daily_closings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage daily_closings"
  ON daily_closings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );
