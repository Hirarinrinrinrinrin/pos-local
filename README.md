# POSレジ アプリ

タブレット・iPad向けのPOSレジシステム。Next.js + Tailwind CSS + Supabase 構成。

## 画面構成

| URL | 説明 |
|-----|------|
| `/register` | レジ画面（iPad最適化）|
| `/admin` | 管理ダッシュボード |
| `/admin/products` | 商品管理 |
| `/admin/categories` | カテゴリ管理 |
| `/admin/orders` | 注文履歴 |
| `/admin/staff` | スタッフ管理 |

## セットアップ手順

### 1. Supabase データベース設定

Supabase Dashboard の SQL Editor で `supabase/schema.sql` を実行してください。

### 2. 管理者ユーザーの作成

1. Supabase Dashboard > Authentication > Users > 「Add user」
2. メールアドレスとパスワードを設定
3. 作成されたユーザーの UUID をコピー
4. SQL Editor で以下を実行:

```sql
INSERT INTO staff (id, name, role) VALUES
  ('<コピーしたUUID>', '管理者名', 'admin');
```

### 3. ローカル開発

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開き、管理者アカウントでログイン。

### 4. カテゴリ・商品の登録

1. `/admin` にログイン
2. 「カテゴリ」からカテゴリを追加
3. 「商品管理」から商品を追加（価格は税込で入力）

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **スタイル**: Tailwind CSS + shadcn/ui
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **状態管理**: Zustand（カート）
- **言語**: TypeScript

## 料金計算

商品価格はすべて**税込価格**で管理します。レシートでは消費税（10%）を逆算して表示します。
