import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Animated, Dimensions } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Shield, Eye, EyeOff, Check, X, Lock, Calculator, ArrowRight, Sparkles } from 'lucide-react-native';
import { SecurityManager } from '@/utils/SecurityManager';
import SecureStore from '@/utils/secureStorage';

const { width, height } = Dimensions.get('window');

interface PasswordRequirement {
  id: string;
  text: string;
  validator: (password: string) => boolean;
}

export default function SetupScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [calculatorPin, setCalculatorPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const passwordRequirements: PasswordRequirement[] = [
    {
      id: 'length',
      text: 'At least 12 characters long',
      validator: (password) => password.length >= 12
    },
    {
      id: 'uppercase',
      text: 'Contains uppercase letter (A-Z)',
      validator: (password) => /[A-Z]/.test(password)
    },
    {
      id: 'lowercase',
      text: 'Contains lowercase letter (a-z)',
      validator: (password) => /[a-z]/.test(password)
    },
    {
      id: 'number',
      text: 'Contains number (0-9)',
      validator: (password) => /[0-9]/.test(password)
    },
    {
      id: 'special',
      text: 'Contains special character (!@#$%^&*)',
      validator: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
  ];

  const steps = [
    {
      title: 'Welcome to Vaultify',
      subtitle: 'Let\'s set up your secure digital vault',
      icon: <Shield size={64} color="#007AFF" />
    },
    {
      title: 'Create Master Password',
      subtitle: 'This password protects all your data',
      icon: <Lock size={64} color="#34C759" />
    },
    {
      title: 'Set Calculator PIN',
      subtitle: 'Emergency access through calculator mode',
      icon: <Calculator size={64} color="#FF9500" />
    },
    {
      title: 'Setup Complete',
      subtitle: 'Your secure vault is ready to use',
      icon: <Sparkles size={64} color="#AF52DE" />
    }
  ];

  useEffect(() => {
    startAnimations();
  }, [currentStep]);

  const startAnimations = () => {
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: currentStep / (steps.length - 1),
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const validatePassword = () => {
    if (masterPassword.length < 12) {
      Alert.alert('Weak Password', 'Password must be at least 12 characters long');
      return false;
    }
    
    const failedRequirements = passwordRequirements.filter(req => !req.validator(masterPassword));
    if (failedRequirements.length > 0) {
      Alert.alert('Password Requirements', 'Please ensure your password meets all security requirements');
      return false;
    }
    
    if (masterPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return false;
    }
    
    return true;
  };

  const validatePin = () => {
    if (calculatorPin.length !== 4 || !/^\d{4}$/.test(calculatorPin)) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits');
      return false;
    }
    
    if (calculatorPin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'PINs do not match');
      return false;
    }
    
    if (calculatorPin === '0000' || calculatorPin === '1234' || calculatorPin === '1111') {
      Alert.alert('Weak PIN', 'Please choose a more secure PIN');
      return false;
    }
    
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validatePassword()) return;
    } else if (currentStep === 2) {
      if (!validatePin()) return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeSetup();
    }
  };

  const completeSetup = async () => {
    setIsCreating(true);
    
    try {
      // Hash and store master password
      const hashedPassword = await SecurityManager.hashPassword(masterPassword);
      await SecureStore.setItemAsync('master_password', hashedPassword);
      
      // Store calculator PIN
      await SecureStore.setItemAsync('calculator_pin', calculatorPin);
      
      // Generate and store encryption key
      const encryptionKey = await SecurityManager.generateEncryptionKey();
      await SecureStore.setItemAsync('encryption_key', encryptionKey);
      
      // Mark setup as complete
      await SecureStore.setItemAsync('setup_complete', 'true');
      
      // Initialize default settings
      const defaultSettings = {
        breakInDetection: true,
        autoLock: true,
        securityLevel: 'high',
        biometricEnabled: false,
        createdAt: Date.now()
      };
      
      const encryptedSettings = await SecurityManager.encryptData(JSON.stringify(defaultSettings));
      await SecureStore.setItemAsync('user_settings', encryptedSettings);
      
      // Log setup completion
      SecurityManager.logSecurityEvent('initial_setup_completed');
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Setup failed:', error);
      Alert.alert('Setup Failed', 'Failed to complete setup. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderWelcomeStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.iconContainer}>
        {steps[currentStep].icon}
        <View style={styles.sparkleContainer}>
          <Sparkles size={20} color="#FFD700" style={styles.sparkle1} />
          <Sparkles size={16} color="#FFD700" style={styles.sparkle2} />
          <Sparkles size={14} color="#FFD700" style={styles.sparkle3} />
        </View>
      </View>
      
      <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
      <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
      
      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <Shield size={20} color="#34C759" />
          <Text style={styles.featureText}>Military-grade AES-256 encryption</Text>
        </View>
        <View style={styles.featureItem}>
          <Lock size={20} color="#007AFF" />
          <Text style={styles.featureText}>Biometric authentication support</Text>
        </View>
        <View style={styles.featureItem}>
          <Calculator size={20} color="#FF9500" />
          <Text style={styles.featureText}>Hidden calculator mode for emergencies</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
        <ArrowRight size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPasswordStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.iconContainer}>
        {steps[currentStep].icon}
      </View>
      
      <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
      <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Master Password</Text>
        <View style={styles.passwordInput}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter a strong password"
            placeholderTextColor="#8E8E93"
            value={masterPassword}
            onChangeText={setMasterPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
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
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View style={styles.passwordInput}>
          <TextInput
            style={styles.textInput}
            placeholder="Confirm your password"
            placeholderTextColor="#8E8E93"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff size={20} color="#8E8E93" />
            ) : (
              <Eye size={20} color="#8E8E93" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.requirementsContainer}>
        <Text style={styles.requirementsTitle}>Password Requirements:</Text>
        {passwordRequirements.map((requirement) => {
          const isValid = requirement.validator(masterPassword);
          return (
            <View key={requirement.id} style={styles.requirementItem}>
              {isValid ? (
                <Check size={16} color="#34C759" />
              ) : (
                <X size={16} color="#8E8E93" />
              )}
              <Text style={[
                styles.requirementText,
                { color: isValid ? '#34C759' : '#8E8E93' }
              ]}>
                {requirement.text}
              </Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity 
        style={[
          styles.primaryButton,
          (!masterPassword || !confirmPassword) && styles.disabledButton
        ]} 
        onPress={handleNext}
        disabled={!masterPassword || !confirmPassword}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <ArrowRight size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPinStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.iconContainer}>
        {steps[currentStep].icon}
      </View>
      
      <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
      <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
      
      <View style={styles.pinExplanation}>
        <Text style={styles.pinExplanationText}>
          In emergency situations, entering "000000" as your password will open a calculator. 
          Your secret PIN will then unlock your vault through the calculator interface.
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Calculator PIN (4 digits)</Text>
        <TextInput
          style={[styles.textInput, styles.pinInput]}
          placeholder="1234"
          placeholderTextColor="#8E8E93"
          value={calculatorPin}
          onChangeText={(text) => {
            if (/^\d{0,4}$/.test(text)) {
              setCalculatorPin(text);
            }
          }}
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirm PIN</Text>
        <TextInput
          style={[styles.textInput, styles.pinInput]}
          placeholder="1234"
          placeholderTextColor="#8E8E93"
          value={confirmPin}
          onChangeText={(text) => {
            if (/^\d{0,4}$/.test(text)) {
              setConfirmPin(text);
            }
          }}
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
        />
      </View>

      <View style={styles.pinWarning}>
        <Text style={styles.pinWarningText}>
          ⚠️ Avoid common PINs like 0000, 1234, or 1111
        </Text>
      </View>

      <TouchableOpacity 
        style={[
          styles.primaryButton,
          (!calculatorPin || !confirmPin || calculatorPin.length !== 4) && styles.disabledButton
        ]} 
        onPress={handleNext}
        disabled={!calculatorPin || !confirmPin || calculatorPin.length !== 4}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <ArrowRight size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderCompleteStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.iconContainer}>
        {steps[currentStep].icon}
        <View style={styles.sparkleContainer}>
          <Sparkles size={20} color="#FFD700" style={styles.sparkle1} />
          <Sparkles size={16} color="#FFD700" style={styles.sparkle2} />
          <Sparkles size={14} color="#FFD700" style={styles.sparkle3} />
        </View>
      </View>
      
      <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
      <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
      
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Lock size={20} color="#34C759" />
          <Text style={styles.summaryText}>Master password created</Text>
        </View>
        <View style={styles.summaryItem}>
          <Calculator size={20} color="#34C759" />
          <Text style={styles.summaryText}>Emergency PIN configured</Text>
        </View>
        <View style={styles.summaryItem}>
          <Shield size={20} color="#34C759" />
          <Text style={styles.summaryText}>High security level enabled</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.primaryButton, isCreating && styles.loadingButton]} 
        onPress={handleNext}
        disabled={isCreating}
      >
        <Text style={styles.primaryButtonText}>
          {isCreating ? 'Setting up...' : 'Enter Secure Vault'}
        </Text>
        {!isCreating && <ArrowRight size={20} color="#FFFFFF" />}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderWelcomeStep();
      case 1:
        return renderPasswordStep();
      case 2:
        return renderPinStep();
      case 3:
        return renderCompleteStep();
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {isCreating ? 'Setting up...' : 'Enter Vaultify'}
          </Text>
        </View>

        {renderStep()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  progressContainer: {
    marginBottom: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2C2C2E',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
    textAlign: 'center',
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height * 0.7,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkle1: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  sparkle2: {
    position: 'absolute',
    bottom: -8,
    left: -8,
  },
  sparkle3: {
    position: 'absolute',
    top: 10,
    left: -15,
  },
  stepTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresList: {
    width: '100%',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  passwordInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#48484A',
  },
  textInput: {
    flex: 1,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  pinInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#48484A',
    textAlign: 'center',
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    letterSpacing: 8,
  },
  eyeButton: {
    padding: 16,
  },
  requirementsContainer: {
    width: '100%',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  requirementsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
  },
  pinExplanation: {
    width: '100%',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  pinExplanationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#007AFF',
    lineHeight: 20,
    textAlign: 'center',
  },
  pinWarning: {
    width: '100%',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  pinWarningText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FF9500',
    textAlign: 'center',
  },
  summaryContainer: {
    width: '100%',
    marginBottom: 40,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  summaryText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#34C759',
    marginLeft: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: '#48484A',
    shadowOpacity: 0,
  },
  loadingButton: {
    backgroundColor: '#48484A',
  },
});