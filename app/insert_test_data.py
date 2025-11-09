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
    print(f"POST {endpoint}: {data.get('name') or data.get('title') or data.get('role')}...")
    
    try:
        response = requests.post(url, headers=HEADERS, data=json.dumps(data))
        response.raise_for_status() # HTTPエラー (4xx, 5xx) があれば例外を発生
        
        result = response.json()
        print(f"  -> 成功。ID: {result.get('id')}")
        return result['id']
        
    except requests.exceptions.HTTPError as e:
        if response.status_code == 400:
            print(f"  -> 警告: 既に存在します。スキップします。")
            return None # 既に登録済みの場合はIDを返さない
        else:
            print(f"  -> エラー発生: {e.response.json().get('detail')}")
            return None
    except requests.exceptions.ConnectionError:
        print(f"  -> エラー: サーバー({BASE_URL})に接続できません。FastAPIが起動しているか確認してください。")
        return None

# --- メイン実行ロジック ---
def insert_initial_data():
    
    # --- 1. マスターデータの登録 ---
    
    # 1a. アーティスト登録
    artist_ids = {}
    artist_ids['tabuchi'] = post_data("/artists/", {
        "name": "田淵智也",
        "notes": "UNISON SQUARE GARDENのベーシスト、作詞作曲家"
    })
    artist_ids['saito'] = post_data("/artists/", {
        "name": "斎藤宏介",
        "notes": "UNISON SQUARE GARDENのボーカリスト・ギタリスト"
    })
    artist_ids['suzuki'] = post_data("/artists/", {
        "name": "鈴木貴雄",
        "notes": "UNISON SQUARE GARDENのドラマー"
    })
    artist_ids['unison'] = post_data("/artists/", {
        "name": "UNISON SQUARE GARDEN"
    })
    
    # 1b. 楽曲登録
    song_ids = {}
    song_ids['sentipiri'] = post_data("/songs/", {
        "title": "センチメンタルピリオド",
        "release_date": "2008-07-23",
        "jasrac_code": "12783889" # 今回はコードを短縮して使います
    })
    song_ids['another_world'] = post_data("/songs/", {
        "title": "オリオンをなぞる",
        "release_date": "2011-07-06",
        "jasrac_code": "70222061"
    })
    
    # --- 2. 紐付けの登録 ---
    
    # 2a. センチメンタルピリオドの貢献度 (田淵智也)
    if song_ids['sentipiri'] and artist_ids['tabuchi']:
        post_data("/song_artist_links/", {
            "song_id": song_ids['sentipiri'],
            "artist_id": artist_ids['tabuchi'],
            "role": "Composer"
        })
        post_data("/song_artist_links/", {
            "song_id": song_ids['sentipiri'],
            "artist_id": artist_ids['tabuchi'],
            "role": "Lyricist"
        })
        post_data("/song_artist_links/", {
            "song_id": song_ids['sentipiri'],
            "artist_id": artist_ids['tabuchi'],
            "role": "Bassist"
        })
        post_data("/song_artist_links/", {
            "song_id": song_ids['sentipiri'],
            "artist_id": artist_ids['unison'],
            "role": "Artist" # バンド名義
        })
        
    print("\n--- データ投入完了 ---")

if __name__ == "__main__":
    insert_initial_data()