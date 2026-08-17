import os
import sqlite3

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "music_curation_desk.db")


def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if column exists
    cursor.execute("PRAGMA table_info(albums);")
    columns = [info[1] for info in cursor.fetchall()]

    if "media_format" not in columns:
        print("Adding media_format column to albums table...")
        cursor.execute("ALTER TABLE albums ADD COLUMN media_format VARCHAR(50) NOT NULL DEFAULT 'CD';")

        # Update existing records
        print("Updating existing records...")
        cursor.execute("""
            UPDATE albums
            SET media_format = 'Digital'
            WHERE spotify_album_id IS NOT NULL AND version_title LIKE '(%)';
        """)
        conn.commit()
        print("Migration completed.")
    else:
        print("media_format column already exists.")

    conn.close()


if __name__ == "__main__":
    migrate()
