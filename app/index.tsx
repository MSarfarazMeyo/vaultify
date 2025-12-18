import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Calculator, Shield, Eye, EyeOff } from 'lucide-react-native';
import { SecurityManager } from '@/utils/SecurityManager';
import SecureStoreUtil from '@/utils/secureStorage';

export default function LoginScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [showDecoy, setShowDecoy] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [calculatorInput, setCalculatorInput] = useState('0');
  const [isNewInput, setIsNewInput] = useState(true);
  const [secretPinAttempts, setSecretPinAttempts] = useState(0);

  // useEffect(() => {
  //   checkSetupStatus();
  // }, []);

  const checkSetupStatus = async () => {
    try {
      const setupComplete = await SecureStore.getItemAsync('setup_complete');
      if (setupComplete) {
        router.replace('/setup');
        return;
      }
    } catch (error) {
      console.log('Setup check failed:', error);
    }
  };

  useEffect(() => {
    // Reset any previous state when component mounts
    setPassword('');
    setAttempts(0);
    setIsLocked(false);
    setCalculatorInput('0');
    setIsNewInput(true);
    setSecretPinAttempts(0);

    checkFirstLaunch();
    checkDuressMode();
    checkBiometricAuth();
    checkLockoutStatus();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasSeenPaywall = await SecureStoreUtil.getItemAsync('has_seen_paywall');
      if (hasSeenPaywall) {
        // Mark as seen and show paywall
        await SecureStoreUtil.setItemAsync('has_seen_paywall', 'true');
        router.push('/paywall');
      }
    } catch (error) {
      console.log('First launch check failed:', error);
    }
  };

  const checkDuressMode = async () => {
    try {
      const duressMode = await SecureStore.getItemAsync('show_duress_mode');
      if (duressMode === 'true') {
        setShowDecoy(true);
        // Clear the flag after showing duress mode
        await SecureStore.deleteItemAsync('show_duress_mode');
      }
    } catch (error) {
      console.log('Duress mode check failed:', error);
    }
  };

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
        Alert.alert('Biometric Disabled', 'Biometric authentication is disabled. Enable it in Settings.');
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
    if (isLocked) return;

    const isDuressCode = password === '000000';

    if (isDuressCode) {
      setShowDecoy(true);
      SecurityManager.logSecurityEvent('duress_code_used');
      // Show decoy vault
      return;
    }

    const isValid = await SecurityManager.validatePassword(password);

    if (isValid) {
      setAttempts(0);
      SecurityManager.logSecurityEvent('password_auth_success');
      router.replace('/(tabs)');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      SecurityManager.logSecurityEvent('failed_login_attempt', {
        attempts: newAttempts,
        timestamp: Date.now()
      });

      if (newAttempts >= 3) {
        await SecurityManager.handleBreakInAttempt();
        setIsLocked(true);
        setLockoutTime(300); // 5 minutes

        await SecureStore.setItemAsync('lockout_data', JSON.stringify({
          timestamp: Date.now(),
          duration: 300000
        }));
      }

      Alert.alert('Invalid Password', `${3 - newAttempts} attempts remaining`);
    }

    setPassword('');
  };

  const handleCalculatorInput = (value: string) => {
    if (value === 'C') {
      setCalculatorInput('0');
      setIsNewInput(true);
      return;
    }

    if (value === '⌫') {
      if (calculatorInput.length > 1) {
        setCalculatorInput(calculatorInput.slice(0, -1));
      } else {
        setCalculatorInput('0');
        setIsNewInput(true);
      }
      return;
    }

    if (value === '=') {
      // Check if the current input is the secret PIN
      const checkPin = async () => {
        const secretPin = await SecurityManager.getCalculatorPin();
        if (calculatorInput === secretPin) {
          // Successfully entered PIN - navigate to home
          SecurityManager.logSecurityEvent('password_auth_success', { method: 'calculator_pin' });
          router.replace('/(tabs)');
          setShowDecoy(false);
          setSecretPinAttempts(0);
          setCalculatorInput('0');
          setIsNewInput(true);
          return;
        } else {
          // Increment failed attempts
          const newAttempts = secretPinAttempts + 1;
          setSecretPinAttempts(newAttempts);

          if (newAttempts >= 3) {
            // Log security event for multiple failed PIN attempts
            SecurityManager.logSecurityEvent('break_in_attempt', {
              type: 'calculator_pin_attempts',
              attempts: newAttempts
            });
          }

          // Show fake calculation result
          try {
            // Only try to evaluate if it looks like a math expression
            if (calculatorInput.includes('+') || calculatorInput.includes('-') ||
              calculatorInput.includes('×') || calculatorInput.includes('÷')) {
              const result = eval(calculatorInput.replace('×', '*').replace('÷', '/'));
              setCalculatorInput(result.toString());
            } else {
              // For single numbers, just show the number
              setCalculatorInput(calculatorInput);
            }
          } catch {
            setCalculatorInput('Error');
          }
          setIsNewInput(true);
          return;
        }
      };
      checkPin();
      return;
    }

    // Handle number and operator input
    if (isNewInput && !isNaN(Number(value)) && value !== '.') {
      setCalculatorInput(value);
      setIsNewInput(false);
    } else {
      if (calculatorInput === '0' && !isNaN(Number(value)) && value !== '.') {
        setCalculatorInput(value);
      } else {
        setCalculatorInput(calculatorInput + value);
      }
      setIsNewInput(false);
    }
  };

  // Add lockout countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLocked && lockoutTime > 0) {
      interval = setInterval(() => {
        setLockoutTime(prev => {
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

  const renderCalculatorMode = () => (
    <View style={styles.calculatorContainer}>
      <View style={styles.calculatorHeader}>
        <Calculator size={32} color="#007AFF" />
        <Text style={styles.calculatorTitle}>Calculator</Text>
      </View>
      <View style={styles.calculatorDisplay}>
        <Text style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>
          {calculatorInput}
        </Text>
      </View>

      {secretPinAttempts > 0 && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            {secretPinAttempts >= 3 ? 'Multiple failed attempts detected' : `${secretPinAttempts} failed attempts`}
          </Text>
        </View>
      )}

      <View style={styles.calculatorButtons}>
        {['C', '÷', '×', '⌫', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.', ''].map((btn, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.calcButton,
              btn === '=' && styles.calcButtonEquals,
              ['C', '÷', '×', '⌫', '-', '+'].includes(btn) && styles.calcButtonOperator,
              btn === '0' && styles.calcButtonZero
            ]}
            onPress={() => handleCalculatorInput(btn)}
            disabled={btn === ''}
          >
            {btn !== '' && <Text style={styles.calcButtonText}>{btn}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.calculatorHint}>
        <Text style={styles.hintText}>
          Tip: Try some calculations to test the calculator
        </Text>
      </View>
    </View>
  );

  if (showDecoy) {
    return (
      <View style={styles.container}>
        {renderCalculatorMode()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield size={48} color="#007AFF" />
        <Text style={styles.title}>Vaultify</Text>
        <Text style={styles.subtitle}>Enter your master password</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Master Password"
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
          style={[styles.loginButton, isLocked && styles.disabledButton]}
          onPress={handlePasswordLogin}
          disabled={isLocked}
        >
          <Text style={styles.loginButtonText}>
            {isLocked ? `Locked (${lockoutTime}s)` : 'Unlock Vault'}
          </Text>
        </TouchableOpacity>

        {biometricAvailable && !isLocked && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
          >
            <Text style={styles.biometricButtonText}>Use Biometric Authentication</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.securityIndicator}>
          <View style={[styles.securityDot, { backgroundColor: attempts === 0 ? '#34C759' : attempts < 3 ? '#FF9500' : '#FF3B30' }]} />
          <Text style={styles.securityText}>
            {attempts === 0 ? 'Secure' : `${attempts} failed attempts`}
          </Text>
        </View>

        <Text style={styles.duressHint}>
          Emergency? Enter 000000 for calculator mode
        </Text>
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
  duressHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
  calculatorContainer: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 20,
  },
  calculatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  calculatorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  calculatorDisplay: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  displayText: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  calculatorButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  calcButton: {
    width: '22.5%',
    height: 60,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  calcButtonOperator: {
    backgroundColor: '#FF9500',
  },
  calcButtonEquals: {
    backgroundColor: '#007AFF',
  },
  calcButtonZero: {
    width: '47%',
  },
  calcButtonText: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  warningContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FF3B30',
    textAlign: 'center',
  },
  calculatorHint: {
    padding: 20,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    opacity: 0.7,
  }
});