import os
import sys

# backendディレクトリをパスに追加
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from backend.models import SessionLocal, engine, Base
from backend import models

def setup_db():
    # album_groups テーブルを作成する
    models.Base.metadata.create_all(bind=engine)
    
    # albums テーブルにカラムを追加する (sqliteではカラム追加時にIF NOT EXISTSがないのでtry/exceptで囲む)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE albums ADD COLUMN album_group_id INTEGER REFERENCES album_groups(id)"))
            conn.commit()
    except Exception as e:
        print("Column album_group_id may already exist:", e)

def migrate_album_groups():
    setup_db()
    
    db = SessionLocal()
    try:
        albums = db.query(models.Album).all()
        groups_created = 0
        albums_updated = 0
        
        # main_title と artist_id をキーにしてグルーピング
        groups_map = {}
        for album in albums:
            # 既に割り当て済みならスキップ
            if album.album_group_id is not None:
                continue
            key = (album.main_title, album.artist_id)
            if key not in groups_map:
                groups_map[key] = []
            groups_map[key].append(album)
            
        for (title, artist_id), grouped_albums in groups_map.items():
            sorted_albums = sorted(
                grouped_albums, 
                key=lambda x: x.physical_release_date or x.digital_release_date or datetime.date(2099, 12, 31)
            )
            primary_album = sorted_albums[0]
            
            # AlbumGroup を作成
            album_group = models.AlbumGroup(
                title=title,
                artist_id=artist_id,
                release_date=primary_album.physical_release_date or primary_album.digital_release_date,
                album_type=primary_album.album_type,
                cover_image_url=primary_album.cover_image_url
            )
            db.add(album_group)
            db.flush() # idを発番させる
            groups_created += 1
            
            # 各Albumにalbum_group_idをセット
            for a in grouped_albums:
                a.album_group_id = album_group.id
                albums_updated += 1
                
        db.commit()
        print(f"Migration successful: Created {groups_created} AlbumGroups, Updated {albums_updated} Albums.")
        
    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
        
    finally:
        db.close()

if __name__ == "__main__":
    import datetime
    migrate_album_groups()
