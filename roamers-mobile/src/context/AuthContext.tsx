import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, register as apiRegister, getMe } from '../services/api';

interface User {
  id: string; fname: string; lname: string; email: string;
  phone?: string; country?: string; bio?: string;
  role: string; wishlist: string[]; notifs?: any[]; joined?: string;
}
interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: object) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]   = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { restoreSession(); }, []);

  async function restoreSession() {
    try {
      const t = await AsyncStorage.getItem('token');
      if (t) {
        setToken(t);
        const data = await getMe();
        setUser(data.user);
      }
    } catch (_) {
      await AsyncStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await apiLogin(email, password);
    await AsyncStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function register(form: object) {
    const data = await apiRegister(form);
    await AsyncStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  async function refresh() {
    if (!token) return;
    try {
      const data = await getMe();
      setUser(data.user);
    } catch (_) { await logout(); }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
