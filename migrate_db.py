import sqlite3

def migrate():
    print("Migrating DB...")
    conn = sqlite3.connect("music_curation_desk.db")
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(album_tracks)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "display_title" not in columns:
            print("Adding display_title to album_tracks")
            cursor.execute("ALTER TABLE album_tracks ADD COLUMN display_title VARCHAR(255)")
            conn.commit()
            print("Migration successful.")
        else:
            print("Column display_title already exists.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
