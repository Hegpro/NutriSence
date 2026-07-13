'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';

interface AuthContextType {
  user: any;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('nutrisense_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch (err) {
          console.error('Error fetching initial profile details', err);
          // Token expired or invalid
          localStorage.removeItem('nutrisense_token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      localStorage.setItem('nutrisense_token', data.access_token);
      setToken(data.access_token);
      
      const profile = await api.getMe();
      setUser(profile);
      
      if (!profile.is_onboarded) {
        router.push('/onboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.register({ name, email, password });
      localStorage.setItem('nutrisense_token', data.access_token);
      setToken(data.access_token);
      
      const profile = await api.getMe();
      setUser(profile);
      router.push('/onboard');
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('nutrisense_token');
    setToken(null);
    setUser(null);
    router.push('/');
  };

  const refreshUser = async () => {
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
