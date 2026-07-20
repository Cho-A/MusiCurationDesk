from __future__ import annotations
import requests
import json
from datetime import date, time # ★ time をインポート

# サーバーのURLとポート
BASE_URL = "http://127.0.0.1:8000"

# ヘッダー (FastAPIがJSONを受け取るための設定)
HEADERS = {
    "Content-Type": "application/json"
}

# 登録されたIDを保持するグローバル辞書
ids = {
    'user': {},
    'artist': {}, 
    'song': {}, 
    'tour': {}, 
    'performance': {},
    'album': {},
    'tieup': {}
}

# --- 共通のAPI呼び出し関数 ---
def post_data(endpoint: str, data: dict):
    url = f"{BASE_URL}{endpoint}"
    # name, title, role, username のいずれかを取得してログに表示
    log_name = data.get('name') or data.get('title') or data.get('role') or data.get('username') or f"Link/Entry (ID: {data.get('song_id') or data.get('performance_id')})"
    print(f"POST {endpoint}: {log_name}...")
    
    try:
        # datetime.date や datetime.time をJSONシリアライズ可能にする
        response = requests.post(url, headers=HEADERS, data=json.dumps(data, default=str)) 
        response.raise_for_status() # HTTPエラー (4xx, 5xx) があれば例外を発生
        
        result = response.json()
        print(f"  -> 成功。ID: {result.get('id')}")
        return result.get('id')
        
    except requests.exceptions.HTTPError as e:
        if response.status_code == 400 and "既に存在します" in response.text:
            print(f"  -> 警告: 既に存在します。スキップします。")
            return None 
        else:
            try:
                error_detail = e.response.json().get('detail')
            except json.JSONDecodeError:
                error_detail = e.response.text # JSONデコード失敗時はHTMLやテキストをそのまま表示
            print(f"  -> エラー発生 ({response.status_code}): {error_detail}")
            return None
    except requests.exceptions.ConnectionError:
        print(f"  -> エラー: サーバー({BASE_URL})に接続できません。FastAPIが起動しているか確認してください。")
        return None
    except Exception as e:
        print(f"  -> 予期せぬエラー: {e}")
        return None

