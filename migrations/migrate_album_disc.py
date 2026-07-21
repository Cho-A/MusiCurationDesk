import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import sqlite3

def migrate():
    conn = sqlite3.connect("music_curation_desk.db")
    cursor = conn.cursor()
    
    try:
        # Create album_discs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS album_discs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                album_id INTEGER NOT NULL,
                disc_number INTEGER NOT NULL,
                title VARCHAR(255),
                media_format VARCHAR(50),
                FOREIGN KEY(album_id) REFERENCES albums(id)
            )
        """)
        
        # Add notes to album_tracks
        cursor.execute("ALTER TABLE album_tracks ADD COLUMN notes VARCHAR(255)")
        
        # Optional: migrate existing media_format from album_tracks to album_discs if needed, 
        # but for now we'll just let them coexist or let new imports populate album_discs.
        
        conn.commit()
        print("Successfully created album_discs and added notes column.")
    except Exception as e:
        conn.rollback()
        print("Error during migration:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
