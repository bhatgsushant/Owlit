// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = (
  import.meta.env?.VITE_API_BASE_URL ||
  (import.meta.env?.DEV ? 'http://localhost:3001' : 'https://owlit.onrender.com')
).replace(/\/$/, '');
const withApiBase = (path) => `${API_BASE}${path}`;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStoreOverrides, setUserStoreOverrides] = useState(null);

  const fetchUserStoreOverrides = async () => {
    try {
      const response = await fetch('/api/user-store-type-overrides', { credentials: 'include' });
      if (response.ok) {
        const overrides = await response.json();
        setUserStoreOverrides(overrides);
      } else {
        console.error('Failed to fetch user store overrides');
      }
    } catch (error) {
      console.error('Error fetching user store overrides:', error);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(withApiBase('/api/user'), {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch user');
        const data = await res.json();
        setUser(data);
        if (data) {
          fetchUserStoreOverrides();
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await fetch(withApiBase('/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      setUserStoreOverrides(null);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, userStoreOverrides, fetchUserStoreOverrides }}>
      {children}
    </AuthContext.Provider>
  );
};

// Helper hook for easier usage
export const useAuth = () => useContext(AuthContext);
