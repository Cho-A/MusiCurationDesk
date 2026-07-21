from app import models, schemas

def test():
    db = models.SessionLocal()
    try:
        # GET /albums/ と同じロジック
        albums = db.query(models.Album).order_by(models.Album.id.desc()).all()
        print("Total albums:", len(albums))
        for album in albums:
            try:
                # FastAPIが内部で行うのと同じようにPydanticでバリデーション
                schema_album = schemas.Album.model_validate(album)
            except Exception as e:
                print(f"Error on album ID {album.id} ({album.main_title}):", e)
                break
    except Exception as e:
        print("DB Error:", e)
    finally:
        db.close()

if __name__ == "__main__":
    test()
