import React from 'react';
import { Info, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon = Info, title, description, action }) => {
  return (
    <div style={{ 
      padding: '48px', 
      textAlign: 'center', 
      backgroundColor: 'var(--bg-secondary)', 
      borderRadius: '16px',
      border: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      minHeight: '200px'
    }}>
      <div style={{ 
        width: '64px', 
        height: '64px', 
        borderRadius: '50%', 
        backgroundColor: 'var(--bg-tertiary)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: '8px'
      }}>
        <Icon size={32} color="var(--text-tertiary)" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600, wordBreak: 'keep-all', overflowWrap: 'break-word', textWrap: 'balance' as any }}>{title}</h3>
        {description && <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{description}</p>}
      </div>
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
};

export default EmptyState;
