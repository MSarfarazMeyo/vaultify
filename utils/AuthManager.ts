import { supabase } from './SupabaseClient';
import { SecurityManager } from './SecurityManager';

export class AuthManager {
  // Sign up with email/password
  static async signUp(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      // Initialize user data manually since trigger is removed
      if (data.user) {
        await this.initializeUserData(data.user.id);
      }
      
      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Initialize user data manually
  private static async initializeUserData(userId: string) {
    try {
      // Create storage usage record
      await supabase.from('storage_usage').insert({
        user_id: userId,
        used_bytes: 0,
        quota_bytes: 1073741824, // 1GB
        photo_count: 0,
        video_count: 0,
        audio_count: 0,
        vault_count: 0
      });

      // Create subscription record
      await supabase.from('subscriptions').insert({
        user_id: userId,
        plan: 'free',
        is_active: true
      });

      // Create user settings
      await supabase.from('user_settings').insert({
        user_id: userId
      });
    } catch (error) {
      console.warn('Failed to initialize user data:', error);
      // Don't throw error - user creation should still succeed
    }
  }

  // Sign in with email/password
  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      SecurityManager.logSecurityEvent('password_auth_success', {
        method: 'supabase_auth',
        userId: data.user?.id,
      });

      return { user: data.user, session: data.session };
    } catch (error: any) {
      console.error('Sign in error:', error);
      SecurityManager.logSecurityEvent('failed_login_attempt', {
        method: 'supabase_auth',
        error: error?.message,
      });
      throw error;
    }
  }

  // Sign out
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      SecurityManager.logSecurityEvent('user_logout');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  // Check if user is authenticated
  static async isAuthenticated() {
    const user = await this.getCurrentUser();
    return !!user;
  }
}
