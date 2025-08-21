import SecureStore from './secureStorage';
import * as Crypto from 'expo-crypto';

export interface SecurityEvent {
  id: string;
  type: 'login_success' | 'login_failure' | 'vault_access' | 'photo_capture' | 'break_in_attempt' | 'biometric_auth_success' | 'password_auth_success' | 'failed_login_attempt' | 'vault_created' | 'vault_accessed' | 'vault_locked' | 'vault_unlocked' | 'vault_deleted' | 'photo_captured' | 'photo_imported' | 'photo_deleted' | 'duress_code_used' | 'password_changed' | 'subscription_activated' | 'subscription_updated' | 'initial_setup_completed' | 'calculator_pin_changed' | 'all_data_deleted' | 'user_logout' | 'settings_updated' | 'security_level_applied' | 'cloud_backup_changed' | 'break_in_detection_changed' | 'auto_lock_changed' | 'biometric_auth_disabled' | 'biometric_auth_enabled' | 'family_subscription_activated';

  timestamp: number;
  details?: any;
}

export class SecurityManager {
  private static readonly MASTER_PASSWORD_KEY = 'master_password';
  private static readonly SECURITY_EVENTS_KEY = 'security_events';
  private static readonly ENCRYPTION_KEY = 'encryption_key';
  private static readonly BREAK_IN_ATTEMPTS_KEY = 'break_in_attempts';
  private static readonly CALCULATOR_PIN_KEY = 'calculator_pin';

