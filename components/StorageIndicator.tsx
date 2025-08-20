import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Cloud, HardDrive, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { SubscriptionManager } from '@/utils/SubscriptionManager';

interface StorageIndicatorProps {
  compact?: boolean;
  showUpgradePrompt?: boolean;
}

export default function StorageIndicator({ compact = false, showUpgradePrompt = true }: StorageIndicatorProps) {
  const router = useRouter();
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const info = await SubscriptionManager.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to load storage info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    router.push('/paywall');
  };

  const formatStorage = (gb: number): string => {
    if (gb < 1) {
      return `${(gb * 1024).toFixed(0)}MB`;
    }
    return `${gb.toFixed(1)}GB`;
  };

  const getStorageColor = (): string => {
    if (storageInfo.percentage >= 90) return '#FF3B30';
    if (storageInfo.percentage >= 75) return '#FF9500';
    return '#34C759';
  };

  const getStorageIcon = () => {
    if (storageInfo.total === 0) {
      return <HardDrive size={compact ? 16 : 20} color="#8E8E93" />;
    }
    
    if (storageInfo.percentage >= 90) {
      return <AlertTriangle size={compact ? 16 : 20} color="#FF3B30" />;
    }
    
    return <Cloud size={compact ? 16 : 20} color={getStorageColor()} />;
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (storageInfo.total === 0) {
    // Free plan - no cloud storage
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={styles.storageHeader}>
          {getStorageIcon()}
          <Text style={[styles.storageTitle, compact && styles.compactTitle]}>
            Local Storage Only
          </Text>
        </View>
        {!compact && (
          <Text style={styles.storageSubtitle}>
            Upgrade to Premium for cloud backup
          </Text>
        )}
        {showUpgradePrompt && (
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>
              {compact ? 'Upgrade' : 'Get Cloud Storage'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View style={styles.storageHeader}>
        {getStorageIcon()}
        <View style={styles.storageInfo}>
          <Text style={[styles.storageTitle, compact && styles.compactTitle]}>
            Cloud Storage
          </Text>
          {!compact && (
            <Text style={styles.storageUsage}>
              {formatStorage(storageInfo.used)} of {formatStorage(storageInfo.total)} used
            </Text>
          )}
        </View>
        {compact && (
          <Text style={styles.compactUsage}>
            {storageInfo.percentage.toFixed(0)}%
          </Text>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(storageInfo.percentage, 100)}%`,
                backgroundColor: getStorageColor()
              }
            ]} 
          />
        </View>
        {!compact && (
          <Text style={[styles.percentageText, { color: getStorageColor() }]}>
            {storageInfo.percentage.toFixed(1)}%
          </Text>
        )}
      </View>

      {!compact && storageInfo.percentage >= 75 && (
        <View style={styles.warningContainer}>
          <AlertTriangle size={16} color="#FF9500" />
          <Text style={styles.warningText}>
            {storageInfo.percentage >= 90 
              ? 'Storage almost full. Consider upgrading your plan.'
              : 'Storage getting full. Monitor your usage.'
            }
          </Text>
        </View>
      )}

      {!compact && storageInfo.percentage >= 90 && showUpgradePrompt && (
        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
          <Text style={styles.upgradeButtonText}>Upgrade Storage</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  compactContainer: {
    padding: 12,
    marginVertical: 4,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageInfo: {
    flex: 1,
    marginLeft: 12,
  },
  storageTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  compactTitle: {
    fontSize: 14,
    marginBottom: 0,
  },
  storageUsage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  compactUsage: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8E8E93',
  },
  storageSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#48484A',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    minWidth: 45,
    textAlign: 'right',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FF9500',
    marginLeft: 8,
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
});