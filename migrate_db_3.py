import sqlite3
import re

def clean_work_title(title: str) -> str:
    """
    「ガリレオのショーケース - D.A style」 -> 「ガリレオのショーケース」
    「センチメンタルピリオド (S.B style)」 -> 「センチメンタルピリオド」
    「オリオンをなぞる (Official MV)」 -> 「オリオンをなぞる」
    のようにサブタイトル・バージョン表記を除去して基本楽曲名を抽出するヘルパー関数
    """
    if not title:
        return ""
    
    # " - " または " (" または " [" で区切って前の部分を取り出す
    cleaned = re.split(r'\s*[\(\[\-]\s*', title)[0].strip()
    return cleaned if cleaned else title.strip()

def migrate():
    print("Starting DB migration phase 3 (MusicalWorks & Video Flag)...")
    conn = sqlite3.connect("music_curation_desk.db")
    cursor = conn.cursor()
    
    try:
        # 1. Create musical_works table if not exists
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS musical_works (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title VARCHAR(255) NOT NULL,
            jasrac_code VARCHAR(20),
            iswc_code VARCHAR(20)
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_musical_works_title ON musical_works (title);")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_musical_works_id ON musical_works (id);")
        conn.commit()
        
        # 2. Check songs table columns
        cursor.execute("PRAGMA table_info(songs)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "is_video" not in columns:
            print("Adding is_video column to songs table...")
            cursor.execute("ALTER TABLE songs ADD COLUMN is_video BOOLEAN NOT NULL DEFAULT 0")
            conn.commit()
        else:
            print("Column is_video already exists in songs table.")
            
        if "work_id" not in columns:
            print("Adding work_id column to songs table...")
            cursor.execute("ALTER TABLE songs ADD COLUMN work_id INTEGER REFERENCES musical_works(id)")
            conn.commit()
        else:
            print("Column work_id already exists in songs table.")

        # 3. Link all unlinked songs to a MusicalWork
        cursor.execute("SELECT id, title, work_id FROM songs")
        songs = cursor.fetchall()
        
        linked_count = 0
        created_works_count = 0
        
        for song_id, title, work_id in songs:
            if work_id is None:
                base_work_title = clean_work_title(title)
                
                # Check if MusicalWork exists for this base_work_title
                cursor.execute("SELECT id FROM musical_works WHERE title = ?", (base_work_title,))
                work_row = cursor.fetchone()
                
                if work_row:
                    target_work_id = work_row[0]
                else:
                    cursor.execute("INSERT INTO musical_works (title) VALUES (?)", (base_work_title,))
                    target_work_id = cursor.lastrowid
                    created_works_count += 1
                    print(f"Created new MusicalWork: '{base_work_title}' (id={target_work_id})")
                
                cursor.execute("UPDATE songs SET work_id = ? WHERE id = ?", (target_work_id, song_id))
                linked_count += 1
                
        conn.commit()
        print(f"Migration completed successfully. Created {created_works_count} MusicalWorks and linked {linked_count} songs.")
        
    except Exception as e:
        print(f"Migration error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
