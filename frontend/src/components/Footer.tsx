import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer style={{ 
      marginTop: 'auto', 
      padding: '24px 32px', 
      borderTop: '1px solid var(--border-color)', 
      background: 'var(--bg-secondary)', 
      color: 'var(--text-secondary)',
      fontSize: '0.85rem',
      textAlign: 'center'
    }}>
      <div style={{ marginBottom: '12px' }}>
        <Link to="/legal" style={{ color: 'var(--text-secondary)', textDecoration: 'none', margin: '0 12px' }}>プライバシーポリシー・利用規約</Link>
        <a href="mailto:contact@example.com" style={{ color: 'var(--text-secondary)', textDecoration: 'none', margin: '0 12px' }}>お問い合わせ</a>
      </div>
      <div>
        &copy; {new Date().getFullYear()} MusiCurationDesk. All rights reserved.<br/>
        当サイトの情報の一部はSpotify API等から提供されており、権利を侵害する意図はありません。
      </div>
    </footer>
  );
};

export default Footer;
