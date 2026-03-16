import { useCallback, useEffect, useState } from 'react';

const TOKEN_KEY = 'admin_token';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export function useAuth() {
  const [token, setToken] = useState(getStoredToken);

  useEffect(() => {
    setToken(getStoredToken());
  }, []);

  const login = useCallback((newToken) => {
    setStoredToken(newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
  }, []);

  return { token, login, logout, isAuthenticated: Boolean(token) };
}

