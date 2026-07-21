import React from 'react';
import { Link } from 'react-router-dom';

export interface Album {
  id: number;
  title?: string;
  main_title?: string;
  version_title?: string;
  cover_image_url?: string;
  release_date?: string;
  physical_release_date?: string;
  digital_release_date?: string;
  artist_names?: string[];
}

interface AlbumCardProps {
  album: Album;
  layout?: 'vertical' | 'horizontal';
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album, layout = 'vertical' }) => {
  const displayTitle = album.title || album.main_title || 'Unknown Album';
  const displayDate = album.release_date || album.physical_release_date || album.digital_release_date || '不明なリリース日';

  if (layout === 'horizontal') {
    return (
      <Link to={`/albums/${album.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="glass-panel hover-scale" style={{ 
          padding: '16px', borderRadius: '12px', display: 'flex', gap: '16px', 
          transition: 'transform 0.2s', alignItems: 'center' 
        }}>
          <img 
            src={album.cover_image_url || '/placeholder.png'} 
            alt={displayTitle} 
            style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} 
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {displayTitle}
              {album.version_title && (
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginLeft: '8px' }}>
                  {album.version_title}
                </span>
              )}
            </div>
            {album.artist_names && album.artist_names.length > 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {album.artist_names.join(', ')}
              </div>
            )}
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
              {displayDate}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/albums/${album.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="hover-scale" style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderRadius: '16px', 
        padding: '16px', 
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: '12px',
        height: '100%', boxSizing: 'border-box'
      }}>
        <img 
          src={album.cover_image_url || '/placeholder.png'} 
          alt={displayTitle} 
          style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '8px' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayTitle}
          </h3>
          {album.version_title && (
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginBottom: '4px' }}>
              {album.version_title}
            </div>
          )}
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {album.artist_names?.join(', ') || ''}
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', margin: 'auto 0 0 0', paddingTop: '4px' }}>
            {displayDate}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default AlbumCard;
