import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Music } from 'lucide-react';

import type { SongCardData } from '../types/models';

export interface SongCardProps {
  song: SongCardData;
  onClick?: () => void;
  isDashboard?: boolean;
}

const SongCard: React.FC<SongCardProps> = ({ song, onClick, isDashboard = false }) => {
  const content = (
    <div style={{ 
      backgroundColor: 'var(--bg-secondary)', 
      border: '1px solid var(--border-color)',
      borderRadius: '12px', 
      padding: '16px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '16px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      height: '100%',
      boxSizing: 'border-box',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
      e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.05)';
      e.currentTarget.style.borderColor = 'var(--primary-color)';
      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
      const img = e.currentTarget.querySelector('.song-cover-img') as HTMLElement;
      if (img) img.style.transform = 'scale(1.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0) scale(1)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
      e.currentTarget.style.borderColor = 'var(--border-color)';
      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
      const img = e.currentTarget.querySelector('.song-cover-img') as HTMLElement;
      if (img) img.style.transform = 'scale(1)';
    }}
    onClick={onClick}
    >
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '8px',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(29,185,84,0.1) 0%, rgba(29,185,84,0.3) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      }}>
        {song.cover_image_url ? (
          <img 
            className="song-cover-img"
            src={song.cover_image_url} 
            alt={song.title} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'
            }} 
          />
        ) : (
          <Music size={24} color="var(--primary-color)" />
        )}
        
        {/* Play Icon Overlay */}
        <div style={{
          position: 'absolute',
          top: '0', left: '0', right: '0', bottom: '0',
          backgroundColor: 'rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.2s',
          borderRadius: '8px'
        }}
        className="song-play-overlay"
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
        >
          <Play size={24} color="#fff" fill="#fff" />
        </div>
      </div>
      
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ 
            fontWeight: 700, 
            fontSize: '1.05rem', 
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            {song.title}
          </div>
          {song.is_video ? (
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '0.7rem', 
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0.2) 100%)', 
              color: '#ec4899',
              padding: '2px 6px', 
              borderRadius: '6px', 
              border: '1px solid rgba(236, 72, 153, 0.4)', 
              flexShrink: 0, 
              fontWeight: 800,
              boxShadow: '0 2px 4px rgba(236, 72, 153, 0.1)'
            }}>
              📺 映像
            </span>
          ) : (
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '0.7rem', 
              background: 'linear-gradient(135deg, rgba(29, 185, 84, 0.1) 0%, rgba(29, 185, 84, 0.2) 100%)', 
              color: '#1DB954',
              padding: '2px 6px', 
              borderRadius: '6px', 
              border: '1px solid rgba(29, 185, 84, 0.4)', 
              flexShrink: 0, 
              fontWeight: 800,
              boxShadow: '0 2px 4px rgba(29, 185, 84, 0.1)'
            }}>
              🎵 音源
            </span>
          )}
          {!song.is_video && song.is_streaming_available === false && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '0.7rem', 
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.2) 100%)', 
              color: '#ef4444',
              padding: '2px 6px', 
              borderRadius: '6px', 
              border: '1px solid rgba(239, 68, 68, 0.4)', 
              flexShrink: 0, 
              fontWeight: 800,
              boxShadow: '0 2px 4px rgba(239, 68, 68, 0.1)'
            }}>
              🚫 サブスク未解禁
            </span>
          )}
        </div>
        
        {song.version_name && (
          <div style={{
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 8px',
            borderRadius: '4px',
            width: 'fit-content',
            marginBottom: '2px'
          }}>
            {song.version_name}
          </div>
        )}
        
        <div style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.85rem',
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          fontWeight: 500
        }}>
          {song.role ? (
            <span style={{ color: 'var(--primary-color)' }}>{song.role}</span>
          ) : (
            song.artist_name || 'Unknown Artist'
          )}
        </div>
        
        {song.album_title && isDashboard && (
          <div style={{ 
            color: 'var(--text-tertiary)', 
            fontSize: '0.75rem',
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
          }}>
            収録: {song.album_title}
          </div>
        )}
      </div>
    </div>
  );

  // Global hover style block since we can't use styled-components easily here
  if (onClick) {
    return content;
  }

  return (
    <Link to={`/songs/${song.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
      {content}
    </Link>
  );
};

export default SongCard;
