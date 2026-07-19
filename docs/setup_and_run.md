# MusiCuration Desk セットアップと起動方法

本ドキュメントでは、MusiCuration Desk のローカル環境でのセットアップおよびサーバー（バックエンド・フロントエンド）の起動方法について説明します。

## 1. バックエンド (FastAPI) の起動

バックエンドは Python の FastAPI を使用して構築されています。サーバーは `uvicorn` を使用して立ち上げます。

### 起動コマンド
プロジェクトルートディレクトリ（`MusiCurationDesk/`）で以下のコマンドを実行してください。

```bash
uvicorn app.main:app --reload
```

- `--reload` オプションをつけることで、コードを変更した際に自動でサーバーが再起動されます。
- デフォルトでは `http://127.0.0.1:8000` でサーバーが起動します。
- APIドキュメント（Swagger UI）には `http://127.0.0.1:8000/docs` からアクセスできます。

## 2. フロントエンド (React + Vite) の起動

フロントエンドは Vite を使用した React アプリケーションです。

### 起動コマンド
プロジェクトのルートから `frontend` ディレクトリに移動し、開発サーバーを起動します。

```bash
cd frontend
npm run dev
```

- 初回起動時や依存パッケージを追加した場合は、事前に `npm install` を実行してください。
- 起動すると、ターミナルにアクセス用URL（通常は `http://localhost:5173`）が表示されます。ブラウザでそのURLを開いてください。

## 3. テストデータの投入（オプション）

データベース（SQLite: `music_curation_desk.db`）が空の状態からテストデータを流し込む場合は、バックエンドサーバーを起動した状態で以下のスクリプトを実行してください。

```bash
python3 app/insert_test_data.py
```
