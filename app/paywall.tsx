import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
  Linking,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import Purchases, {
  PurchasesPackage,
  PurchasesOffering,
  CustomerInfo,
} from 'react-native-purchases';
import {
  Shield,
  Crown,
  Check,
  X,
  Star,
  Zap,
  Cloud,
  Camera,
  Lock,
  Eye,
  Sparkles,
  ArrowRight,
  Users,
  Infinity,
  Timer,
  Gift,
} from 'lucide-react-native';
import SecureStore from '@/utils/secureStorage';
import FeaturesPreview from '@/components/FeaturesPreview';
import { SubscriptionManager } from '@/utils/SubscriptionManager';
import RevenueCatUI from 'react-native-purchases-ui';

const { width, height } = Dimensions.get('window');

interface DynamicSubscriptionPlan {
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
  packageObject: PurchasesPackage;
}

export default function PaywallScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [showAnnualSavings, setShowAnnualSavings] = useState(true);
  const [plans, setPlans] = useState<DynamicSubscriptionPlan[]>([]);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkIfFirstLaunch();
    loadOfferings();
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

  const openCustomerCenter = async () => {
    try {
      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onRestoreCompleted: async ({ customerInfo }) => {},
          onRefundRequestCompleted: async () => {},
        },
      });

      await SubscriptionManager.handleSubscriptionUpdate();
      router.back();

      // After user closes Customer Center, reload subscription data to catch any changes (cancel/refund/etc)
    } catch (error) {
      console.error('Error presenting customer center:', error);
      router.back();
    }
  };

  const loadOfferings = async () => {
    try {
      setIsLoadingOfferings(true);

      const customerInfo: any =
        (await SubscriptionManager.handleSubscriptionUpdate()) || {};

      const hasActiveSubscription = customerInfo.activeSubscriptions.length > 0;
      const hasNonSubscriptionPurchases =
        customerInfo.nonSubscriptionTransactions.length > 0;
      const hasActiveEntitlements =
        Object.keys(customerInfo.entitlements.active).length > 0;

      if (hasNonSubscriptionPurchases && hasActiveEntitlements) {
        Alert.alert('Purchase Found', 'You already have an active Purchase.', [
          {
            text: 'Manage Purchases',
            onPress: () => openCustomerCenter(),
          },
          {
            text: 'Go Back',
            style: 'cancel',
            onPress: () => router.back(),
          },
        ]);
      } else if (hasActiveSubscription && hasActiveEntitlements) {
        // User already has a purchase - redirect to management screen
        Alert.alert(
          'Subscription Found',
          'You already have an active subscription.',
          [
            {
              text: 'Manage Subscription',
              onPress: () => openCustomerCenter(),
            },
            {
              text: 'Go Back',
              style: 'cancel',
              onPress: () => router.back(),
            },
          ]
        );
      }

      // Get available offerings
      const offerings = await Purchases.getOfferings();

      if (offerings.current) {
        const currentOffering = offerings.current;
        setOffering(currentOffering);

        // Transform RevenueCat packages into our plan format
        const dynamicPlans = transformPackagesToPlans(
          currentOffering.availablePackages
        );
        setPlans([...dynamicPlans].reverse());

        // Auto-select the most popular plan or first plan
        const popularPlan = dynamicPlans.find((p) => p.popular);
        setSelectedPlan(popularPlan?.id || dynamicPlans[0]?.id || '');

        return;
      } else {
        Alert.alert(
          'Error',
          'No subscription plans available. Please try again later.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
      Alert.alert(
        'Error',
        'Failed to load subscription plans. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: loadOfferings },
          { text: 'Cancel', onPress: () => router.back() },
        ]
      );
    } finally {
      setIsLoadingOfferings(false);
      startAnimations();
    }
  };

  const transformPackagesToPlans = (
    packages: PurchasesPackage[]
  ): DynamicSubscriptionPlan[] => {
    return packages.map((pkg, index) => {
      const identifier = pkg.identifier.toLowerCase();
      const productId = pkg.product.identifier.toLowerCase();

      // Determine plan type based on package identifier or product ID
      let planType: 'monthly' | 'yearly' | 'lifetime' = 'monthly';
      if (
        identifier.includes('annual') ||
        identifier.includes('yearly') ||
        productId.includes('yearly')
      ) {
        planType = 'yearly';
      } else if (
        identifier.includes('lifetime') ||
        productId.includes('lifetime')
      ) {
        planType = 'lifetime';
      }

      // Format price
      const price = pkg.product.priceString;
      const period =
        planType === 'lifetime'
          ? 'one-time'
          : planType === 'yearly'
          ? '/year'
          : '/month';

      // Calculate savings for annual plans
      let originalPrice: string | undefined;
      let savings: string | undefined;

      if (planType === 'yearly') {
        // Find monthly equivalent to calculate savings
        const monthlyPkg = packages.find(
          (p) =>
            p.identifier.toLowerCase().includes('monthly') ||
            p.product.identifier.toLowerCase().includes('monthly')
        );

        if (monthlyPkg) {
          const monthlyPrice = monthlyPkg.product.price;
          const yearlyPrice = pkg.product.price;
          const annualEquivalent = monthlyPrice * 12;

          if (yearlyPrice < annualEquivalent) {
            originalPrice = `$${annualEquivalent.toFixed(2)}`;
            const savingsPercent = Math.round(
              ((annualEquivalent - yearlyPrice) / annualEquivalent) * 100
            );
            savings = `Save ${savingsPercent}%`;
          }
        }
      }

      // Determine if this should be marked as popular (usually the yearly plan)
      const isPopular = planType === 'yearly';

      // Set colors and storage based on plan type
      const colors = {
        monthly: '#007AFF',
        yearly: '#34C759',
        lifetime: '#FF9500',
      };

      const storage = {
        monthly: '100GB',
        yearly: '500GB',
        lifetime: '1TB',
      };

      const badges = {
        monthly: undefined,
        yearly: 'BEST VALUE',
        lifetime: 'LIMITED TIME',
      };

      return {
        id: pkg.identifier,
        name: `Premium ${planType.charAt(0).toUpperCase() + planType.slice(1)}`,
        price,
        period,
        originalPrice,
        savings,
        popular: isPopular,
        badge: badges[planType],
        storageAmount: storage[planType],
        color: colors[planType],
        packageObject: pkg,
        features: getPlanFeatures(planType),
      };
    });
  };

  const getPlanFeatures = (
    planType: 'monthly' | 'yearly' | 'lifetime'
  ): string[] => {
    const baseFeatures = [
      'Unlimited vaults',
      'Cloud backup and sync',
      'Enhanced security settings',
      'Priority support',
      'No ads',
    ];

    const yearlyFeatures = [
      ...baseFeatures,
      'Best value - save 40%',
      'Advanced vault management',
      'Export vault data',
      'Early access to new features',
    ];

    const lifetimeFeatures = [
      ...yearlyFeatures.filter((f) => !f.includes('save 40%')),
      'Lifetime access - no recurring fees',
      'All future updates included',
      'Premium member benefits',
      'Unlimited cloud storage',
    ];

    switch (planType) {
      case 'yearly':
        return yearlyFeatures;
      case 'lifetime':
        return lifetimeFeatures;
      default:
        return baseFeatures;
    }
  };

  const freeFeatures = [
    'Up to 3 secure vaults',
    'All item types supported',
    'Basic security features',
    'Local storage only',
    'Standard support',
  ];

  const handleSubscribe = async (planId: string) => {
    setIsLoading(true);

    try {
      const selectedPlanData = plans.find((p) => p.id === planId);
      if (!selectedPlanData) {
        throw new Error('Selected plan not found');
      }
      // Make the purchase through RevenueCat
      const { customerInfo } = await Purchases.purchasePackage(
        selectedPlanData.packageObject
      );

      // Check if the purchase was successful
      if (
        customerInfo.activeSubscriptions.length > 0 ||
        customerInfo.nonSubscriptionTransactions.length > 0
      ) {
        // Mark that user has seen paywall
        await SecureStore.setItemAsync('has_seen_paywall', 'true');

        try {
          const identifier =
            selectedPlanData?.packageObject.identifier.toLowerCase();
          const productId =
            selectedPlanData?.packageObject.product.identifier.toLowerCase();

          // Determine plan type based on package identifier or product ID
          let planType: 'monthly' | 'yearly' | 'lifetime' = 'monthly';
          if (
            identifier.includes('annual') ||
            identifier.includes('yearly') ||
            productId.includes('yearly')
          ) {
            planType = 'yearly';
          } else if (
            identifier.includes('lifetime') ||
            productId.includes('lifetime')
          ) {
            planType = 'lifetime';
          }
          const canAdd = await SubscriptionManager.activateSubscription(
            planType
          );
        } catch (error) {
          console.log(error);
        }

        Alert.alert(
          '🎉 Welcome to Premium!',
          `Your ${selectedPlanData.name} subscription is now active. Enjoy unlimited secure storage and advanced features!`,
          [
            {
              text: 'Get Started',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        throw new Error('Purchase was not completed successfully');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);

      // Handle different error types
      if (error.userCancelled) {
        // User cancelled the purchase - no need to show error
        return;
      }

      let errorMessage = 'Failed to process subscription. Please try again.';

      if (error.code === 'PAYMENT_PENDING') {
        errorMessage =
          'Payment is pending. You will receive access once payment is confirmed.';
      } else if (error.code === 'PRODUCT_ALREADY_PURCHASED') {
        errorMessage = 'You already own this subscription.';
        // Try to restore purchases
        await handleRestorePurchases();
        return;
      }

      Alert.alert('Purchase Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsLoading(true);

    try {
      // Restore purchases through RevenueCat
      const customerInfo = await Purchases.restorePurchases();

      if (
        customerInfo.activeSubscriptions.length > 0 ||
        customerInfo.nonSubscriptionTransactions.length > 0
      ) {
        await SubscriptionManager.handleSubscriptionUpdate();

        Alert.alert(
          'Purchases Restored',
          'Your subscription has been restored successfully!',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases were found for this account.'
        );
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueFree = async () => {
    await SecureStore.setItemAsync('has_seen_paywall', 'true');
    router.replace('/(tabs)');
  };

  const selectedPlanData = plans.find((p) => p.id === selectedPlan);

  const renderPlanCard = (plan: DynamicSubscriptionPlan) => (
    <Animated.View
      key={plan.id}
      style={[
        styles.planCard,
        selectedPlan === plan.id && styles.selectedPlan,
        plan.popular && styles.popularPlan,
        {
          borderColor: selectedPlan === plan.id ? plan.color : 'transparent',
          transform: plan.popular ? [{ scale: pulseAnim }] : undefined,
        },
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
            <Text style={[styles.planPrice, { color: plan.color }]}>
              {plan.price}
            </Text>
            <Text style={styles.planPeriod}>{plan.period}</Text>
          </View>
        </View>

        {plan.originalPrice && (
          <View style={styles.savingsContainer}>
            <Text style={styles.originalPrice}>{plan.originalPrice}</Text>
            <View
              style={[
                styles.savingsBadge,
                { backgroundColor: `${plan.color}20` },
              ]}
            >
              <Text style={[styles.savings, { color: plan.color }]}>
                {plan.savings}
              </Text>
            </View>
          </View>
        )}

        <FeaturesPreview plan={plan} />

        <View
          style={[
            styles.radioButton,
            selectedPlan === plan.id && { borderColor: plan.color },
          ]}
        >
          {selectedPlan === plan.id && (
            <View
              style={[styles.radioButtonInner, { backgroundColor: plan.color }]}
            />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Loading state while fetching offerings
  if (isLoadingOfferings) {
    return (
      <View style={styles.loadingContainer}>
        <Crown size={40} color="#FFD700" />
        <Text style={styles.loadingText}>Loading subscription plans...</Text>
      </View>
    );
  }

  // No plans available
  if (plans.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <X size={40} color="#FF3B30" />
        <Text style={styles.errorText}>No subscription plans available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOfferings}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
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
              : 'Upgrade to premium for unlimited storage and advanced security'}
          </Text>
        </View>
      </Animated.View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Value Proposition */}
        <Animated.View style={[styles.valueSection, { opacity: fadeAnim }]}>
          <Text style={styles.valueTitle}>Why Choose Premium?</Text>
          <View style={styles.valueGrid}>
            <View style={styles.valueItem}>
              <View
                style={[
                  styles.valueIcon,
                  { backgroundColor: 'rgba(0, 122, 255, 0.1)' },
                ]}
              >
                <Infinity size={24} color="#007AFF" />
              </View>
              <Text style={styles.valueItemTitle}>Unlimited Storage</Text>
              <Text style={styles.valueItemText}>
                Never worry about running out of space
              </Text>
            </View>

            <View style={styles.valueItem}>
              <View
                style={[
                  styles.valueIcon,
                  { backgroundColor: 'rgba(52, 199, 89, 0.1)' },
                ]}
              >
                <Shield size={24} color="#34C759" />
              </View>
              <Text style={styles.valueItemTitle}>Enhanced Security</Text>
              <Text style={styles.valueItemText}>
                Advanced security settings and features
              </Text>
            </View>

            <View style={styles.valueItem}>
              <View
                style={[
                  styles.valueIcon,
                  { backgroundColor: 'rgba(255, 149, 0, 0.1)' },
                ]}
              >
                <Camera size={24} color="#FF9500" />
              </View>
              <Text style={styles.valueItemTitle}>Cloud Backup</Text>
              <Text style={styles.valueItemText}>
                Secure cloud storage and sync
              </Text>
            </View>

            <View style={styles.valueItem}>
              <View
                style={[
                  styles.valueIcon,
                  { backgroundColor: 'rgba(175, 82, 222, 0.1)' },
                ]}
              >
                <Users size={24} color="#AF52DE" />
              </View>
              <Text style={styles.valueItemTitle}>Priority Support</Text>
              <Text style={styles.valueItemText}>
                Get help when you need it most
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Plan Selection */}
        <Animated.View style={[styles.planSection, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>

          {plans.map(renderPlanCard)}
        </Animated.View>

        {/* Feature Comparison */}
        <Animated.View
          style={[styles.comparisonSection, { opacity: fadeAnim }]}
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
                <Text style={styles.missingFeatureText}>
                  Break-in detection
                </Text>
              </View>
              <View style={styles.featureRow}>
                <X size={16} color="#FF3B30" />
                <Text style={styles.missingFeatureText}>
                  Advanced encryption
                </Text>
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
        <Animated.View style={[styles.trustSection, { opacity: fadeAnim }]}>
          <View style={styles.trustItem}>
            <Shield size={20} color="#34C759" />
            <Text style={styles.trustText}>Bank-level 256-bit encryption</Text>
          </View>
          <View style={styles.trustItem}>
            <Timer size={20} color="#FF9500" />
            <Text style={styles.trustText}>
              Cancel anytime, no questions asked
            </Text>
          </View>
          <View style={styles.trustItem}>
            <Star size={20} color="#FFD700" />
            <Text style={styles.trustText}>
              Trusted by 500,000+ users worldwide
            </Text>
          </View>
          <View style={styles.trustItem}>
            <Gift size={20} color="#AF52DE" />
            <Text style={styles.trustText}>30-day money-back guarantee</Text>
          </View>
        </Animated.View>

        {/* Testimonials */}
        <Animated.View
          style={[styles.testimonialsSection, { opacity: fadeAnim }]}
        >
          <Text style={styles.sectionTitle}>What Users Say</Text>
          <View style={styles.testimonial}>
            <Text style={styles.testimonialText}>
              "The break-in detection saved my photos when someone tried to
              access my phone. Worth every penny!"
            </Text>
            <Text style={styles.testimonialAuthor}>
              - Sarah M., Premium User
            </Text>
          </View>
          <View style={styles.testimonial}>
            <Text style={styles.testimonialText}>
              "Family sharing is amazing. We can all backup our photos securely
              in one place."
            </Text>
            <Text style={styles.testimonialAuthor}>
              - Mike R., Yearly Subscriber
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Action */}
      <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[
            styles.subscribeButton,
            { backgroundColor: selectedPlanData?.color || '#007AFF' },
            isLoading && styles.loadingButton,
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
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
              )
            }
          >
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.linkSeparator}>•</Text>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                'https://www.privacypolicies.com/live/ffb87454-127b-499f-bc46-7d143e29a918'
              )
            }
          >
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          {isFirstLaunch
            ? 'You can always start with the free plan and upgrade later.'
            : 'Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.'}
        </Text>

        {isFirstLaunch && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinueFree}
          >
            <Text style={styles.continueButtonText}>
              Continue with Free Plan
            </Text>
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
    top: 12,
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
