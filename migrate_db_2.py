import sqlite3

def migrate():
    print("Migrating DB (is_unreleased)...")
    conn = sqlite3.connect("music_curation_desk.db")
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(album_tracks)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "is_unreleased" not in columns:
            print("Adding is_unreleased to album_tracks")
            cursor.execute("ALTER TABLE album_tracks ADD COLUMN is_unreleased BOOLEAN NOT NULL DEFAULT 0")
            conn.commit()
            print("Migration successful.")
        else:
            print("Column is_unreleased already exists.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
