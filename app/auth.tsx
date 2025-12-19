import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  Calculator,
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
  Mail,
} from 'lucide-react-native';
import { SecurityManager } from '@/utils/SecurityManager';
import { AuthManager } from '@/utils/AuthManager';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPassword('');
    setAttempts(0);
    setIsLocked(false);
    checkBiometricAuth();
    checkLockoutStatus();
  }, []);



  const checkBiometricAuth = async () => {
    if (Platform.OS === 'web') return;

    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    } catch (error) {
      console.log('Biometric check failed:', error);
    }
  };

  const checkLockoutStatus = async () => {
    try {
      const lockoutData = await SecureStore.getItemAsync('lockout_data');
      if (lockoutData) {
        const { timestamp, duration } = JSON.parse(lockoutData);
        const now = Date.now();
        if (now < timestamp + duration) {
          setIsLocked(true);
          setLockoutTime(Math.ceil((timestamp + duration - now) / 1000));
        }
      }
    } catch (error) {
      console.log('Lockout check failed:', error);
    }
  };

  const handleBiometricAuth = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Biometric authentication not available on web');
      return;
    }

    try {
      // Check if biometric is enabled in settings
      const settings = await SecurityManager.getUserSettings();
      if (!settings.biometricEnabled) {
        Alert.alert(
          'Biometric Disabled',
          'Biometric authentication is disabled. Enable it in Settings.'
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your secure vault',
        fallbackLabel: 'Use password',
      });

      if (result.success) {
        SecurityManager.logSecurityEvent('biometric_auth_success');
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.log('Biometric auth failed:', error);
    }
  };

  const handlePasswordLogin = async () => {
    if (isLocked || isLoading) return;

    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const { user, session } = await AuthManager.signIn(email, password);
      
      if (user && session) {
        setAttempts(0);
        SecurityManager.logSecurityEvent('password_auth_success', {
          userId: user.id,
          method: 'email_password'
        });
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      SecurityManager.logSecurityEvent('failed_login_attempt', {
        attempts: newAttempts,
        email: email,
        error: error?.message,
        timestamp: Date.now(),
      });

      if (newAttempts >= 3) {
        await SecurityManager.handleBreakInAttempt();
        setIsLocked(true);
        setLockoutTime(300);

        await SecureStore.setItemAsync(
          'lockout_data',
          JSON.stringify({
            timestamp: Date.now(),
            duration: 300000,
          })
        );
      }

      Alert.alert(
        'Login Failed', 
        error?.message || `Incorrect credentials. ${3 - newAttempts} attempts remaining`
      );
    } finally {
      setIsLoading(false);
    }

    setPassword('');
  };



  // Add lockout countdown effect
  useEffect(() => {
    let interval: any;
    if (isLocked && lockoutTime > 0) {
      interval = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockoutTime]);





  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield size={48} color="#007AFF" />
        <Text style={styles.title}>Vaultify</Text>
        <Text style={styles.subtitle}>Enter your master password</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Mail size={20} color="#8E8E93" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#8E8E93"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLocked}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#8E8E93"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!isLocked}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color="#8E8E93" />
            ) : (
              <Eye size={20} color="#8E8E93" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.loginButton, (isLocked || isLoading) && styles.disabledButton]}
          onPress={handlePasswordLogin}
          disabled={isLocked || isLoading}
        >
          <Text style={styles.loginButtonText}>
            {isLocked ? `Locked (${lockoutTime}s)` : isLoading ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        {biometricAvailable && !isLocked && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
          >
            <Text style={styles.biometricButtonText}>
              Use Biometric Authentication
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.primaryButton2}
          onPress={() => router.push('/setup')}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <View style={styles.securityIndicator}>
          <View
            style={[
              styles.securityDot,
              {
                backgroundColor:
                  attempts === 0
                    ? '#34C759'
                    : attempts < 3
                    ? '#FF9500'
                    : '#FF3B30',
              },
            ]}
          />
          <Text style={styles.securityText}>
            {attempts === 0 ? 'Secure' : `${attempts} failed attempts`}
          </Text>
        </View>


      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    padding: 20,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginTop: 8,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  eyeButton: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#48484A',
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  biometricButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  biometricButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  footer: {
    paddingVertical: 20,
  },
  securityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  securityText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },



  primaryButton2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 12,
  },

  primaryButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
});
