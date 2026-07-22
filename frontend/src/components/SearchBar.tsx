import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: (e: React.FormEvent) => void;
  disabled?: boolean;
  buttonText?: string;
  showIcon?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = '検索...',
  onSubmit,
  disabled = false,
  buttonText,
  showIcon = true,
}) => {
  const content = (
    <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '600px' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        {showIcon && (
          <Search 
            size={20} 
            color="var(--text-tertiary)" 
            style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} 
          />
        )}
        <input 
          type="text" 
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: showIcon ? '16px 24px 16px 48px' : '16px 24px',
            borderRadius: '30px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '1.1rem',
            outline: 'none'
          }}
        />
      </div>
      {onSubmit && buttonText && (
        <button 
          type="submit" 
          disabled={disabled}
          style={{
            background: 'var(--spotify-color)',
            color: '#000',
            border: 'none',
            borderRadius: '30px',
            padding: '0 24px',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: disabled ? 'wait' : 'pointer',
            transition: 'transform 0.2s, background 0.2s',
            opacity: disabled ? 0.7 : 1
          }}
        >
          {buttonText}
        </button>
      )}
    </div>
  );

  if (onSubmit) {
    return (
      <form onSubmit={onSubmit} style={{ marginBottom: '32px' }}>
        {content}
      </form>
    );
  }

  return <div style={{ marginBottom: '32px' }}>{content}</div>;
};

export default SearchBar;
