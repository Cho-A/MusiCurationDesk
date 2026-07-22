import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  fullPage?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...', fullPage = false }) => {
  const containerStyle: React.CSSProperties = fullPage ? {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100%',
    color: 'var(--text-secondary)'
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    width: '100%',
    color: 'var(--text-secondary)'
  };

  return (
    <div style={containerStyle}>
      <Loader2 size={36} className="spinner" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--spotify-color)' }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ fontSize: '1rem', fontWeight: 500 }}>{message}</div>
    </div>
  );
};

export default LoadingSpinner;
