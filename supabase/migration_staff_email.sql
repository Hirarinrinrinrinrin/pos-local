-- staff テーブルに email カラムを追加
-- スタッフ追加時にメールアドレスを staff テーブルにも保存するための変更

ALTER TABLE staff ADD COLUMN IF NOT EXISTS email TEXT;
