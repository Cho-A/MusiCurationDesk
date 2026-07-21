import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 700 }}>{title}</h1>
        {subtitle && (
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
};

export default PageHeader;
