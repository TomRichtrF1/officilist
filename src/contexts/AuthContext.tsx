import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import * as api from '../lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const setAuthenticatedStore = useAppStore((state) => state.setAuthenticated);
  const loadData = useAppStore((state) => state.loadData);
  const syncWithServer = useAppStore((state) => state.syncWithServer);

  useEffect(() => {
    const checkAuth = async () => {
      // Zkontrolovat zda existuje platný token
      if (api.isAuthenticated()) {
        try {
          const valid = await api.verifyToken();
          if (valid) {
            setIsAuthenticated(true);
            setAuthenticatedStore(true);
            await loadData();
            syncWithServer();
          } else {
            // Token je neplatný, odstranit ho
            api.logout();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          api.logout();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [setAuthenticatedStore, loadData, syncWithServer]);

  const login = async (password: string): Promise<boolean> => {
    try {
      await api.login(password);
      setIsAuthenticated(true);
      setAuthenticatedStore(true);
      await loadData();
      syncWithServer();
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    api.logout();
    setIsAuthenticated(false);
    setAuthenticatedStore(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
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
