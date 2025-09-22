import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiRequest } from '../api/client';
import type { AuthCredentials, AuthResponse, AuthUser, RegisterResponse } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  register: (payload: AuthCredentials) => Promise<RegisterResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'magazyn-auth';

interface StoredAuthState {
  token: string;
  user: AuthUser;
}

function loadStoredState(): StoredAuthState | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredAuthState;
  } catch (error) {
    console.warn('[auth] failed to parse stored state', error);
    return null;
  }
}

function persistState(state: StoredAuthState | null) {
  if (typeof window === 'undefined') {
    return;
  }
  if (!state) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredState();
    if (stored) {
      setUser(stored.user);
      setToken(stored.token);
    }
  }, []);

  useEffect(() => {
    if (user && token) {
      persistState({ user, token });
    } else {
      persistState(null);
    }
  }, [user, token]);

  const handleAuthSuccess = useCallback((response: AuthResponse) => {
    setUser(response.user);
    setToken(response.accessToken);
  }, []);

  const login = useCallback(async (credentials: AuthCredentials) => {
    const response = await apiRequest<AuthResponse, AuthCredentials>('/api/auth/login', {
      method: 'POST',
      body: credentials,
    });
    handleAuthSuccess(response);
  }, [handleAuthSuccess]);

  const register = useCallback(async (payload: AuthCredentials) => {
    const response = await apiRequest<RegisterResponse, typeof payload>('/api/auth/register', {
      method: 'POST',
      body: payload,
    });
    return response;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
    }),
    [login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
