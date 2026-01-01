import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CORRECT_PASSWORD = 'officilist123';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const setAuthenticatedStore = useAppStore((state) => state.setAuthenticated);
  const loadData = useAppStore((state) => state.loadData);
  const syncWithServer = useAppStore((state) => state.syncWithServer);

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated') === 'true';
    if (authStatus) {
      setIsAuthenticated(true);
      setAuthenticatedStore(true);
      loadData();
      syncWithServer();
    }
  }, [setAuthenticatedStore, loadData, syncWithServer]);

  const login = (password: string) => {
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setAuthenticatedStore(true);
      localStorage.setItem('isAuthenticated', 'true');
      loadData();
      syncWithServer();
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAuthenticatedStore(false);
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
