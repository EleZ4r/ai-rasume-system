import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { getProfile, register as apiRegister, login as apiLogin, logout as apiLogout, setAuthToken } from '../services/api';

type User = any;

const nativeAsyncStorage = Platform.OS !== 'web'
  ? (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('@react-native-async-storage/async-storage').default;
      } catch {
        return null;
      }
    })()
  : null;

const webStorage = {
  async getItem(key: string) {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null;
    return window.localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      window.localStorage.setItem(key, value);
    }
  },
  async removeItem(key: string) {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      window.localStorage.removeItem(key);
    }
  },
};

const storage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') return webStorage.getItem(key);
    try {
      return await nativeAsyncStorage?.getItem(key);
    } catch {
      return webStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      await webStorage.setItem(key, value);
      return;
    }

    try {
      await nativeAsyncStorage?.setItem(key, value);
    } catch {
      await webStorage.setItem(key, value);
    }
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      await webStorage.removeItem(key);
      return;
    }

    try {
      await nativeAsyncStorage?.removeItem(key);
    } catch {
      await webStorage.removeItem(key);
    }
  },
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, privacyConsent: boolean) => Promise<void>;
  updateProfile: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await storage.getItem('auth_token');
        const u = await storage.getItem('auth_user');
        if (t) {
          setToken(t);
          setAuthToken(t);
        }
        if (u) setUser(JSON.parse(u));

        if (t) {
          try {
            const profile = await getProfile();
            setUser(profile);
            await storage.setItem('auth_user', JSON.stringify(profile));
          } catch (error: any) {
            if (error?.response?.status === 401) {
              setToken(null);
              setUser(null);
              setAuthToken(null);
              await storage.removeItem('auth_token');
              await storage.removeItem('auth_user');
            }
          }
        }
      } catch (error) {
        setToken(null);
        setUser(null);
        setAuthToken(null);
      }
      finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    await storage.removeItem('auth_token');
    await storage.removeItem('auth_user');

    const res = await apiLogin({ email: email.trim().toLowerCase(), password });
    const tok = res?.token ?? res?.access_token ?? null;
    const usr = res?.user ?? null;

    if (!usr && !tok) {
      throw new Error('Login response was missing user or token data.');
    }

    setToken(tok ?? null);
    setUser(usr);
    if (tok) {
      setAuthToken(tok);
      await storage.setItem('auth_token', tok);
    }
    if (usr) {
      await storage.setItem('auth_user', JSON.stringify(usr));
    }
  }

  async function register(name: string, email: string, password: string, privacyConsent: boolean) {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    await storage.removeItem('auth_token');
    await storage.removeItem('auth_user');

    const res = await apiRegister({ name, email, password, privacy_consent: privacyConsent });
    const tok = res?.token ?? res?.access_token ?? null;
    const usr = res?.user ?? null;

    if (!usr && !tok) {
      throw new Error('Register response was missing user or token data.');
    }

    setToken(tok ?? null);
    setUser(usr);
    if (tok) {
      setAuthToken(tok);
      await storage.setItem('auth_token', tok);
    }
    if (usr) {
      await storage.setItem('auth_user', JSON.stringify(usr));
    }
  }

  async function updateProfile(name: string, email: string) {
    const updatedUser = { ...(user || {}), name, email };
    setUser(updatedUser);
    await storage.setItem('auth_user', JSON.stringify(updatedUser));
  }

  async function logout() {
    try {
      await apiLogout();
    } catch (e) {
      // Clear local state even when the network is unavailable.
    }

    setUser(null);
    setToken(null);
    setAuthToken(null);
    await storage.removeItem('auth_token');
    await storage.removeItem('auth_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
