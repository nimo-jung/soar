import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const MasterOnlyGuard: React.FC = () => {
  const sessionType = useAuthStore((state) => state.sessionType);
  const user = useAuthStore((state) => state.user);

  const isMasterSession = sessionType === 'master' || user?.isMaster === true;
  return isMasterSession ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default MasterOnlyGuard;
