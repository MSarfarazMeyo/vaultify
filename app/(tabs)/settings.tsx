import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  Shield,
  User,
  Lock,
  Bell,
  Smartphone,
  Trash2,
  LogOut,
  Crown,
  Users,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  Fingerprint,
  Cloud,
} from 'lucide-react-native';
import { SecurityManager } from '@/utils/SecurityManager';
import { SubscriptionManager } from '@/utils/SubscriptionManager';
import * as LocalAuthentication from 'expo-local-authentication';
import PremiumFeatureCard from '@/components/PremiumFeatureCard';
import FamilyManagementModal from '@/components/FamilyManagementModal';
import StorageIndicator from '@/components/StorageIndicator';
import PasswordChangeModal from '@/components/PasswordChangeModal';
import { AuthManager } from '@/utils/AuthManager';

export default function SettingsScreen() {
  const router = useRouter();
  const [securityLevel, setSecurityLevel] = useState<'high' | 'medium' | 'low'>(
    'high'
  );
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [autoLock, setAutoLock] = useState(true);
  const [breakInDetection, setBreakInDetection] = useState(true);
  const [cloudBackup, setCloudBackup] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    if (Platform.OS !== 'web') {
      checkBiometricAvailability();
    }
  }, []);

  const loadSettings = async () => {
    try {
      const [settings, subscription] = await Promise.all([
        SecurityManager.getUserSettings(),
        SubscriptionManager.getSubscriptionStatus(),
      ]);

      console.log('subscription', subscription);

      if (settings) {
        setSecurityLevel(settings.securityLevel || 'high');
        setAutoLock(settings.autoLock ?? true);
        setBreakInDetection(settings.breakInDetection ?? true);
        setBiometricEnabled(settings.biometricEnabled ?? false);
        setCloudBackup(settings.cloudBackup ?? false);
      }

      setSubscriptionStatus(subscription);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  };

  const checkBiometricAvailability = async () => {
    if (Platform.OS === 'web') {
      setBiometricAvailable(false);
      return;
    }

    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      setBiometricAvailable(compatible && enrolled);

      if (
        types.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        )
      ) {
        setBiometricType('Face ID');
      } else if (
        types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ) {
        setBiometricType('Touch ID');
      } else {
        setBiometricType('Biometric');
      }
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const handleSecurityLevelChange = async () => {
    const levels: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];
    const currentIndex = levels.indexOf(securityLevel);
    const nextIndex = (currentIndex + 1) % levels.length;
    const newLevel = levels[nextIndex];

    try {
      setSecurityLevel(newLevel);

      const currentSettings = await SecurityManager.getUserSettings();
      const updatedSettings = {
        ...currentSettings,
        securityLevel: newLevel,
        updatedAt: Date.now(),
      };

      await SecurityManager.saveUserSettings(updatedSettings);
      await SecurityManager.applySecurityLevel(newLevel);

      const levelDescriptions = {
        high: 'Maximum security with all features enabled',
        medium: 'Balanced security with essential features',
        low: 'Basic security with minimal restrictions',
      };

      Alert.alert(
        'Security Level Changed',
        `Security level set to ${newLevel.toUpperCase()}: ${
          levelDescriptions[newLevel]
        }`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to change security level:', error);
      setSecurityLevel(securityLevel); // Revert on error
      Alert.alert('Error', 'Failed to change security level');
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available',
        'Biometric authentication is not available on web platform'
      );
      return;
    }

    if (!biometricAvailable) {
      Alert.alert(
        'Not Available',
        'Biometric authentication is not set up on this device'
      );
      return;
    }

    if (enabled) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Enable ${biometricType} for Secure Vault`,
          fallbackLabel: 'Use password',
        });

        if (result.success) {
          setBiometricEnabled(true);

          const currentSettings = await SecurityManager.getUserSettings();
          await SecurityManager.saveUserSettings({
            ...currentSettings,
            biometricEnabled: true,
            updatedAt: Date.now(),
          });
          SecurityManager.logSecurityEvent('biometric_auth_enabled');
          Alert.alert(
            'Success',
            `${biometricType} has been enabled for authentication`
          );
        } else {
          Alert.alert('Authentication Failed', 'Please try again');
        }
      } catch (error) {
        console.error('Biometric authentication failed:', error);
        Alert.alert('Error', 'Failed to enable biometric authentication');
      }
    } else {
      setBiometricEnabled(false);

      const currentSettings = await SecurityManager.getUserSettings();
      await SecurityManager.saveUserSettings({
        ...currentSettings,
        biometricEnabled: false,
        updatedAt: Date.now(),
      });
      SecurityManager.logSecurityEvent('biometric_auth_disabled');
      Alert.alert(
        'Disabled',
        `${biometricType} authentication has been disabled`
      );
    }
  };

  const handleAutoLockToggle = async (enabled: boolean) => {
    try {
      setAutoLock(enabled);

      const currentSettings = await SecurityManager.getUserSettings();
      await SecurityManager.saveUserSettings({
        ...currentSettings,
        autoLock: enabled,
        updatedAt: Date.now(),
      });
      SecurityManager.logSecurityEvent('auto_lock_changed', { enabled });
    } catch (error) {
      console.error('Failed to toggle auto-lock:', error);
      setAutoLock(!enabled); // Revert on error
      Alert.alert('Error', 'Failed to update auto-lock setting');
    }
  };

  const handleBreakInDetectionToggle = async (enabled: boolean) => {
    try {
      setBreakInDetection(enabled);

      const currentSettings = await SecurityManager.getUserSettings();
      await SecurityManager.saveUserSettings({
        ...currentSettings,
        breakInDetection: enabled,
        updatedAt: Date.now(),
      });
      SecurityManager.logSecurityEvent('break_in_detection_changed', {
        enabled,
      });
    } catch (error) {
      console.error('Failed to toggle break-in detection:', error);
      setBreakInDetection(!enabled); // Revert on error
      Alert.alert('Error', 'Failed to update break-in detection setting');
    }
  };

  const handleCloudBackupToggle = async (enabled: boolean) => {
    // Check if user has premium subscription for cloud backup
    if (enabled && (!subscriptionStatus || !subscriptionStatus.isActive)) {
      Alert.alert(
        'Premium Required',
        'Cloud backup requires a premium subscription. Would you like to upgrade?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }

    try {
      setCloudBackup(enabled);

      const currentSettings = await SecurityManager.getUserSettings();
      await SecurityManager.saveUserSettings({
        ...currentSettings,
        cloudBackup: enabled,
        updatedAt: Date.now(),
      });

      SecurityManager.logSecurityEvent('cloud_backup_changed', { enabled });

      if (enabled) {
        Alert.alert(
          'Cloud Backup Enabled',
          'Your data will now be automatically backed up to secure cloud storage with end-to-end encryption.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Cloud Backup Disabled',
          'Your data will only be stored locally on this device. Consider enabling cloud backup for data protection.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to toggle cloud backup:', error);
      setCloudBackup(!enabled); // Revert on error
      Alert.alert('Error', 'Failed to update cloud backup setting');
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your vaults, photos, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecurityManager.deleteAllData();
              Alert.alert(
                'Data Deleted',
                'All data has been permanently deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/'),
                  },
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to delete data');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You will need to enter your password again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthManager.signOut();
              router.replace('/auth');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const getSecurityLevelColor = () => {
    switch (securityLevel) {
      case 'high':
        return '#34C759';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#FF3B30';
      default:
        return '#34C759';
    }
  };

  const getSecurityLevelDescription = () => {
    switch (securityLevel) {
      case 'high':
        return 'Maximum protection with all security features';
      case 'medium':
        return 'Balanced security with essential features';
      case 'low':
        return 'Basic protection with minimal restrictions';
      default:
        return 'Maximum protection with all security features';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Storage Indicator */}
        <StorageIndicator />

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.settingIcon}>
              <Lock size={20} color="#FF3B30" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Change Master Password</Text>
              <Text style={styles.settingDescription}>
                Update your master password and calculator PIN
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleSecurityLevelChange}
          >
            <View style={styles.settingIcon}>
              <Shield size={20} color={getSecurityLevelColor()} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Security Level</Text>
              <Text style={styles.settingDescription}>
                {securityLevel.toUpperCase()} - {getSecurityLevelDescription()}
              </Text>
            </View>
            <View
              style={[
                styles.securityLevelIndicator,
                { backgroundColor: getSecurityLevelColor() },
              ]}
            />
          </TouchableOpacity>

          {biometricAvailable && Platform.OS !== 'web' && (
            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Fingerprint size={20} color="#007AFF" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>{biometricType}</Text>
                <Text style={styles.settingDescription}>
                  Use {biometricType.toLowerCase()} to unlock the app
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: '#48484A', true: '#007AFF' }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}

          {(!biometricAvailable || Platform.OS === 'web') && (
            <View style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Fingerprint size={20} color="#8E8E93" />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: '#8E8E93' }]}>
                  Biometric Authentication
                </Text>
                <Text style={styles.settingDescription}>
                  {Platform.OS === 'web'
                    ? 'Not available on web platform'
                    : 'Not available - Set up biometrics in device settings'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Lock size={20} color="#FF9500" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Auto-lock</Text>
              <Text style={styles.settingDescription}>
                Automatically lock the app when inactive
              </Text>
            </View>
            <Switch
              value={autoLock}
              onValueChange={handleAutoLockToggle}
              trackColor={{ false: '#48484A', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Eye size={20} color="#FF3B30" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Break-in Detection</Text>
              <Text style={styles.settingDescription}>
                Capture photos of unauthorized access attempts
              </Text>
            </View>
            <Switch
              value={breakInDetection}
              onValueChange={handleBreakInDetectionToggle}
              trackColor={{ false: '#48484A', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Cloud size={20} color="#34C759" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Cloud Backup</Text>
              <Text style={styles.settingDescription}>
                {subscriptionStatus?.isActive
                  ? 'Automatically backup your data to secure cloud storage'
                  : 'Requires premium subscription for secure cloud backup'}
              </Text>
            </View>
            <Switch
              value={cloudBackup && subscriptionStatus?.isActive}
              onValueChange={handleCloudBackupToggle}
              trackColor={{ false: '#48484A', true: '#007AFF' }}
              thumbColor="#FFFFFF"
              disabled={!subscriptionStatus?.isActive}
            />
          </View>
        </View>

        {/* Premium Features */}
        {subscriptionStatus && !subscriptionStatus.isActive && (
          <PremiumFeatureCard
            title="Upgrade to Premium"
            description="Unlock advanced security features and unlimited storage"
            features={[
              'Unlimited vaults and photos',
              'Advanced AES-256 encryption',
              'Cloud backup with 2FA',
              'Break-in photo capture',
              'Priority support',
            ]}
          />
        )}

        {/* Family Sharing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Family</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/family')}
          >
            <View style={styles.settingIcon}>
              <Users size={20} color="#AF52DE" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Family Sharing</Text>
              <Text style={styles.settingDescription}>
                {subscriptionStatus?.isActive
                  ? 'Share premium features with family members'
                  : 'Requires premium subscription'}
              </Text>
            </View>
            <Text style={styles.settingValue}>
              {subscriptionStatus?.isActive ? 'Manage' : 'Upgrade'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/paywall')}
          >
            <View style={styles.settingIcon}>
              <Crown size={20} color="#FFD700" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Subscription</Text>
              <Text style={styles.settingDescription}>
                {subscriptionStatus?.isActive
                  ? `${subscriptionStatus.plan.toUpperCase()} Plan`
                  : 'Free Plan - Upgrade for more features'}
              </Text>
            </View>
            <Text style={styles.settingValue}>
              {subscriptionStatus?.isActive ? 'Manage' : 'Upgrade'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <View style={styles.settingIcon}>
              <LogOut size={20} color="#007AFF" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Logout</Text>
              <Text style={styles.settingDescription}>
                Sign out and return to login screen
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FF3B30' }]}>
            Danger Zone
          </Text>

          <TouchableOpacity
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleDeleteAllData}
          >
            <View style={styles.settingIcon}>
              <Trash2 size={20} color="#FF3B30" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>
                Delete All Data
              </Text>
              <Text style={styles.settingDescription}>
                Permanently delete all vaults and photos
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Vaultify v1.0.0</Text>
          <Text style={styles.appInfoText}>
            Built with end-to-end encryption
          </Text>
        </View>
      </ScrollView>

      <FamilyManagementModal
        visible={showFamilyModal}
        onClose={() => setShowFamilyModal(false)}
      />

      <PasswordChangeModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  settingValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  securityLevelIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  appInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
});
