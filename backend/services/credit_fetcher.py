from __future__ import annotations
from sqlalchemy.orm import Session
from datetime import datetime
from .. import models
from .spotify_client import SpotifyClient
from .musicbrainz_client import MusicBrainzClient

class MusicImporter:
    def __init__(self):
        self.spotify = SpotifyClient()
        self.mb = MusicBrainzClient()
        
    def import_track_from_spotify(self, spotify_track_id: str, db: Session, skip_mb_lookup: bool = False):
        """SpotifyのトラックIDから楽曲情報を取得し、MusicBrainzでクレジットを補完してDBに保存する"""
        
        # 1. 既にDBに存在するかチェック
        # まずはSpotifyのTrack IDで完全一致するか確認（過去にインポート済みの場合）
        existing_song = db.query(models.Song).filter(models.Song.spotify_song_id == spotify_track_id).first()
        if existing_song:
            return existing_song

        # 2. Spotifyからトラック詳細情報を取得
        track_data = self.spotify.get_track(spotify_track_id)
        if not track_data:
            raise ValueError("Track not found on Spotify")
            
        # 3. ISRCによる重複排除
        isrc = track_data.get('external_ids', {}).get('isrc')
        if isrc:
            existing_by_isrc = db.query(models.Song).filter(models.Song.isrc == isrc).first()
            if existing_by_isrc:
                # 完全に同一の音源が存在する場合は既存の曲を返す
                return existing_by_isrc
            
        # 3. 楽曲の基本情報を登録
        release_date_str = track_data['album']['release_date']
        # 年のみの場合などを考慮
        if len(release_date_str) == 4:
            release_date_str += "-01-01"
        elif len(release_date_str) == 7:
            release_date_str += "-01"
        is_streaming = track_data.get('is_playable')
        if is_streaming is None:
            markets = track_data.get('available_markets', [])
            is_streaming = 'JP' in markets if markets else True

        new_song = models.Song(
            title=track_data['name'],
            spotify_song_id=spotify_track_id,
            isrc=isrc,
            spotify_song_title=track_data['name'],
            is_streaming_available=is_streaming
        )
        db.add(new_song)
        db.commit()
        db.refresh(new_song)
        
        # 4. Spotifyのメインアーティストを紐付け
        primary_artist_id = None
        for i, artist_data in enumerate(track_data['artists']):
            artist_id = self._get_or_create_artist(artist_data['id'], artist_data['name'], db)
            if i == 0:
                primary_artist_id = artist_id
            link = models.SongArtistLink(song_id=new_song.id, artist_id=artist_id, role_category="Artist")
            db.add(link)
            
        # 4.5. 同名楽曲のWork自動紐付け (再録やLiveバージョンの自動グループ化)
        if primary_artist_id:
            same_title_songs = db.query(models.Song).filter(
                models.Song.title == track_data['name'],
                models.Song.id != new_song.id
            ).all()
            
            for s in same_title_songs:
                # 既存曲のメインアーティストを確認
                first_artist_link = db.query(models.SongArtistLink).filter(
                    models.SongArtistLink.song_id == s.id,
                    models.SongArtistLink.role_category == "Artist"
                ).first()
                
                if first_artist_link and first_artist_link.artist_id == primary_artist_id:
                    # 曲名とメインアーティストが完全一致した！
                    if s.work_id:
                        new_song.work_id = s.work_id
                    else:
                        # まだWorkが存在しない場合は新規作成して両方を紐付ける
                        new_work = models.MusicalWork(title=track_data['name'])
                        db.add(new_work)
                        db.commit()
                        db.refresh(new_work)
                        s.work_id = new_work.id
                        new_song.work_id = new_work.id
                    db.commit()
                    break

        # 5. MusicBrainzからクレジット情報を取得して補完 (ISRCが存在する場合)
        if skip_mb_lookup:
            db.commit()
            db.refresh(new_song)
            return new_song

        isrc = track_data.get('external_ids', {}).get('isrc')
        if isrc:
            mb_data = self.mb.search_recording_by_isrc(isrc)
            credits = self.mb.extract_credits(mb_data)
            
            for credit in credits:
                artist_name = credit['artist_name']
                role_category = credit['role_category']
                role_detail = credit['role_detail']
                
                # アーティストがDBになければ作成（MusicBrainzからの補完用）
                mb_artist = db.query(models.Artist).filter(models.Artist.name == artist_name).first()
                if not mb_artist:
                    mb_artist = models.Artist(name=artist_name)
                    db.add(mb_artist)
                    db.commit()
                    db.refresh(mb_artist)
                    
                # SongArtistLinkに追加 (重複チェック)
                existing_link = db.query(models.SongArtistLink).filter(
                    models.SongArtistLink.song_id == new_song.id,
                    models.SongArtistLink.artist_id == mb_artist.id,
                    models.SongArtistLink.role_category == role_category,
                    models.SongArtistLink.role_detail == role_detail
                ).first()
                
                if not existing_link:
                    link = models.SongArtistLink(
                        song_id=new_song.id, 
                        artist_id=mb_artist.id, 
                        role_category=role_category,
                        role_detail=role_detail
                    )
                    db.add(link)
                    
        db.commit()
        db.refresh(new_song)
        return new_song

    def _get_or_create_artist(self, spotify_artist_id: str, name: str, db: Session):
        """Spotify Artist ID、または名前で既存アーティストを探し、なければ作成する"""
        artist = db.query(models.Artist).filter(models.Artist.spotify_artist_id == spotify_artist_id).first()
        if artist:
            return artist.id
        
        # 名前で既存アーティストを探す
        artist = db.query(models.Artist).filter(models.Artist.name == name).first()
        if artist:
            if not artist.spotify_artist_id:
                artist.spotify_artist_id = spotify_artist_id
                db.commit()
            return artist.id
            
        # 新規作成
        new_artist = models.Artist(name=name, spotify_artist_id=spotify_artist_id)
        db.add(new_artist)
        db.commit()
        db.refresh(new_artist)
        return new_artist.id

    def import_artist_bulk(self, spotify_artist_id: str, db: Session, progress_callback=None) -> dict:
        """アーティストの全アルバムと楽曲を一括インポートする"""
        imported_albums = 0
        imported_tracks = 0
        
        # 1. アーティスト情報を確保
        if progress_callback: progress_callback(5, "Fetching artist info...")
        artist_data = self.spotify.get_artist(spotify_artist_id)
        self._get_or_create_artist(spotify_artist_id, artist_data['name'], db)
        
        # 2. アルバムを取得
        if progress_callback: progress_callback(10, f"Fetching albums for {artist_data['name']}...")
        albums = self.spotify.get_artist_albums(spotify_artist_id, limit=50)
        
        total_albums = len(albums)
        if total_albums == 0:
            if progress_callback: progress_callback(95, "No albums found. Finalizing import...")
            return {"imported_albums": 0, "imported_tracks": 0}
            
        for i, album in enumerate(albums):
            if progress_callback: progress_callback(10 + int(85 * (i/total_albums)), f"Processing album {i+1}/{total_albums}: {album['name']}")
            # Album を DB に登録
            db_album = db.query(models.Album).filter(models.Album.spotify_album_id == album['id']).first()
            if not db_album:
                release_date_str = album['release_date']
                if len(release_date_str) == 4: release_date_str += "-01-01"
                elif len(release_date_str) == 7: release_date_str += "-01"
                
                try:
                    r_date = datetime.strptime(release_date_str, "%Y-%m-%d").date()
                except:
                    r_date = None

                # Create or get AlbumGroup
                artist_id = self._get_or_create_artist(album['artists'][0]['id'], album['artists'][0]['name'], db)
                db_album_group = db.query(models.AlbumGroup).filter(
                    models.AlbumGroup.title == album['name'],
                    models.AlbumGroup.artist_id == artist_id
                ).first()
                if not db_album_group:
                    db_album_group = models.AlbumGroup(
                        title=album['name'],
                        artist_id=artist_id,
                        release_date=r_date,
                        album_type=album.get('album_type'),
                        cover_image_url=album['images'][0]['url'] if album['images'] else None
                    )
                    db.add(db_album_group)
                    db.commit()
                    db.refresh(db_album_group)

                db_album = models.Album(
                    main_title=album['name'],
                    digital_release_date=r_date,
                    cover_image_url=album['images'][0]['url'] if album['images'] else None,
                    spotify_album_id=album['id'],
                    album_type=album.get('album_type'),
                    artist_id=artist_id,
                    album_group_id=db_album_group.id
                )
                db.add(db_album)
                db.commit()
                db.refresh(db_album)
                imported_albums += 1

            # 3. アルバムのトラックを取得して保存
            tracks = self.spotify.get_album_tracks(album['id'], limit=50)
            total_tracks = len(tracks)
            for j, track in enumerate(tracks):
                track_prog = 10 + int(85 * (i/total_albums)) + int((85/total_albums) * (j/total_tracks))
                if progress_callback: progress_callback(track_prog, f"[{album['name']}] Importing track {j+1}/{total_tracks}")
                try:
                    song = self.import_track_from_spotify(track['id'], db, skip_mb_lookup=True)
                    imported_tracks += 1
                    
                    # AlbumTrack を作成 (duration_ms 含む)
                    existing_album_track = db.query(models.AlbumTrack).filter(
                        models.AlbumTrack.album_id == db_album.id,
                        models.AlbumTrack.song_id == song.id
                    ).first()
                    
                    if not existing_album_track:
                        album_track = models.AlbumTrack(
                            album_id=db_album.id,
                            song_id=song.id,
                            track_number=track.get('track_number', 1),
                            disc_number=track.get('disc_number', 1),
                            duration_ms=track.get('duration_ms', None),
                            spotify_track_id=track['id']
                        )
                        db.add(album_track)
                        db.commit()
                except Exception as e:
                    print(f"Failed to import track {track['name']}: {e}")

        if progress_callback: progress_callback(95, "Finalizing import...")
        return {"imported_albums": imported_albums, "imported_tracks": imported_tracks}

    def import_playlist_bulk(self, spotify_playlist_id: str, db: Session, progress_callback=None) -> dict:
        """プレイリストに含まれる全アーティストを抽出し、それぞれの全楽曲を一括インポートする"""
        imported_artists_count = 0
        total_imported_tracks = 0
        total_imported_albums = 0
        
        if progress_callback: progress_callback(5, "Fetching playlist tracks...")
        tracks = self.spotify.get_playlist_tracks(spotify_playlist_id, limit=100)
        
        # プレイリストからユニークなアーティストIDを抽出
        unique_artist_ids = set()
        for track in tracks:
            for artist in track.get('artists', []):
                unique_artist_ids.add(artist['id'])
                
        artist_ids_list = list(unique_artist_ids)
        total_artists = len(artist_ids_list)
        
        if progress_callback: progress_callback(10, f"Found {total_artists} unique artists in playlist. Starting sync...")
        
        for i, artist_id in enumerate(artist_ids_list):
            base_prog = 10 + int(80 * ((i + 1) / total_artists))
            if progress_callback: progress_callback(base_prog, f"Syncing artist {i+1}/{total_artists}...")
            
            try:
                # アーティスト単位での一括インポートを実行（ネストした進捗は計算が複雑になるため、ここでは無視するか簡易化する）
                res = self.import_artist_bulk(artist_id, db)
                total_imported_albums += res['imported_albums']
                total_imported_tracks += res['imported_tracks']
                imported_artists_count += 1
            except Exception as e:
                print(f"Failed to sync artist {artist_id}: {e}")
                
        if progress_callback: progress_callback(95, "Finalizing playlist sync...")
        return {
            "imported_artists": imported_artists_count, 
            "imported_albums": total_imported_albums, 
            "imported_tracks": total_imported_tracks
        }


    def import_mb_releases_bulk(self, release_ids: list[str], db: Session, progress_callback=None) -> dict:
        from .musicbrainz_fetcher import get_release_details
        
        imported_albums = 0
        imported_tracks = 0
        total_releases = len(release_ids)
        
        for i, release_id in enumerate(release_ids):
            if progress_callback: progress_callback(int(i / total_releases * 100), f"Fetching release {i+1}/{total_releases}")
            
            try:
                details = get_release_details(release_id)
            except Exception as e:
                print(f"Failed to fetch MB release {release_id}: {e}")
                continue
                
            # 1. アルバム作成
            album_title = details.get("title", "Unknown Album")
            artist_name = details.get("artist", "Unknown Artist")
            
            date_str = details.get("date")
            parsed_date = None
            if date_str:
                if len(date_str) == 4: date_str += "-01-01"
                elif len(date_str) == 7: date_str += "-01"
                try:
                    from datetime import datetime
                    parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                except ValueError:
                    parsed_date = None
            
            # アーティスト取得
            artist_id = self._get_or_create_artist("mb_" + artist_name, artist_name, db)

            # AlbumGroup取得または作成
            db_album_group = db.query(models.AlbumGroup).filter(
                models.AlbumGroup.title == album_title,
                models.AlbumGroup.artist_id == artist_id
            ).first()
            
            if not db_album_group:
                db_album_group = models.AlbumGroup(
                    title=album_title,
                    artist_id=artist_id,
                    release_date=parsed_date,
                    album_type="album"
                )
                db.add(db_album_group)
                db.commit()
                db.refresh(db_album_group)

            db_album = models.Album(
                main_title=album_title,
                physical_release_date=parsed_date,
                album_type="album",
                album_group_id=db_album_group.id,
                artist_id=artist_id
            )
            db.add(db_album)
            db.commit()
            db.refresh(db_album)
            imported_albums += 1
            
            # 2. ディスクとトラック作成
            media = details.get("media", [])
            for m in media:
                disc_num = m.get("position", 1)
                db_disc = models.AlbumDisc(
                    album_id=db_album.id,
                    disc_number=disc_num,
                    title=m.get("title") or f"Disc {disc_num}",
                    media_format=m.get("format") or "CD"
                )
                db.add(db_disc)
                db.commit()
                db.refresh(db_disc)
                
                tracks = m.get("tracks", [])
                for track in tracks:
                    track_title = track.get("title", "Unknown Track")
                    track_num = track.get("number", "1")
                    try:
                        track_num_int = int(track_num)
                    except ValueError:
                        track_num_int = track.get("position", 1)
                        
                    # 楽曲の作成または名寄せ
                    media_format = (m.get("format") or "").lower()
                    is_video = "dvd" in media_format or "blu-ray" in media_format or "video" in media_format or "vhs" in media_format
                    
                    new_song = models.Song(
                        title=track_title,
                        is_streaming_available=False,
                        is_video=is_video
                    )
                    db.add(new_song)
                    db.commit()
                    db.refresh(new_song)
                    imported_tracks += 1
                    
                    # アーティストリンク
                    link = models.SongArtistLink(song_id=new_song.id, artist_id=artist_id, role_category="Artist")
                    db.add(link)
                    
                    # 同名楽曲の名寄せ
                    same_title_songs = db.query(models.Song).filter(
                        models.Song.title == track_title,
                        models.Song.id != new_song.id
                    ).all()
                    
                    for s in same_title_songs:
                        first_artist_link = db.query(models.SongArtistLink).filter(
                            models.SongArtistLink.song_id == s.id,
                            models.SongArtistLink.role_category == "Artist"
                        ).first()
                        
                        if first_artist_link and first_artist_link.artist_id == artist_id:
                            if s.work_id:
                                new_song.work_id = s.work_id
                            else:
                                new_work = models.MusicalWork(title=track_title)
                                db.add(new_work)
                                db.commit()
                                db.refresh(new_work)
                                s.work_id = new_work.id
                                new_song.work_id = new_work.id
                            db.commit()
                            break
                            
                    # AlbumTrackの作成
                    album_track = models.AlbumTrack(
                        album_id=db_album.id,
                        song_id=new_song.id,
                        track_number=track_num_int,
                        disc_number=disc_num,
                        duration_ms=track.get("length")
                    )
                    db.add(album_track)
                    db.commit()
                    
        if progress_callback: progress_callback(100, "Done")
        return {"imported_albums": imported_albums, "imported_tracks": imported_tracks}
