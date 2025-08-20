import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Lock, ArrowRight, X } from 'lucide-react-native';
import { SubscriptionManager } from '@/utils/SubscriptionManager';

interface SubscriptionGateProps {
  feature: string;
  title: string;
  description: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function SubscriptionGate({ 
  feature, 
  title, 
  description, 
  children, 
  fallback 
}: SubscriptionGateProps) {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [feature]);

  const checkAccess = async () => {
    try {
      const access = await SubscriptionManager.hasFeature(feature);
      setHasAccess(access);
    } catch (error) {
      console.error('Failed to check feature access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    setShowPaywall(false);
    router.push('/paywall');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <TouchableOpacity 
        style={styles.gateContainer}
        onPress={() => setShowPaywall(true)}
      >
        <View style={styles.gateContent}>
          <View style={styles.gateIcon}>
            <Crown size={24} color="#FFD700" />
          </View>
          <View style={styles.gateText}>
            <Text style={styles.gateTitle}>{title}</Text>
            <Text style={styles.gateDescription}>{description}</Text>
          </View>
          <ArrowRight size={20} color="#FFD700" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showPaywall}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaywall(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowPaywall(false)}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Crown size={32} color="#FFD700" />
              </View>
              <Text style={styles.modalTitle}>Premium Feature</Text>
              <Text style={styles.modalSubtitle}>{description}</Text>
            </View>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Lock size={16} color="#34C759" />
                <Text style={styles.benefitText}>Advanced security features</Text>
              </View>
              <View style={styles.benefitItem}>
                <Crown size={16} color="#FFD700" />
                <Text style={styles.benefitText}>Unlimited storage</Text>
              </View>
              <View style={styles.benefitItem}>
                <ArrowRight size={16} color="#007AFF" />
                <Text style={styles.benefitText}>Priority support</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={handleUpgrade}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  gateContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  gateContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gateText: {
    flex: 1,
  },
  gateTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gateDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
  benefitsList: {
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginRight: 8,
  },
});