  static async initializeApp() {
    try {
      // Initialize with default password for demo purposes
      // In production, this should be set during first app launch
      const existingPassword = await SecureStore.getItemAsync(this.MASTER_PASSWORD_KEY);
      if (!existingPassword) {
        const defaultPassword = await this.hashPassword('SecureVault123!');
        await SecureStore.setItemAsync(this.MASTER_PASSWORD_KEY, defaultPassword);
      }

      // Generate encryption key if not exists
      const existingKey = await SecureStore.getItemAsync(this.ENCRYPTION_KEY);
      if (!existingKey) {
        const encryptionKey = await this.generateEncryptionKey();
        await SecureStore.setItemAsync(this.ENCRYPTION_KEY, encryptionKey);
      }

      // Set default calculator PIN if not exists
      const existingPin = await SecureStore.getItemAsync(this.CALCULATOR_PIN_KEY);
      if (!existingPin) {
        await SecureStore.setItemAsync(this.CALCULATOR_PIN_KEY, '1234');
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      // Continue with app initialization even if some parts fail
    }
  }

  static async validatePassword(password: string): Promise<boolean> {
    try {
      const storedHash = await SecureStore.getItemAsync(this.MASTER_PASSWORD_KEY);
      if (!storedHash) return false;

      const inputHash = await this.hashPassword(password);
      return storedHash === inputHash;
    } catch (error) {
      console.error('Password validation failed:', error);
      return false;
    }
  }

  static async verifyPassword(password: string): Promise<boolean> {
    return this.validatePassword(password);
  }

  static async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      const isValid = await this.validatePassword(oldPassword);
      if (!isValid) return false;

      const newHash = await this.hashPassword(newPassword);
      await SecureStore.setItemAsync(this.MASTER_PASSWORD_KEY, newHash);

      this.logSecurityEvent('password_changed');
      return true;
    } catch (error) {
      console.error('Password change failed:', error);
      return false;
    }
  }

  static async getCalculatorPin(): Promise<string> {
    try {
      const pin = await SecureStore.getItemAsync(this.CALCULATOR_PIN_KEY);
      return pin || '1234'; // Default PIN
    } catch (error) {
      console.error('Failed to get calculator PIN:', error);
      return '1234';
    }
  }

  static async setCalculatorPin(newPin: string): Promise<boolean> {
    try {
      if (!/^\d{4}$/.test(newPin)) {
        throw new Error('PIN must be exactly 4 digits');
      }

      await SecureStore.setItemAsync(this.CALCULATOR_PIN_KEY, newPin);
      this.logSecurityEvent('calculator_pin_changed');
      return true;
    } catch (error) {
      console.error('Failed to set calculator PIN:', error);
      return false;
    }
  }

  static async hashPassword(password: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + 'SecureVaultSalt2024'
    );
  }

  static async generateEncryptionKey(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static async encryptData(data: string): Promise<string> {
    try {
      // For demo purposes, just encode the data without complex encryption
      // In production, use proper AES-256 encryption
      return btoa(encodeURIComponent(data));
    } catch (error) {
      console.error('Encryption failed:', error);
      // Return the data as-is if encryption fails
      return btoa(encodeURIComponent(data));
    }
  }

  static async decryptData(encryptedData: string): Promise<string> {
    try {
      // For demo purposes, just decode the data
      // In production, use proper AES-256 decryption
      return decodeURIComponent(atob(encryptedData));
    } catch (error: any) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data: ' + error.message);
    }
  }

  static async logSecurityEvent(type: SecurityEvent['type'], details?: any) {
    try {
      const event: SecurityEvent = {
        id: await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          Date.now().toString() + Math.random().toString()
        ),
        type,
        timestamp: Date.now(),
        details
      };

      const existingEvents = await this.getSecurityEvents();
      const updatedEvents = [event, ...existingEvents].slice(0, 100); // Keep only last 100 events

      const encryptedEvents = await this.encryptData(JSON.stringify(updatedEvents));
      await SecureStore.setItemAsync(this.SECURITY_EVENTS_KEY, encryptedEvents);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  static async getSecurityEvents(): Promise<SecurityEvent[]> {
    try {
      const encryptedEvents = await SecureStore.getItemAsync(this.SECURITY_EVENTS_KEY);
      if (!encryptedEvents) {
        return [];
      }

      try {
        const decryptedEvents = await this.decryptData(encryptedEvents);
        return JSON.parse(decryptedEvents);
      } catch (decryptError) {
        console.warn('Failed to decrypt security events, returning empty array:', decryptError);
        // Clear corrupted data and return empty array
        await SecureStore.deleteItemAsync(this.SECURITY_EVENTS_KEY);
        return [];
      }
    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }

  static async clearSecurityEvents() {
    try {
      await SecureStore.deleteItemAsync(this.SECURITY_EVENTS_KEY);
    } catch (error) {
      console.error('Failed to clear security events:', error);
    }
  }

  static async getVaultActivity(vaultId: string): Promise<SecurityEvent[]> {
    try {
      const allEvents = await this.getSecurityEvents();
      // Filter events related to this specific vault
      const vaultEvents = allEvents.filter(event =>
        event.details?.vaultId === vaultId ||
        (event.type.includes('vault') && event.details?.vaultId === vaultId) ||
        (event.type.includes('item') && event.details?.vaultId === vaultId)
      );

      // Sort by timestamp (newest first)
      return vaultEvents.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to get vault activity:', error);
      return [];
    }
  }

  static async clearVaultActivity(vaultId: string): Promise<boolean> {
    try {
      const allEvents = await this.getSecurityEvents();
      // Keep only events not related to this vault
      const filteredEvents = allEvents.filter(event =>
        !(event.details?.vaultId === vaultId ||
          (event.type.includes('vault') && event.details?.vaultId === vaultId) ||
          (event.type.includes('item') && event.details?.vaultId === vaultId))
      );

      const encryptedEvents = await this.encryptData(JSON.stringify(filteredEvents));
      await SecureStore.setItemAsync(this.SECURITY_EVENTS_KEY, encryptedEvents);

      return true;
    } catch (error) {
      console.error('Failed to clear vault activity:', error);
      return false;
    }
  }

  static async deleteAllData(): Promise<boolean> {
    try {
      // Get all vaults first
      const vaultsData = await SecureStore.getItemAsync('vaults_data');
      if (vaultsData) {
        const decryptedVaults = await this.decryptData(vaultsData);
        const vaults = JSON.parse(decryptedVaults);

        // Delete all vault data
        for (const vault of vaults) {
          await SecureStore.deleteItemAsync('vault_' + vault.id);
        }
      }

      // Delete all main data stores
      await SecureStore.deleteItemAsync('vaults_data');
      await SecureStore.deleteItemAsync('secure_photos');
      await SecureStore.deleteItemAsync(this.SECURITY_EVENTS_KEY);
      await SecureStore.deleteItemAsync(this.MASTER_PASSWORD_KEY);
      await SecureStore.deleteItemAsync(this.ENCRYPTION_KEY);
      await SecureStore.deleteItemAsync('auth_session');
      await SecureStore.deleteItemAsync('lockout_data');
      await SecureStore.deleteItemAsync('user_settings');

      // Delete calculator PIN
      await SecureStore.deleteItemAsync(this.CALCULATOR_PIN_KEY);

      this.logSecurityEvent('all_data_deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete all data:', error);
      return false;
    }
  }

  static async logout() {
    try {
      // Clear any cached authentication state
      await SecureStore.deleteItemAsync('auth_session');
      await SecureStore.deleteItemAsync('lockout_data');

      // Log the logout event
      this.logSecurityEvent('user_logout');

      // Set duress mode flag to show calculator on next login
      await SecureStore.setItemAsync('show_duress_mode', 'true');

      return true;
    } catch (error) {
      console.error('Failed to logout:', error);
      return false;
    }
  }

  static async getUserSettings(): Promise<any> {
    try {
      const encryptedSettings = await SecureStore.getItemAsync('user_settings');
      if (!encryptedSettings) {
        // Return default settings
        return {
          breakInDetection: true,
          autoLock: true,
          securityLevel: 'high',
          biometricEnabled: false,
          createdAt: Date.now()
        };
      }

      try {
        const decryptedSettings = await this.decryptData(encryptedSettings);
        return JSON.parse(decryptedSettings);
      } catch (decryptError) {
        console.warn('Failed to decrypt user settings, returning defaults:', decryptError);
        // Clear corrupted data and return defaults
        await SecureStore.deleteItemAsync('user_settings');
        return {
          breakInDetection: true,
          autoLock: true,
          securityLevel: 'high',
          biometricEnabled: false,
          createdAt: Date.now()
        };
      }
    } catch (error) {
      console.error('Failed to get user settings:', error);
      // Return default settings on error
      return {
        breakInDetection: true,
        autoLock: true,
        securityLevel: 'high',
        biometricEnabled: false,
        createdAt: Date.now()
      };
    }
  }

  static async saveUserSettings(settings: any): Promise<boolean> {
    try {
      // Merge with existing settings to preserve other data
      const existingSettings = await this.getUserSettings();
      const mergedSettings = {
        ...existingSettings,
        ...settings,
        updatedAt: Date.now()
      };

      const encryptedSettings = await this.encryptData(JSON.stringify(mergedSettings));
      await SecureStore.setItemAsync('user_settings', encryptedSettings);

      this.logSecurityEvent('settings_updated', {
        settingsKeys: Object.keys(settings),
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Failed to save user settings:', error);
      return false;
    }
  }

  static async getSecurityLevel(): Promise<'high' | 'medium' | 'low'> {
    try {
      const settings = await this.getUserSettings();
      return settings?.securityLevel || 'high';
    } catch (error) {
      console.error('Failed to get security level:', error);
      return 'high';
    }
  }

  static async setSecurityLevel(level: 'high' | 'medium' | 'low'): Promise<boolean> {
    try {
      const settings = await this.getUserSettings();
      const updatedSettings = {
        ...settings,
        securityLevel: level,
        updatedAt: Date.now()
      };

      return await this.saveUserSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to set security level:', error);
      return false;
    }
  }

  static async applySecurityLevel(level: 'high' | 'medium' | 'low'): Promise<void> {
    try {
      // Apply security level specific configurations
      const settings = await this.getUserSettings();

      switch (level) {
        case 'high':
          settings.breakInDetection = true;
          settings.autoLock = true;
          settings.lockTimeout = 30; // 30 seconds
          settings.maxFailedAttempts = 3;
          // Don't force biometric requirement, let user choose
          break;
        case 'medium':
          settings.breakInDetection = true;
          settings.autoLock = true;
          settings.lockTimeout = 300; // 5 minutes
          settings.maxFailedAttempts = 5;
          break;
        case 'low':
          settings.breakInDetection = false;
          settings.autoLock = false;
          settings.lockTimeout = 1800; // 30 minutes
          settings.maxFailedAttempts = 10;
          break;
      }

      // Preserve existing biometric setting
      settings.securityLevel = level;

      await this.saveUserSettings(settings);
      this.logSecurityEvent('security_level_applied', { level, settings });
    } catch (error) {
      console.error('Failed to apply security level:', error);
    }
  }
  static async handleBreakInAttempt() {
    try {
      // Log break-in attempt
      this.logSecurityEvent('break_in_attempt', {
        timestamp: Date.now(),
        location: 'Unknown', // Would use GPS in production
        deviceInfo: 'Unknown' // Would capture device info in production
      });

      // In production, this would:
      // 1. Take photo with front camera
      // 2. Get GPS location
      // 3. Send alert to backup email
      // 4. Temporarily lock the app

      console.log('Break-in attempt detected and logged');
    } catch (error) {
      console.error('Failed to handle break-in attempt:', error);
    }
  }

  static async secureDelete(data: string) {
    // In production, this would perform secure deletion
    // by overwriting memory multiple times
    try {
      // Simulate secure deletion
      const iterations = 3;
      for (let i = 0; i < iterations; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return true;
    } catch (error) {
      console.error('Secure deletion failed:', error);
      return false;
    }
  }

  static async validateIntegrity(data: string, hash: string): Promise<boolean> {
    try {
      const computedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data
      );
      return computedHash === hash;
    } catch (error) {
      console.error('Integrity validation failed:', error);
      return false;
    }
  }
}

// Initialize security manager
SecurityManager.initializeApp();