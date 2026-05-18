import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  shift_start_time: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Attempt to restore user session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('geoshield_token');
      const storedUser = localStorage.getItem('geoshield_user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          // Verify token against database to ensure it hasn't expired or been revoked
          const response = await api.get('/auth/me');
          setUser(response.data.user);
          localStorage.setItem('geoshield_user', JSON.stringify(response.data.user));
        } catch (error) {
          console.error('❌ Session restoration failed:', error);
          // Session expired or token invalid - clear store
          logout();
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('geoshield_token', receivedToken);
      localStorage.setItem('geoshield_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);

      return receivedUser;
    } catch (error: any) {
      console.error('❌ Login request failed:', error);
      throw new Error(error.response?.data?.error || 'Authentication failed. Please check credentials.');
    }
  };

  const logout = () => {
    localStorage.removeItem('geoshield_token');
    localStorage.removeItem('geoshield_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};
