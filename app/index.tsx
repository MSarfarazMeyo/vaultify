import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { AuthManager } from '@/utils/AuthManager';
import { SubscriptionManager } from '@/utils/SubscriptionManager';

export default function LoginScreen() {
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const isAuthenticated = await AuthManager.isAuthenticated();
    await SubscriptionManager.handleSubscriptionUpdate();
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/setup');
    }
  };

  return null; // Auth check in progress
}
