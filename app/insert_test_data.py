import requests
import json
from datetime import date

# サーバーのURLとポート
BASE_URL = "http://127.0.0.1:8000"

# ヘッダー (FastAPIがJSONを受け取るための設定)
HEADERS = {
    "Content-Type": "application/json"
}

# --- 共通のAPI呼び出し関数 ---
def post_data(endpoint: str, data: dict):
    url = f"{BASE_URL}{endpoint}"
    # name, title, role のいずれかを取得してログに表示
    log_name = data.get('name') or data.get('title') or data.get('role') or f"Link/Entry (ID: {data.get('song_id') or data.get('performance_id')})"
    print(f"POST {endpoint}: {log_name}...")
    
    try:
        response = requests.post(url, headers=HEADERS, data=json.dumps(data, default=str)) # default=str を追加
        response.raise_for_status() # HTTPエラー (4xx, 5xx) があれば例外を発生
        
        result = response.json()
        print(f"  -> 成功。ID: {result.get('id')}")
        return result.get('id')
        
    except requests.exceptions.HTTPError as e:
        if response.status_code == 400:
            # データベース側のUNIQUE制約エラーは警告としてスキップ
            print(f"  -> 警告: 既に存在します。スキップします。")
            return None 
        else:
            print(f"  -> エラー発生 ({response.status_code}): {e.response.json().get('detail')}")
            return None
    except requests.exceptions.ConnectionError:
        print(f"  -> エラー: サーバー({BASE_URL})に接続できません。FastAPIが起動しているか確認してください。")
        return None

# --- メイン実行ロジック ---
def insert_initial_data():
    
    # 登録されたIDを保持する辞書
    ids = {'artist': {}, 'song': {}, 'tour': {}, 'performance': {}}
    
    # --- 1. マスターデータの登録 ---
    print("\n--- 1. マスターデータの登録 ---")
    
    # 1a. アーティスト登録
    ids['artist']['tabuchi'] = post_data("/artists/", {"name": "田淵智也"})
    ids['artist']['saito'] = post_data("/artists/", {"name": "斎藤宏介"})
    ids['artist']['suzuki'] = post_data("/artists/", {"name": "鈴木貴雄"})
    ids['artist']['unison'] = post_data("/artists/", {"name": "UNISON SQUARE GARDEN"})
    
    # 1b. 楽曲登録
    ids['song']['sentipiri'] = post_data("/songs/", {
        "title": "センチメンタルピリオド",
        "release_date": date(2008, 7, 23),
        "jasrac_code": "12783889"
    })
    ids['song']['orion'] = post_data("/songs/", {
        "title": "オリオンをなぞる",
        "release_date": date(2011, 7, 6),
        "jasrac_code": "70222061"
    })
    
    # 1c. ツアー登録
    ids['tour']['tour2025'] = post_data("/tours/", {
        "name": "UNISON SQUARE GARDEN TOUR 2025-2026 「うるわしの前の晩」"
    })
    
    # 1d. 公演登録 (北海道公演)
    ids['performance']['hokkaido'] = post_data("/performances/", {
        "artist_id": ids['artist']['unison'],
        "tour_id": ids['tour']['tour2025'],
        "performance_type": "Tour",  # One-manからTourに変更
        "name": "2025/12/05 北海道・カナモトホール公演",
        "date": date(2025, 12, 5),
        "venue": "カナモトホール",
        "start_time": "18:30:00" # 時間を追加
    })
    
    
    # --- 2. 紐付けの登録 ---
    print("\n--- 2. 紐付けの登録 ---")
    
    # 2a. センチメンタルピリオドの貢献度 (各メンバーとバンド)
    if ids['song']['sentipiri'] and ids['artist']['tabuchi']:
        s_id = ids['song']['sentipiri']
        
        # メンバーの貢献度 (役割)
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['tabuchi'], "role": "Composer"})
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['tabuchi'], "role": "Lyricist"})
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['tabuchi'], "role": "Bassist"})
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['saito'], "role": "Vocalist"})
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['saito'], "role": "Guitarist"})
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['suzuki'], "role": "Drummer"})

        # バンド名義
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['unison'], "role": "Artist"})
        
    # 2b. 公演セットリストの登録
    if ids['performance']['hokkaido'] and ids['song']['sentipiri'] and ids['song']['orion']:
        p_id = ids['performance']['hokkaido']
        
        # 1曲目: センチメンタルピリオド
        post_data("/setlist_entries/", {"performance_id": p_id, "song_id": ids['song']['sentipiri'], "order_index": 1})
        # 2曲目: オリオンをなぞる
        post_data("/setlist_entries/", {"performance_id": p_id, "song_id": ids['song']['orion'], "order_index": 2})

    # 2c. 公演参加者名簿 (ロースター) の登録
    if ids['performance']['hokkaido'] and ids['artist']['unison']:
        p_id = ids['performance']['hokkaido']
        
        # UNISON SQUARE GARDEN (メインアクト)
        post_data("/performance_roster/", {"performance_id": p_id, "artist_id": ids['artist']['unison'], "role": "Main Act"})
        # メンバーのサポート役割も登録可能だが、ここではシンプルにMain Actのみ

        
    print("\n--- データ投入完了 ---")

if __name__ == "__main__":
    insert_initial_data()