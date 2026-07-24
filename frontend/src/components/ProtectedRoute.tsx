import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ adminOnly = false }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !user?.is_admin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>
        <AlertTriangle size={48} color="#ff6b6b" style={{ marginBottom: '16px' }} />
        <h2>アクセス拒否</h2>
        <p>このページにアクセスするには管理者権限が必要です。</p>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
