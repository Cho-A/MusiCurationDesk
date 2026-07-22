import React, { type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: LucideIcon;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon: Icon, 
  fullWidth = false,
  style,
  disabled,
  ...props 
}) => {
  
  const getBackground = () => {
    switch (variant) {
      case 'primary': return 'var(--accent-primary)';
      case 'secondary': return 'transparent';
      case 'danger': return '#ef4444';
      case 'ghost': return 'transparent';
      default: return 'var(--accent-primary)';
    }
  };

  const getColor = () => {
    switch (variant) {
      case 'primary': return '#ffffff';
      case 'secondary': return 'var(--text-primary)';
      case 'danger': return '#ffffff';
      case 'ghost': return 'var(--text-secondary)';
      default: return '#ffffff';
    }
  };

  const getBorder = () => {
    switch (variant) {
      case 'secondary': return '1px solid var(--border-color)';
      default: return '1px solid transparent';
    }
  };

  const defaultStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 24px',
    borderRadius: '24px',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s',
    border: getBorder(),
    background: getBackground(),
    color: getColor(),
    width: fullWidth ? '100%' : 'auto',
    ...style
  };

  return (
    <button 
      style={defaultStyle}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === 'primary') e.currentTarget.style.filter = 'brightness(1.1)';
        if (variant === 'secondary' || variant === 'ghost') e.currentTarget.style.background = 'var(--bg-tertiary)';
        if (variant === 'danger') e.currentTarget.style.background = '#dc2626';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.filter = 'none';
        e.currentTarget.style.background = getBackground();
      }}
      {...props}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default Button;
