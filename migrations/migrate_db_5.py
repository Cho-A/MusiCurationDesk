import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "music_curation_desk.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0;")
        conn.commit()
        print("Migration successful: Added is_admin column to users table.")
    except sqlite3.OperationalError as e:
        print(f"Migration failed or already applied: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
