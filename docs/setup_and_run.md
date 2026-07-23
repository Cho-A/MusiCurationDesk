# MusiCuration Desk セットアップと起動方法

本ドキュメントでは、MusiCuration Desk のローカル環境でのセットアップおよびサーバー（バックエンド・フロントエンド）の起動方法について説明します。

## 1. 推奨の起動方法 (Docker Compose)

開発環境は **Docker** を使用して一元管理されています。この方法を使うと、コマンド1つでバックエンドとフロントエンドの両方が自動的に起動します。

### 前提条件
- 実行環境に **Docker** と **Docker Compose** がインストールされていること
  （インストールされていない場合は `sudo apt install docker.io docker-compose-v2` 等でインストールしてください）

### 起動コマンド
プロジェクトルートディレクトリ（`MusiCurationDesk/`）で以下のコマンドを実行してください。

```bash
docker compose up -d --build
```

これだけで以下のサービスが立ち上がります：
- **バックエンド (FastAPI)**: `http://localhost:8000`
  （APIドキュメント: `http://localhost:8000/docs`）
- **フロントエンド (React)**: `http://localhost:5173` もしくは `http://localhost:3000`

ログを確認したい場合は：
```bash
docker compose logs -f
```

コンテナを停止する場合は：
```bash
docker compose down
```

### 便利なエイリアス設定（任意）
毎回コマンドを入力する手間を省くため、ご使用のシェルの設定ファイル（`~/.bashrc` や `~/.zshrc` など）に以下のエイリアスを追記しておくと便利です。

```bash
# MusiCurationDesk Shortcuts
alias mcd='cd /home/takanoryo/MusiCurationDesk'
alias dc='docker compose'
alias dcu='docker compose up'
alias dcd='docker compose down'

# どこからでも一発で起動・停止・ログ確認ができるエイリアス
alias mcd-start='cd /home/takanoryo/MusiCurationDesk && docker compose up -d'
alias mcd-stop='cd /home/takanoryo/MusiCurationDesk && docker compose down'
alias mcd-logs='cd /home/takanoryo/MusiCurationDesk && docker compose logs -f'
```


---

## 2. 手動での起動方法 (非推奨)

Dockerを使用せず、直接ローカルで動かす場合の手順です。

### バックエンド (FastAPI) の起動
1. Python 3.11以上の仮想環境を作成し有効化します。
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. 依存パッケージをインストールします。
   ```bash
   pip install -r requirements.txt
   ```
3. サーバーを起動します。
   ```bash
   uvicorn backend.main:app --reload
   ```

### フロントエンド (React + Vite) の起動
1. 別のターミナルを開き、`frontend` ディレクトリに移動します。
   ```bash
   cd frontend
   ```
2. （初回のみ）依存パッケージをインストールします。
   ```bash
   npm install
   ```
3. 開発サーバーを起動します。
   ```bash
   npm run dev
   ```

---

## 3. テストデータの投入（オプション）

データベース（SQLite: `music_curation_desk.db`）が空の状態からテストデータを流し込む場合は、バックエンドサーバーを起動した状態で以下のスクリプトを実行してください。（※Docker起動時でもホスト側で実行可能です）

```bash
source .venv/bin/activate
python3 backend/insert_test_data.py
```
