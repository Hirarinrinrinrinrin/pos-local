-- =============================================
-- Migration: Add closing_denomination_breakdown to daily_closings
-- Run this in Supabase SQL Editor
-- =============================================

ALTER TABLE daily_closings
  ADD COLUMN IF NOT EXISTS closing_denomination_breakdown JSONB NOT NULL DEFAULT '{}';
  -- 締め時の金種内訳 {"10000": 3, "1000": 5, ...}
