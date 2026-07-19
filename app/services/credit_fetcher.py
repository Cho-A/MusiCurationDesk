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
        
    def import_track_from_spotify(self, spotify_track_id: str, db: Session):
        """SpotifyのトラックIDから楽曲情報を取得し、MusicBrainzでクレジットを補完してDBに保存する"""
        
        # 1. 既にDBに存在するかチェック
        existing_song = db.query(models.Song).filter(models.Song.spotify_song_id == spotify_track_id).first()
        if existing_song:
            return existing_song

        # 2. Spotifyからトラック詳細情報を取得
        track_data = self.spotify.get_track(spotify_track_id)
        if not track_data:
            raise ValueError("Track not found on Spotify")
            
        # 3. 楽曲の基本情報を登録
        release_date_str = track_data['album']['release_date']
        # 年のみの場合などを考慮
        if len(release_date_str) == 4:
            release_date_str += "-01-01"
        elif len(release_date_str) == 7:
            release_date_str += "-01"
            
        try:
            release_date = datetime.strptime(release_date_str, "%Y-%m-%d").date()
        except:
            release_date = None

        new_song = models.Song(
            title=track_data['name'],
            release_date=release_date,
            spotify_song_id=spotify_track_id,
            spotify_song_title=track_data['name']
        )
        db.add(new_song)
        db.commit()
        db.refresh(new_song)
        
        # 4. Spotifyのメインアーティストを紐付け
        for artist_data in track_data['artists']:
            artist_id = self._get_or_create_artist(artist_data['id'], artist_data['name'], db)
            link = models.SongArtistLink(song_id=new_song.id, artist_id=artist_id, role="Artist")
            db.add(link)
            
        # 5. MusicBrainzからクレジット情報を取得して補完 (ISRCが存在する場合)
        isrc = track_data.get('external_ids', {}).get('isrc')
        if isrc:
            mb_data = self.mb.search_recording_by_isrc(isrc)
            credits = self.mb.extract_credits(mb_data)
            
            for credit in credits:
                artist_name = credit['artist_name']
                role = credit['role']
                
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
                    models.SongArtistLink.role == role
                ).first()
                
                if not existing_link:
                    link = models.SongArtistLink(song_id=new_song.id, artist_id=mb_artist.id, role=role)
                    db.add(link)
                    
        db.commit()
        db.refresh(new_song)
        return new_song

    def _get_or_create_artist(self, spotify_artist_id: str, name: str, db: Session):
        """Spotify Artist ID、または名前で既存アーティストを探し、なければ作成する"""
        artist = db.query(models.Artist).filter(models.Artist.spotify_artist_id == spotify_artist_id).first()
        if artist:
            return artist.id
        
        # 名前で検索 (同じ名前のアーティストが既にJASRACインポートなどで存在する場合)
        artist = db.query(models.Artist).filter(models.Artist.name == name).first()
        if artist:
            artist.spotify_artist_id = spotify_artist_id
            db.commit()
            return artist.id
            
        # 完全新規
        new_artist = models.Artist(name=name, spotify_artist_id=spotify_artist_id)
        db.add(new_artist)
        db.commit()
        db.refresh(new_artist)
        return new_artist.id
