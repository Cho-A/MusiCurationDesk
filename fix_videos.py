import sqlite3

DB_PATH = "./music_curation_desk.db"

def fix_videos():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. 曲名から映像作品を判定 (Live, Music Video等が含まれる場合)
    # 既に is_video = 1 になっているものは除外
    cursor.execute("""
        SELECT id, title FROM songs 
        WHERE is_video = 0 AND (
            title LIKE '%(Live%' OR 
            title LIKE '%Live at%' OR
            title LIKE '%Music Video%' OR
            title LIKE '%(MV)%'
        )
    """)
    songs_to_update = cursor.fetchall()
    
    # 2. 収録アルバムのタイトルから映像作品を判定 (Blu-ray, DVD, Video, Live等のディスク)
    # album_tracks 経由で取得
    cursor.execute("""
        SELECT DISTINCT s.id, s.title, a.main_title 
        FROM songs s
        JOIN album_tracks at ON s.id = at.song_id
        JOIN albums a ON at.album_id = a.id
        WHERE s.is_video = 0 AND (
            a.main_title LIKE '%Blu-ray%' OR 
            a.main_title LIKE '%DVD%' OR 
            a.main_title LIKE '%Live%' OR
            a.main_title LIKE '%Tour%' OR
            a.main_title LIKE '%Video%'
        )
    """)
    songs_from_albums = cursor.fetchall()

    update_ids = set()
    
    for row in songs_to_update:
        update_ids.add(row[0])
        print(f"Detected by Title: {row[1]}")
        
    for row in songs_from_albums:
        update_ids.add(row[0])
        print(f"Detected by Album ({row[2]}): {row[1]}")

    if update_ids:
        # IN句に渡すためにリスト化
        id_list = list(update_ids)
        placeholders = ','.join(['?'] * len(id_list))
        cursor.execute(f"UPDATE songs SET is_video = 1 WHERE id IN ({placeholders})", id_list)
        conn.commit()
        print(f"\nSuccessfully updated {len(update_ids)} songs to is_video = True.")
    else:
        print("No songs found to update.")

    conn.close()

if __name__ == "__main__":
    fix_videos()
