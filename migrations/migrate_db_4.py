import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import sqlite3

DB_PATH = "./music_curation_desk.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. テーブル作成
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS work_artists_link (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_id INTEGER NOT NULL,
            artist_id INTEGER NOT NULL,
            role_category VARCHAR(50) NOT NULL,
            role_detail VARCHAR(100),
            FOREIGN KEY(work_id) REFERENCES musical_works(id),
            FOREIGN KEY(artist_id) REFERENCES artists(id)
        )
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_work_artist_role 
        ON work_artists_link (work_id, artist_id, role_category)
    """)
    
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS _work_artist_role_uc 
        ON work_artists_link (work_id, artist_id, role_category, role_detail)
    """)
    
    # 2. データ移行 (作詞・作曲をSongからWorkへ)
    print("Migrating lyricists and composers from songs to works...")
    target_roles = ('Lyricist', 'Composer', '作詞', '作曲')
    
    # role_categoryが対象のものを持つsong_artists_linkを探す
    cursor.execute(f"""
        SELECT sl.id, sl.song_id, sl.artist_id, sl.role_category, sl.role_detail, s.work_id
        FROM song_artists_link sl
        JOIN songs s ON sl.song_id = s.id
        WHERE sl.role_category IN (?, ?, ?, ?) AND s.work_id IS NOT NULL
    """, target_roles)
    
    rows_to_migrate = cursor.fetchall()
    migrated_count = 0
    deleted_ids = []
    
    for row in rows_to_migrate:
        link_id, song_id, artist_id, role_category, role_detail, work_id = row
        
        # すでに同じクレジットが存在しないか確認
        cursor.execute("""
            SELECT id FROM work_artists_link 
            WHERE work_id = ? AND artist_id = ? AND role_category = ? 
              AND (role_detail = ? OR (role_detail IS NULL AND ? IS NULL))
        """, (work_id, artist_id, role_category, role_detail, role_detail))
        
        existing = cursor.fetchone()
        if not existing:
            cursor.execute("""
                INSERT INTO work_artists_link (work_id, artist_id, role_category, role_detail)
                VALUES (?, ?, ?, ?)
            """, (work_id, artist_id, role_category, role_detail))
            migrated_count += 1
            
        deleted_ids.append(link_id)
        
    # 古いリンクを削除
    if deleted_ids:
        # SQLiteのIN句の上限を避けるため、チャンク分けするか一つずつ消す
        for did in deleted_ids:
            cursor.execute("DELETE FROM song_artists_link WHERE id = ?", (did,))
            
    conn.commit()
    conn.close()
    
    print(f"Migration completed! Migrated {migrated_count} credits and deleted {len(deleted_ids)} old song credits.")

if __name__ == "__main__":
    migrate()
