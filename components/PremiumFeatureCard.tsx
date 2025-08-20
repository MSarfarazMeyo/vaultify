import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Zap, Shield, Star, Lock, ArrowRight } from 'lucide-react-native';

interface PremiumFeatureCardProps {
  title: string;
  description: string;
  features: string[];
  showUpgrade?: boolean;
  compact?: boolean;
}

export default function PremiumFeatureCard({ 
  title, 
  description, 
  features, 
  showUpgrade = true,
  compact = false
}: PremiumFeatureCardProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push('/paywall');
  };

  if (compact) {
    return (
      <View style={[styles.container, styles.compactContainer]}>
        <View style={styles.compactHeader}>
          <View style={styles.compactIconContainer}>
            <Crown size={20} color="#FFD700" />
          </View>
          <View style={styles.compactHeaderText}>
            <Text style={styles.compactTitle}>{title}</Text>
            <Text style={styles.compactDescription}>{description}</Text>
          </View>
          {showUpgrade && (
            <TouchableOpacity 
              style={styles.compactUpgradeButton} 
              onPress={handleUpgrade}
            >
              <ArrowRight size={16} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Crown size={24} color="#FFD700" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>

      <View style={styles.featuresContainer}>
        {features.slice(0, 3).map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Zap size={16} color="#FFD700" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
        {features.length > 3 && (
          <Text style={styles.moreFeatures}>
            +{features.length - 3} more features
          </Text>
        )}
      </View>

      {showUpgrade && (
        <TouchableOpacity 
          style={styles.upgradeButton} 
          onPress={handleUpgrade}
        >
          <Shield size={16} color="#FFFFFF" />
          <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  compactContainer: {
    padding: 16,
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  compactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  compactHeaderText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  compactTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  compactDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  moreFeatures: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFD700',
    marginTop: 4,
    marginLeft: 28,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  compactUpgradeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginHorizontal: 8,
  },
});