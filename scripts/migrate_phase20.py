import os
import sys

# パスの追加
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.models import engine, SessionLocal
from app import models

def run_migration():
    print("Starting Phase 20 Migration...")
    
    with engine.begin() as conn:
        # 1. musical_works テーブルの作成
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS musical_works (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title VARCHAR(255) NOT NULL,
            jasrac_code VARCHAR(20) UNIQUE,
            iswc_code VARCHAR(20) UNIQUE
        );
        """))
        print("Created musical_works table.")

        # 2. songs テーブルに work_id カラムを追加 (すでに存在する場合はスキップ)
        try:
            conn.execute(text("ALTER TABLE songs ADD COLUMN work_id INTEGER REFERENCES musical_works(id);"))
            print("Added work_id to songs table.")
        except Exception as e:
            print("work_id column may already exist. Skipping. Error:", e)

    # 3. 既存の Song データから MusicalWork を自動生成
    db = SessionLocal()
    try:
        songs = db.query(models.Song).all()
        created_count = 0
        for song in songs:
            if song.work_id is None:
                # シンプルに同じタイトルのWorkがなければ作成
                work = db.query(models.MusicalWork).filter(models.MusicalWork.title == song.title).first()
                if not work:
                    work = models.MusicalWork(
                        title=song.title,
                        jasrac_code=song.jasrac_code
                    )
                    db.add(work)
                    db.flush() # idを発行
                    created_count += 1
                
                # 紐付け
                song.work_id = work.id
                
        db.commit()
        print(f"Migration completed successfully. Created {created_count} MusicalWorks.")
    except Exception as e:
        db.rollback()
        print("Migration failed during data population:", e)
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
