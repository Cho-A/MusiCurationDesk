import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))
from app.models import SessionLocal, Artist, SongArtistLink, PerformanceRoster, Performance, Alias
db = SessionLocal()

# Find artists to delete
artists_to_delete = db.query(Artist).filter(Artist.id > 4).all()
artist_ids = [a.id for a in artists_to_delete]

if artist_ids:
    print(f"Deleting {len(artist_ids)} artists...")
    # Delete related Alias
    db.query(Alias).filter(Alias.artist_id.in_(artist_ids)).delete(synchronize_session=False)
    # Delete related SongArtistLink
    db.query(SongArtistLink).filter(SongArtistLink.artist_id.in_(artist_ids)).delete(synchronize_session=False)
    # Delete related PerformanceRoster
    db.query(PerformanceRoster).filter(PerformanceRoster.artist_id.in_(artist_ids)).delete(synchronize_session=False)
    # Nullify main_artist in Performance
    db.query(Performance).filter(Performance.artist_id.in_(artist_ids)).update({"artist_id": None}, synchronize_session=False)
    
    # Finally delete the artists
    db.query(Artist).filter(Artist.id.in_(artist_ids)).delete(synchronize_session=False)
    
    db.commit()
    print("Deleted successfully!")
else:
    print("No garbage artists found.")
