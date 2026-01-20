import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  loadStoredAuth: () => Promise<void>;
}

const storeToken = async (token: string | null) => {
  if (Platform.OS === 'web') {
    if (token) {
      localStorage.setItem('session_token', token);
    } else {
      localStorage.removeItem('session_token');
    }
  } else {
    if (token) {
      await SecureStore.setItemAsync('session_token', token);
    } else {
      await SecureStore.deleteItemAsync('session_token');
    }
  }
};

const getStoredToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('session_token');
  } else {
    return await SecureStore.getItemAsync('session_token');
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionToken: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setSessionToken: async (token) => {
    await storeToken(token);
    set({ sessionToken: token });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  logout: async () => {
    await storeToken(null);
    set({ user: null, sessionToken: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    try {
      const token = await getStoredToken();
      if (token) {
        set({ sessionToken: token });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    }
    set({ isLoading: false });
  },
}));