# --- メイン実行ロジック ---
def insert_initial_data():
    
    # --- 1. マスターデータの登録 ---
    print("\n--- 1. マスターデータの登録 ---")
    
    # 1a. ユーザー登録
    ids['user']['main_user'] = post_data("/users/", {
        "username": "mcd_user",
        "email": "user@example.com",
        "password": "password123"
    })
    
    # 1b. アーティスト登録
    ids['artist']['tabuchi'] = post_data("/artists/", {"name": "田淵智也"})
    ids['artist']['saito'] = post_data("/artists/", {"name": "斎藤宏介"})
    ids['artist']['suzuki'] = post_data("/artists/", {"name": "鈴木貴雄"})
    ids['artist']['unison'] = post_data("/artists/", {"name": "UNISON SQUARE GARDEN"})
    
    # 1c. 楽曲登録
    ids['song']['sentipiri'] = post_data("/songs/", {
        "title": "センチメンタルピリオド",
        "release_date": date(2008, 7, 23).isoformat(),
        "jasrac_code": "12783889",
        "spotify_title": "センチメンタルピリオド"
    })
    ids['song']['orion'] = post_data("/songs/", {
        "title": "オリオンをなぞる",
        "release_date": date(2011, 7, 6).isoformat(),
        "jasrac_code": "70222061",
        "spotify_title": "オリオンをなぞる"
    })
    
    # 1d. ツアー登録
    ids['tour']['tour2025'] = post_data("/tours/", {
        "name": "UNISON SQUARE GARDEN TOUR 2025-2026 「うるわしの前の晩」"
    })
    ids['tour']['buzzrhythm'] = post_data("/tours/", {
        "name": "バズリズム LIVE 2020"
    })
    
    # 1d-2. 会場登録
    ids['venue'] = {}
    ids['venue']['kanamoto'] = post_data("/venues/", {
        "name": "カナモトホール",
        "prefecture": "北海道",
        "capacity": 1500
    })
    ids['venue']['air_g'] = post_data("/venues/", {
        "name": "AIR-G' スタジオ",
        "prefecture": "北海道"
    })
    
    # 1e. 公演登録 (北海道公演)
    ids['performance']['hokkaido'] = post_data("/performances/", {
        "artist_id": ids['artist']['unison'],
        "tour_id": ids['tour']['tour2025'],
        "performance_type": "Tour",
        "name": "2025/12/05 北海道・カナモトホール公演",
        "date": date(2025, 12, 5).isoformat(),
        "venue_id": ids['venue']['kanamoto'],
        "start_time": time(18, 30).isoformat()
    })
    
    # 1e-2. ラジオイベント (セトリなし)
    ids['performance']['radio_event'] = post_data("/performances/", {
        "artist_id": ids['artist']['unison'],
        "performance_type": "Other",
        "event_type": "Radio",
        "name": "機材車ラジオ 公開収録",
        "date": date(2025, 12, 6).isoformat(),
        "venue_id": ids['venue']['air_g'],
        "start_time": time(20, 0).isoformat()
    })
    
    # 1e-3. 企画ステージ (メインアーティストなし)
    ids['performance']['buzz_session'] = post_data("/performances/", {
        "tour_id": ids['tour']['buzzrhythm'],
        "performance_type": "Festival",
        "event_type": "Live",
        "name": "スペシャルセッション",
        "date": date(2020, 11, 7).isoformat(),
        "start_time": time(19, 30).isoformat()
    })
    
    # 1f. アルバム登録
    ids['album']['jet_co'] = post_data("/albums/", {
        "main_title": "UNISON SQUARE GARDEN",
        "version_title": "通常盤",
        "artist_id": ids['artist']['unison'],
        "physical_release_date": date(2009, 4, 15).isoformat(),
        "album_type": "Audio"
    })
    
    # 1g. タイアップ登録 (階層テスト)
    ids['tieup'] = {}
    # シリーズ (IP)
    ids['tieup']['tiger_bunny_ip'] = post_data("/tieups/", {
        "name": "TIGER & BUNNY",
        "category": "Series"
    })
    # アニメ版
    if ids['tieup']['tiger_bunny_ip']:
        ids['tieup']['tiger_bunny_anime'] = post_data("/tieups/", {
            "name": "TIGER & BUNNY",
            "category": "Anime",
            "parent_id": ids['tieup']['tiger_bunny_ip']
        })

    # --- 2. 紐付けの登録 ---
    print("\n--- 2. 紐付けの登録 ---")
    
    # 2a. センチメンタルピリオドの貢献度 (各メンバーとバンド)
    if ids['song']['sentipiri'] and ids['artist']['tabuchi']:
        s_id = ids['song']['sentipiri']
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['tabuchi'], "role_category": "Composer"})
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['tabuchi'], "role_category": "Lyricist"})
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['tabuchi'], "role_category": "Bassist"})
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['saito'], "role_category": "Vocalist"})
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['saito'], "role_category": "Guitarist"})
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['suzuki'], "role_category": "Drummer"})
        post_data("/song_artist_links/", {"song_id": s_id, "artist_id": ids['artist']['unison'], "role_category": "Artist"})
        
    # 2b. 公演セットリストの登録
    if ids['performance']['hokkaido'] and ids['song']['sentipiri'] and ids['song']['orion']:
        p_id = ids['performance']['hokkaido']
        post_data("/setlist_entries/", {"performance_id": p_id, "song_id": ids['song']['sentipiri'], "order_index": 1, "notes": "本編1曲目"})
        post_data("/setlist_entries/", {
        "performance_id": ids['performance']['hokkaido'],
        "song_id": ids['song']['orion'],
        "order_index": 2,
        "entry_type": "SONG"
    })
    
    # 北海道公演 ドラムソロ (曲IDなし)
    post_data("/setlist_entries/", {
        "performance_id": ids['performance']['hokkaido'],
        "order_index": 3,
        "entry_type": "SOLO",
        "unresolved_song_name": "ドラムソロ"
    })
    
    # セッションのセットリスト
    post_data("/setlist_entries/", {
        "performance_id": ids['performance']['buzz_session'],
        "order_index": 1,
        "entry_type": "JAM",
        "unresolved_song_name": "スキマスイッチ × UNISON コラボセッション",
        "notes": "全力少年"
    })

    # 2c. Roster (参加者) 登録
    # UNISON SQUARE GARDEN メンバー
    post_data("/performance_roster/", {
        "performance_id": ids['performance']['hokkaido'],
        "artist_id": ids['artist']['unison'],
        "role": "Main Act"
    })
    
    # セッションの参加者
    post_data("/performance_roster/", {
        "performance_id": ids['performance']['buzz_session'],
        "artist_id": ids['artist']['unison'],
        "role": "Guest Act",
        "context": "スペシャルセッション参加"
    })

    # 2d. アルバム収録曲の登録
    if ids['album']['jet_co'] and ids['song']['sentipiri']:
        post_data("/album_tracks/", {
            "album_id": ids['album']['jet_co'],
            "song_id": ids['song']['sentipiri'],
            "track_number": 2,
            "disc_number": 1
        })

    # 2e. 楽曲とタイアップの紐付け
    if 'tieup' in ids and 'tiger_bunny_anime' in ids['tieup'] and ids['song']['orion']:
        post_data("/song_tieup_links/", {
            "song_id": ids['song']['orion'],
            "tieup_id": ids['tieup']['tiger_bunny_anime'],
            "context": "第1クール オープニングテーマ",
            "sort_index": 10
        })

    # --- 3. ユーザーデータの登録 ---
    print("\n--- 3. ユーザーデータの登録 ---")
    
    user_id = ids['user']['main_user']
    
    # 3a. 公演参加履歴 ("いった")
    if user_id and ids['performance']['hokkaido']:
        post_data("/user_attendance/", {
            "user_id": user_id,
            "performance_id": ids['performance']['hokkaido'],
            "status": "Attended"
        })
        
    # 3b. アルバム所有状況 ("持ってる")
    if user_id and ids['album']['jet_co']:
        post_data("/user_possessions/", {
            "user_id": user_id,
            "entity_type": "album",
            "entity_id": ids['album']['jet_co'],
            "status": "Owned"
        })

    print("\n--- データ投入完了 ---")

if __name__ == "__main__":
    insert_initial_data()