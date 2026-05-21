import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, register as apiRegister, getMe } from '../services/api';
import { linkTokenToEmail } from '../services/pushNotifications';

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
  /** Returns the raw server response (may include requireVerification:true instead of token) */
  register: (data: object) => Promise<any>;
  /** Called after OTP verification — stores token and sets user state */
  loginWithToken: (token: string, user: User) => Promise<void>;
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
        if (data.user?.email) {
          linkTokenToEmail(data.user.email).catch(() => {});
        }
      }
    } catch (_) {
      await AsyncStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await apiLogin(email, password);
    await _storeSession(data.token, data.user);
    linkTokenToEmail(email).catch(() => {});
  }

  async function register(form: object): Promise<any> {
    const data = await apiRegister(form);
    /* If server returns a token directly (e.g. verification disabled), store it */
    if (data.token) {
      await _storeSession(data.token, data.user);
      if (data.user?.email) linkTokenToEmail(data.user.email).catch(() => {});
    }
    return data;
  }

  async function loginWithToken(tok: string, u: User) {
    await _storeSession(tok, u);
    if (u?.email) linkTokenToEmail(u.email).catch(() => {});
  }

  async function _storeSession(tok: string, u: User) {
    await AsyncStorage.setItem('token', tok);
    setToken(tok);
    setUser(u);
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
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithToken, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
