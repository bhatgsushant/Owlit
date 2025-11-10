// src/context/AuthContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { withApiBase } from '@/utils/apiClient';
const TOKEN_STORAGE_KEY = 'ow_jwt_token';

const readInitialToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const AuthContext = createContext();

const buildHeaders = (headers = {}, token) => {
  if (headers instanceof Headers) {
    const clone = new Headers(headers);
    if (token) {
      clone.set('Authorization', `Bearer ${token}`);
    }
    return clone;
  }

  return {
    ...(headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(readInitialToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStoreOverrides, setUserStoreOverrides] = useState(null);

  const persistToken = useCallback((newToken) => {
    try {
      if (newToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to persist auth token:', err);
    }
    setToken(newToken || null);
  }, []);

  const fetchWithAuth = useCallback((path, options = {}) => {
    const headers = buildHeaders(options.headers, token);
    return fetch(withApiBase(path), { ...options, headers });
  }, [token]);

  const fetchUserStoreOverrides = useCallback(async () => {
    if (!token) {
      setUserStoreOverrides(null);
      return;
    }

    try {
      const response = await fetchWithAuth('/api/user-store-type-overrides');
      if (response.ok) {
        const overrides = await response.json();
        setUserStoreOverrides(overrides);
      } else if (response.status === 401) {
        persistToken(null);
      } else {
        console.error('Failed to fetch user store overrides');
      }
    } catch (error) {
      console.error('Error fetching user store overrides:', error);
    }
  }, [fetchWithAuth, persistToken, token]);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      if (!token) {
        setUser(null);
        setUserStoreOverrides(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetchWithAuth('/api/user');
        if (!res.ok) {
          throw new Error('Failed to fetch user');
        }
        const data = await res.json();
        if (!isMounted) return;
        setUser(data);
        fetchUserStoreOverrides();
      } catch (err) {
        console.error('Error fetching user:', err);
        if (isMounted) {
          setUser(null);
          persistToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [token, fetchWithAuth, fetchUserStoreOverrides, persistToken]);

  const logout = useCallback(() => {
    persistToken(null);
    setUser(null);
    setUserStoreOverrides(null);
  }, [persistToken]);

  const completeLogin = useCallback((newToken) => {
    persistToken(newToken);
  }, [persistToken]);

  const value = useMemo(() => ({
    user,
    setUser,
    loading,
    logout,
    userStoreOverrides,
    fetchUserStoreOverrides,
    token,
    completeLogin,
    fetchWithAuth,
  }), [
    user,
    loading,
    logout,
    userStoreOverrides,
    fetchUserStoreOverrides,
    token,
    completeLogin,
    fetchWithAuth,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Helper hook for easier usage
export const useAuth = () => useContext(AuthContext);
