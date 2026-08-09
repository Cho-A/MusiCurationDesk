export interface AlbumCardData {
  id: number;
  main_title: string;
  version_title?: string | null;
  cover_image_url?: string | null;
  release_date?: string | null;
  artist_names?: string[] | null;
  album_group_id?: number | null;
}

export interface SongCardData {
  id: number;
  title: string;
  artist_name?: string | null;
  cover_image_url?: string | null;
  is_video: boolean;
  role?: string | null;
  album_title?: string | null;
  version_name?: string | null;
  is_streaming_available: boolean;
}
