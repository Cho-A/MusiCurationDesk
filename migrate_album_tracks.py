import sqlite3

def migrate():
    conn = sqlite3.connect("music_curation_desk.db")
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='album_tracks'")
        row = cursor.fetchone()
        if not row:
            print("Table album_tracks does not exist.")
            return
            
        print("Original schema:", row[0])
        
        # 新しいテーブルを作成
        new_table_sql = """
        CREATE TABLE album_tracks_new (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            album_id INTEGER REFERENCES albums(id),
            song_id INTEGER REFERENCES songs(id),
            track_number INTEGER,
            disc_number INTEGER,
            duration_ms INTEGER,
            CONSTRAINT _album_track_order_uc UNIQUE (album_id, disc_number, track_number)
        )
        """
        cursor.execute(new_table_sql)
        
        # データのコピー
        cursor.execute("INSERT INTO album_tracks_new (id, album_id, song_id, track_number, disc_number, duration_ms) SELECT id, album_id, song_id, track_number, disc_number, duration_ms FROM album_tracks")
        
        # 置き換え
        cursor.execute("DROP TABLE album_tracks")
        cursor.execute("ALTER TABLE album_tracks_new RENAME TO album_tracks")
        
        # インデックスの再作成
        cursor.execute("CREATE INDEX ix_album_tracks_id ON album_tracks (id)")
        
        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        conn.rollback()
        print("Error during migration:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
