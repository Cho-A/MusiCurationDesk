import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import sqlite3

def migrate():
    conn = sqlite3.connect("music_curation_desk.db")
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE album_tracks ADD COLUMN media_format VARCHAR(50)")
        conn.commit()
        print("Successfully added media_format column.")
    except Exception as e:
        conn.rollback()
        print("Error during migration:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
