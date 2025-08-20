import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { SubscriptionManager } from '@/utils/SubscriptionManager';
import { Shield, Crown, Check, X, Star, Zap, Cloud, Camera, Lock, Eye, Sparkles, ArrowRight, Users, Infinity, Timer, Gift } from 'lucide-react-native';
import SecureStore from '@/utils/secureStorage';

const { width, height } = Dimensions.get('window');

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  originalPrice?: string;
  savings?: string;
  popular?: boolean;
  badge?: string;
  features: string[];
  storageAmount: string;
  color: string;
}

export default function PaywallScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [showAnnualSavings, setShowAnnualSavings] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkIfFirstLaunch();
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for popular badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkIfFirstLaunch = async () => {
    try {
      const hasSeenPaywall = await SecureStore.getItemAsync('has_seen_paywall');
      setIsFirstLaunch(!hasSeenPaywall);
    } catch (error) {
      console.log('Failed to check first launch:', error);
    }
  };

  const plans: SubscriptionPlan[] = [
    {
      id: 'monthly',
      name: 'Premium Monthly',
      price: '$6.99',
      period: '/month',
      storageAmount: '100GB',
      color: '#007AFF',
      features: [
        'Unlimited vaults and photos',
        '100GB cloud storage',
        'Advanced AES-256 encryption', 
        'Cloud backup with 2FA',
        'Break-in photo capture',
        'Steganography hiding',
        'Priority support'
      ]
    },
    {
      id: 'yearly',
      name: 'Premium Yearly',
      price: '$39.99',
      period: '/year',
      originalPrice: '$83.88',
      savings: 'Save 52%',
      popular: true,
      badge: 'BEST VALUE',
      storageAmount: '500GB',
      color: '#34C759',
      features: [
        'Everything in Monthly',
        '500GB cloud storage',
        'Best value - 7 months free',
        'Advanced security analytics',
        'Custom vault themes',
        'Export to multiple formats',
        'Family sharing (up to 5 users)',
        'Priority customer support'
      ]
    },
    {
      id: 'lifetime',
      name: 'Premium Lifetime',
      price: '$89.99',
      period: 'one-time',
      originalPrice: '$239.99',
      savings: 'Save 63%',
      badge: 'LIMITED TIME',
      storageAmount: '1TB',
      color: '#FF9500',
      features: [
        'Everything in Yearly',
        '1TB cloud storage',
        'Lifetime access - no recurring fees',
        'Future feature updates included',
        'Premium customer support',
        'Early access to new features',
        'Unlimited device sync',
        'Exclusive lifetime member benefits'
      ]
    }
  ];

  const freeFeatures = [
    'Up to 200 photos/videos',
    'Up to 3 secure vaults',
    'Local storage only',
    'Basic PIN/biometric lock',
    'Standard support'
  ];

  const handleSubscribe = async (planId: string) => {
    setIsLoading(true);
    
    try {
      await SubscriptionManager.activateSubscription(planId as 'monthly' | 'yearly' | 'lifetime');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const selectedPlanData = plans.find(p => p.id === planId);
      Alert.alert(
        '🎉 Welcome to Premium!',
        `Your ${selectedPlanData?.name} subscription is now active. Enjoy unlimited secure storage and advanced features!`,
        [
          {
            text: 'Get Started',
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert('No Purchases Found', 'No previous purchases were found for this account.');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueFree = () => {
    router.replace('/(tabs)');
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  const renderPlanCard = (plan: SubscriptionPlan) => (
    <Animated.View
      key={plan.id}
      style={[
        styles.planCard,
        selectedPlan === plan.id && styles.selectedPlan,
        plan.popular && styles.popularPlan,
        { 
          borderColor: selectedPlan === plan.id ? plan.color : 'transparent',
          transform: plan.popular ? [{ scale: pulseAnim }] : undefined
        }
      ]}
    >
      <TouchableOpacity
        onPress={() => setSelectedPlan(plan.id)}
        style={styles.planCardContent}
      >
        {plan.badge && (
          <View style={[styles.planBadge, { backgroundColor: plan.color }]}>
            <Text style={styles.planBadgeText}>{plan.badge}</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <View style={styles.planTitleContainer}>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.storageContainer}>
              <Cloud size={16} color={plan.color} />
              <Text style={[styles.storageText, { color: plan.color }]}>
                {plan.storageAmount} Storage
              </Text>
            </View>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
            <Text style={styles.planPeriod}>{plan.period}</Text>
          </View>
        </View>

        {plan.originalPrice && (
          <View style={styles.savingsContainer}>
            <Text style={styles.originalPrice}>{plan.originalPrice}</Text>
            <View style={[styles.savingsBadge, { backgroundColor: `${plan.color}20` }]}>
              <Text style={[styles.savings, { color: plan.color }]}>{plan.savings}</Text>
            </View>
          </View>
        )}

        <View style={styles.featuresPreview}>
          {plan.features.slice(0, 3).map((feature, index) => (
            <View key={index} style={styles.featurePreviewItem}>
              <Check size={14} color={plan.color} />
              <Text style={styles.featurePreviewText}>{feature}</Text>
            </View>
          ))}
          {plan.features.length > 3 && (
            <Text style={[styles.moreFeatures, { color: plan.color }]}>
              +{plan.features.length - 3} more features
            </Text>
          )}
        </View>

        <View style={[
          styles.radioButton,
          selectedPlan === plan.id && { borderColor: plan.color }
        ]}>
          {selectedPlan === plan.id && (
            <View style={[styles.radioButtonInner, { backgroundColor: plan.color }]} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {!isFirstLaunch && (
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Crown size={40} color="#FFD700" />
            <Sparkles size={20} color="#FFD700" style={styles.sparkle1} />
            <Sparkles size={16} color="#FFD700" style={styles.sparkle2} />
            <Sparkles size={14} color="#FFD700" style={styles.sparkle3} />
          </View>
          <Text style={styles.headerTitle}>Unlock Vaultify Premium</Text>
          <Text style={styles.headerSubtitle}>
            {isFirstLaunch 
              ? 'Choose your plan to secure your memories with military-grade protection'
              : 'Upgrade to premium for unlimited storage and advanced security'
            }
          </Text>
        </View>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Value Proposition */}
        <Animated.View 
          style={[
            styles.valueSection,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.valueTitle}>Why Choose Premium?</Text>
          <View style={styles.valueGrid}>
            <View style={styles.valueItem}>
              <View style={[styles.valueIcon, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                <Infinity size={24} color="#007AFF" />
              </View>
              <Text style={styles.valueItemTitle}>Unlimited Storage</Text>
              <Text style={styles.valueItemText}>Never worry about running out of space</Text>
            </View>
            
            <View style={styles.valueItem}>
              <View style={[styles.valueIcon, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                <Shield size={24} color="#34C759" />
              </View>
              <Text style={styles.valueItemTitle}>Military-Grade Security</Text>
              <Text style={styles.valueItemText}>AES-256 encryption with 2FA protection</Text>
            </View>
            
            <View style={styles.valueItem}>
              <View style={[styles.valueIcon, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                <Camera size={24} color="#FF9500" />
              </View>
              <Text style={styles.valueItemTitle}>Break-in Detection</Text>
              <Text style={styles.valueItemText}>Automatic intruder photo capture</Text>
            </View>
            
            <View style={styles.valueItem}>
              <View style={[styles.valueIcon, { backgroundColor: 'rgba(175, 82, 222, 0.1)' }]}>
                <Users size={24} color="#AF52DE" />
              </View>
              <Text style={styles.valueItemTitle}>Family Sharing</Text>
              <Text style={styles.valueItemText}>Share with up to 5 family members</Text>
            </View>
          </View>
        </Animated.View>

        {/* Plan Selection */}
        <Animated.View 
          style={[
            styles.planSection,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          
          {plans.map(renderPlanCard)}
        </Animated.View>

        {/* Feature Comparison */}
        <Animated.View 
          style={[
            styles.comparisonSection,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.sectionTitle}>Free vs Premium</Text>
          
          <View style={styles.comparisonTable}>
            {/* Free Tier */}
            <View style={styles.tierColumn}>
              <View style={styles.tierHeader}>
                <Shield size={20} color="#8E8E93" />
                <Text style={styles.tierName}>Free</Text>
              </View>
              
              {freeFeatures.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Check size={16} color="#8E8E93" />
                  <Text style={styles.freeFeatureText}>{feature}</Text>
                </View>
              ))}
              
              {/* Show what's missing in free */}
              <View style={styles.featureRow}>
                <X size={16} color="#FF3B30" />
                <Text style={styles.missingFeatureText}>Cloud backup</Text>
              </View>
              <View style={styles.featureRow}>
                <X size={16} color="#FF3B30" />
                <Text style={styles.missingFeatureText}>Break-in detection</Text>
              </View>
              <View style={styles.featureRow}>
                <X size={16} color="#FF3B30" />
                <Text style={styles.missingFeatureText}>Advanced encryption</Text>
              </View>
            </View>

            {/* Premium Tier */}
            <View style={[styles.tierColumn, styles.premiumColumn]}>
              <View style={[styles.tierHeader, styles.premiumHeader]}>
                <Crown size={20} color="#FFD700" />
                <Text style={styles.premiumTierName}>Premium</Text>
              </View>
              
              {selectedPlanData?.features.slice(0, 8).map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Check size={16} color="#34C759" />
                  <Text style={styles.premiumFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Trust Indicators */}
        <Animated.View 
          style={[
            styles.trustSection,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.trustItem}>
            <Shield size={20} color="#34C759" />
            <Text style={styles.trustText}>Bank-level 256-bit encryption</Text>
          </View>
          <View style={styles.trustItem}>
            <Timer size={20} color="#FF9500" />
            <Text style={styles.trustText}>Cancel anytime, no questions asked</Text>
          </View>
          <View style={styles.trustItem}>
            <Star size={20} color="#FFD700" />
            <Text style={styles.trustText}>Trusted by 500,000+ users worldwide</Text>
          </View>
          <View style={styles.trustItem}>
            <Gift size={20} color="#AF52DE" />
            <Text style={styles.trustText}>30-day money-back guarantee</Text>
          </View>
        </Animated.View>

        {/* Testimonials */}
        <Animated.View 
          style={[
            styles.testimonialsSection,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.sectionTitle}>What Users Say</Text>
          <View style={styles.testimonial}>
            <Text style={styles.testimonialText}>
              "The break-in detection saved my photos when someone tried to access my phone. Worth every penny!"
            </Text>
            <Text style={styles.testimonialAuthor}>- Sarah M., Premium User</Text>
          </View>
          <View style={styles.testimonial}>
            <Text style={styles.testimonialText}>
              "Family sharing is amazing. We can all backup our photos securely in one place."
            </Text>
            <Text style={styles.testimonialAuthor}>- Mike R., Yearly Subscriber</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Action */}
      <Animated.View 
        style={[
          styles.bottomSection,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.subscribeButton, 
            { backgroundColor: selectedPlanData?.color || '#007AFF' },
            isLoading && styles.loadingButton
          ]}
          onPress={() => handleSubscribe(selectedPlan)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.subscribeButtonText}>Processing...</Text>
          ) : (
            <>
              <Text style={styles.subscribeButtonText}>
                Start {selectedPlanData?.name}
              </Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
        
        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={handleRestorePurchases}>
            <Text style={styles.linkText}>Restore Purchases</Text>
          </TouchableOpacity>
          <Text style={styles.linkSeparator}>•</Text>
          <TouchableOpacity>
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.linkSeparator}>•</Text>
          <TouchableOpacity>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.disclaimer}>
          {isFirstLaunch 
            ? 'You can always start with the free plan and upgrade later.'
            : 'Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.'
          }
        </Text>
        
        {isFirstLaunch && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinueFree}
          >
            <Text style={styles.continueButtonText}>Continue with Free Plan</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: 'linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)',
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 20,
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
    top: 5,
    left: -15,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  valueSection: {
    marginBottom: 40,
  },
  valueTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  valueItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  valueIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  valueItemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  valueItemText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  planSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  selectedPlan: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  popularPlan: {
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  planCardContent: {
    padding: 24,
  },
  planBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomLeftRadius: 12,
  },
  planBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    marginTop: 20,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  storageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  planPeriod: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  originalPrice: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textDecorationLine: 'line-through',
    marginRight: 12,
  },
  savingsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savings: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  featuresPreview: {
    marginBottom: 20,
  },
  featurePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featurePreviewText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginLeft: 10,
    flex: 1,
  },
  moreFeatures: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginTop: 4,
    marginLeft: 24,
  },
  radioButton: {
    position: 'absolute',
    top: 24,
    left: 24,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  comparisonSection: {
    marginBottom: 40,
  },
  comparisonTable: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tierColumn: {
    flex: 1,
    padding: 20,
  },
  premiumColumn: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 215, 0, 0.2)',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#48484A',
  },
  premiumHeader: {
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  tierName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  premiumTierName: {
    color: '#FFD700',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  freeFeatureText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  premiumFeatureText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  missingFeatureText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginLeft: 8,
    flex: 1,
    textDecorationLine: 'line-through',
  },
  trustSection: {
    marginBottom: 40,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center',
  },
  trustText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
    marginLeft: 8,
  },
  testimonialsSection: {
    marginBottom: 20,
  },
  testimonial: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  testimonialText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  testimonialAuthor: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  subscribeButton: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingButton: {
    backgroundColor: '#48484A',
  },
  subscribeButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  bottomLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  linkSeparator: {
    fontSize: 14,
    color: '#8E8E93',
    marginHorizontal: 8,
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 16,
  },
  continueButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#48484A',
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
    textAlign: 'center',
  },
});