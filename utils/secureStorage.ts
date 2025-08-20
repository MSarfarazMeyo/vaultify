import { Platform } from 'react-native';

// Platform-specific secure storage implementation
let SecureStore: any;

if (Platform.OS === 'web') {
  // Web implementation using localStorage with encryption simulation
  const webStorage = new Map<string, string>();
  
  SecureStore = {
    async getItemAsync(key: string): Promise<string | null> {
      try {
        // Try localStorage first, fallback to in-memory storage
        const value = typeof window !== 'undefined' && window.localStorage 
          ? window.localStorage.getItem(key) 
          : webStorage.get(key);
        return value || null;
      } catch (error) {
        console.warn('SecureStore getItemAsync failed on web:', error);
        return webStorage.get(key) || null;
      }
    },

    async setItemAsync(key: string, value: string): Promise<void> {
      try {
        // Try localStorage first, fallback to in-memory storage
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        } else {
          webStorage.set(key, value);
        }
      } catch (error) {
        console.warn('SecureStore setItemAsync failed on web:', error);
        webStorage.set(key, value);
      }
    },

    async deleteItemAsync(key: string): Promise<void> {
      try {
        // Try localStorage first, fallback to in-memory storage
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        } else {
          webStorage.delete(key);
        }
      } catch (error) {
        console.warn('SecureStore deleteItemAsync failed on web:', error);
        webStorage.delete(key);
      }
    }
  };
} else {
  // Native implementation
  SecureStore = require('expo-secure-store');
}

export default SecureStore;