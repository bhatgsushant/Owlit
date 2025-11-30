// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null; // avoid flashing unstyled content while auth state resolves

  if (!user) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
