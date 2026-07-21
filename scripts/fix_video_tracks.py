import sys
import os

sys.path.append(os.path.abspath('.'))

from app.models import SessionLocal, Album, AlbumDisc, AlbumTrack, Song, MusicalWork

def main():
    db = SessionLocal()
    try:
        # Find all discs that are video
        video_discs = db.query(AlbumDisc).filter(AlbumDisc.media_format.in_(['Blu-ray', 'DVD'])).all()
        fixed_count = 0

        for disc in video_discs:
            print(f"Processing Video Disc: {disc.title} (Album {disc.album_id}, Disc {disc.disc_number})")
            
            # Find tracks on this disc
            tracks = db.query(AlbumTrack).filter(
                AlbumTrack.album_id == disc.album_id,
                AlbumTrack.disc_number == disc.disc_number
            ).all()

            for track in tracks:
                original_song = db.query(Song).filter(Song.id == track.song_id).first()
                if original_song and not original_song.is_video:
                    print(f"  Track {track.track_number} is linked to AUDIO song '{original_song.title}' (ID: {original_song.id}). Fixing...")
                    
                    # Create a sensible version_name based on the disc title
                    version_name = disc.title
                    if not version_name:
                        version_name = f"Live - Disc {disc.disc_number}"
                    
                    # See if a video version for this work and version_name already exists
                    existing_video_song = db.query(Song).filter(
                        Song.work_id == original_song.work_id,
                        Song.is_video == True,
                        Song.version_name == version_name
                    ).first()
                    
                    if existing_video_song:
                        print(f"    Found existing video song: {existing_video_song.id}")
                        new_song_id = existing_video_song.id
                    else:
                        print(f"    Creating new video song...")
                        new_song = Song(
                            title=original_song.title,
                            work_id=original_song.work_id,
                            is_video=True,
                            version_name=version_name,
                            is_streaming_available=True # It's a video so it doesn't matter, but default is True
                        )
                        db.add(new_song)
                        db.flush() # get new_song.id
                        new_song_id = new_song.id
                        print(f"    Created new video song ID {new_song_id}")
                    
                    # Attach the track to the new video song
                    track.song_id = new_song_id
                    fixed_count += 1
        
        db.commit()
        print(f"Successfully fixed {fixed_count} video tracks.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
