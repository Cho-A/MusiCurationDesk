# MusiCurationDesk
A web application for curating music data (JASRAC, Spotify, LiveFans) and creating advanced Spotify playlists.

# 要件をいろいろ書きならべてみる
【楽曲関連】
・Livefansなどですでにできること
1. 自分がこの曲を最後に聞いたのはいつかを知りたい
2. この曲が最後に演奏されたのはいつかを知りたい
・既存サービスではできないこと
1. 特定のアーティストが携わった曲（楽曲提供・演奏参加含め）を網羅したい
2. 一番ライブで聴いている曲を知りたい（アーティストごと・年ごとで分類したい）
3. どの会場に何回ライブで行ったことがあるかを知りたい
4. この件にはライブで行ったことがあるかを地図形式で網羅したい
5. 特定アーティストに何回あったことがあるかを知りたい（ライブ以外にも、サイン会やラジオ収録イベントなどがある）
・Spotify連携関連
1. 特定ライブのセットリストをすぐに作りたい
2. 検索した楽曲情報をすぐにプレイリストにしたい

# セットアップと起動方法

詳細なセットアップや開発環境の構築手順については、[セットアップと起動ドキュメント](file:///home/takanoryo/MusiCurationDesk/docs/setup_and_run.md) をご参照ください。

**クイックスタート:**
1. バックエンドの起動 (プロジェクトルートで実行)
   ```bash
   uvicorn backend.main:app --reload
   ```
2. フロントエンドの起動 (`frontend` ディレクトリで実行)
   ```bash
   cd frontend
   npm run dev
   ```
