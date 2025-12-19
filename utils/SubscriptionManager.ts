import Purchases from 'react-native-purchases';
import SecureStore from './secureStorage';
import { SecurityManager } from './SecurityManager';

export interface SubscriptionStatus {
  isActive: boolean;
  plan: 'free' | 'monthly' | 'yearly' | 'lifetime';
  expiresAt?: number;
  features: string[];
}

export interface SubscriptionLimits {
  maxPhotos: number;
  maxVideos: number;
  maxAudio: number;
  maxVaults: number;
  cloudStorageGB: number;
  cloudBackup: boolean;
  breakInDetection: boolean;
  advancedEncryption: boolean;
  steganography: boolean;
  prioritySupport: boolean;
  familySharing: boolean;
}

export class SubscriptionManager {
  private static readonly SUBSCRIPTION_KEY = 'subscription_status';
  private static readonly USAGE_KEY = 'usage_stats';

  static async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const encryptedStatus = await SecureStore.getItemAsync(
        this.SUBSCRIPTION_KEY
      );
      if (!encryptedStatus) {
        return this.getDefaultFreeStatus();
      }

      try {
        const decryptedStatus = await SecurityManager.decryptData(
          encryptedStatus
        );
        return JSON.parse(decryptedStatus);
      } catch (decryptError) {
        console.warn(
          'Failed to decrypt subscription status, returning free status:',
          decryptError
        );
        // Clear corrupted data and return free status
        await SecureStore.deleteItemAsync(this.SUBSCRIPTION_KEY);
        return this.getDefaultFreeStatus();
      }
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return this.getDefaultFreeStatus();
    }
  }

  static async updateSubscriptionStatus(
    status: SubscriptionStatus
  ): Promise<boolean> {
    try {
      const encryptedStatus = await SecurityManager.encryptData(
        JSON.stringify(status)
      );
      await SecureStore.setItemAsync(this.SUBSCRIPTION_KEY, encryptedStatus);

      SecurityManager.logSecurityEvent('subscription_updated', {
        plan: status.plan,
        isActive: status.isActive,
      });

      return true;
    } catch (error) {
      console.error('Failed to update subscription status:', error);
      return false;
    }
  }

  static async activateSubscription(
    plan: 'monthly' | 'yearly' | 'lifetime'
  ): Promise<boolean> {
    try {
      const expiresAt =
        plan === 'lifetime'
          ? undefined
          : plan === 'yearly'
          ? Date.now() + 365 * 24 * 60 * 60 * 1000
          : Date.now() + 30 * 24 * 60 * 60 * 1000;

      const status: SubscriptionStatus = {
        isActive: true,
        plan,
        expiresAt,
        features: this.getPremiumFeatures(),
      };

      const success = await this.updateSubscriptionStatus(status);

      if (success) {
        SecurityManager.logSecurityEvent('subscription_activated', { plan });
      }

      return success;
    } catch (error) {
      console.error('Failed to activate subscription:', error);
      return false;
    }
  }

  static async cancelSubscription(): Promise<boolean> {
    try {
      const currentStatus = await this.getSubscriptionStatus();
      const status: SubscriptionStatus = {
        ...currentStatus,
        isActive: false,
        features: this.getFreeFeatures(),
      };

      return await this.updateSubscriptionStatus(status);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return false;
    }
  }

  static async checkSubscriptionExpiry(): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus();

      if (!status.isActive || status.plan === 'lifetime') {
        return status.isActive;
      }

      if (status.expiresAt && Date.now() > status.expiresAt) {
        // Subscription expired, downgrade to free
        await this.cancelSubscription();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check subscription expiry:', error);
      return false;
    }
  }

  static async getSubscriptionLimits(): Promise<SubscriptionLimits> {
    const status = await this.getSubscriptionStatus();
    const isActive = await this.checkSubscriptionExpiry();

    if (isActive && status.plan !== 'free') {
      // Different storage limits based on plan
      const cloudStorageGB =
        status.plan === 'monthly' ? 100 : status.plan === 'yearly' ? 500 : 1000; // lifetime gets 1TB

      return {
        maxPhotos: -1, // Unlimited count
        maxVideos: -1, // Unlimited count
        maxAudio: -1, // Unlimited count
        maxVaults: -1, // Unlimited count
        cloudStorageGB,
        cloudBackup: true,
        breakInDetection: true,
        advancedEncryption: true,
        steganography: true,
        prioritySupport: true,
        familySharing: status.plan === 'yearly' || status.plan === 'lifetime',
      };
    }

    return {
      maxPhotos: 200,
      maxVideos: 50,
      maxAudio: 100,
      maxVaults: 3,
      cloudStorageGB: 0, // No cloud storage for free
      cloudBackup: false,
      breakInDetection: false,
      advancedEncryption: false,
      steganography: false,
      prioritySupport: false,
      familySharing: false,
    };
  }

  static async canCreateVault(): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const limits = await this.getSubscriptionLimits();

    if (limits.maxVaults === -1) {
      return { allowed: true };
    }

    const usage = await this.getUsageStats();
    if (usage.vaultCount >= limits.maxVaults) {
      return {
        allowed: false,
        reason: `Free plan limited to ${limits.maxVaults} vaults. Upgrade to Premium for unlimited vaults and advanced security features.`,
      };
    }

    return { allowed: true };
  }

  static async canAddPhoto(): Promise<{ allowed: boolean; reason?: string }> {
    const limits = await this.getSubscriptionLimits();

    if (limits.maxPhotos === -1) {
      return { allowed: true };
    }

    const usage = await this.getUsageStats();
    if (usage.photoCount >= limits.maxPhotos) {
      return {
        allowed: false,
        reason: `Free plan limited to ${limits.maxPhotos} photos. Upgrade to Premium for unlimited storage.`,
      };
    }

    return { allowed: true };
  }

  static async canAddVideo(): Promise<{ allowed: boolean; reason?: string }> {
    const limits = await this.getSubscriptionLimits();

    if (limits.maxVideos === -1) {
      return { allowed: true };
    }

    const usage: any = await this.getUsageStats();
    if (usage.videoCount >= limits.maxVideos) {
      return {
        allowed: false,
        reason: `Free plan limited to ${limits.maxVideos} videos. Upgrade to Premium for unlimited storage.`,
      };
    }

    return { allowed: true };
  }

  static async canAddAudio(): Promise<{ allowed: boolean; reason?: string }> {
    const limits = await this.getSubscriptionLimits();

    if (limits.maxAudio === -1) {
      return { allowed: true };
    }

    const usage: any = await this.getUsageStats();
    if (usage.audioCount >= limits.maxAudio) {
      return {
        allowed: false,
        reason: `Free plan limited to ${limits.maxAudio} audio files. Upgrade to Premium for unlimited storage.`,
      };
    }

    return { allowed: true };
  }

  static async incrementUsage(
    type: 'photo' | 'video' | 'audio' | 'vault'
  ): Promise<void> {
    try {
      const usage = await this.getUsageStats();

      if (type === 'photo') {
        usage.photoCount++;
      } else if (type === 'video') {
        usage.videoCount++;
      } else if (type === 'audio') {
        usage.audioCount++;
      } else if (type === 'vault') {
        usage.vaultCount++;
      }

      const encryptedUsage = await SecurityManager.encryptData(
        JSON.stringify(usage)
      );
      await SecureStore.setItemAsync(this.USAGE_KEY, encryptedUsage);
    } catch (error) {
      console.error('Failed to increment usage:', error);
    }
  }

  static async decrementUsage(
    type: 'photo' | 'video' | 'audio' | 'vault'
  ): Promise<void> {
    try {
      const usage = await this.getUsageStats();

      if (type === 'photo' && usage.photoCount > 0) {
        usage.photoCount--;
      } else if (type === 'video' && usage.videoCount > 0) {
        usage.videoCount--;
      } else if (type === 'audio' && usage.audioCount > 0) {
        usage.audioCount--;
      } else if (type === 'vault' && usage.vaultCount > 0) {
        usage.vaultCount--;
      }

      const encryptedUsage = await SecurityManager.encryptData(
        JSON.stringify(usage)
      );
      await SecureStore.setItemAsync(this.USAGE_KEY, encryptedUsage);
    } catch (error) {
      console.error('Failed to decrement usage:', error);
    }
  }

  static async getUsageStats(): Promise<{
    photoCount: number;
    videoCount: number;
    audioCount: number;
    vaultCount: number;
    storageUsedGB: number;
  }> {
    try {
      const encryptedUsage = await SecureStore.getItemAsync(this.USAGE_KEY);
      if (!encryptedUsage) {
        return {
          photoCount: 0,
          videoCount: 0,
          audioCount: 0,
          vaultCount: 0,
          storageUsedGB: 0,
        };
      }

      try {
        const decryptedUsage = await SecurityManager.decryptData(
          encryptedUsage
        );
        return JSON.parse(decryptedUsage);
      } catch (decryptError) {
        console.warn(
          'Failed to decrypt usage stats, returning defaults:',
          decryptError
        );
        // Clear corrupted data and return defaults
        await SecureStore.deleteItemAsync(this.USAGE_KEY);
        return {
          photoCount: 0,
          videoCount: 0,
          audioCount: 0,
          vaultCount: 0,
          storageUsedGB: 0,
        };
      }
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return {
        photoCount: 0,
        videoCount: 0,
        audioCount: 0,
        vaultCount: 0,
        storageUsedGB: 0,
      };
    }
  }

  static async updateStorageUsage(sizeInBytes: number): Promise<void> {
    try {
      const usage = await this.getUsageStats();
      const sizeInGB = sizeInBytes / (1024 * 1024 * 1024);
      usage.storageUsedGB += sizeInGB;

      const encryptedUsage = await SecurityManager.encryptData(
        JSON.stringify(usage)
      );
      await SecureStore.setItemAsync(this.USAGE_KEY, encryptedUsage);
    } catch (error) {
      console.error('Failed to update storage usage:', error);
    }
  }

  static async canUploadFile(
    fileSizeBytes: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    const limits = await this.getSubscriptionLimits();

    if (limits.cloudStorageGB === 0) {
      return {
        allowed: false,
        reason:
          'Cloud storage not available on free plan. Upgrade to Premium for cloud backup.',
      };
    }

    const usage = await this.getUsageStats();
    const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);
    const totalAfterUpload = usage.storageUsedGB + fileSizeGB;

    if (totalAfterUpload > limits.cloudStorageGB) {
      const remainingGB = Math.max(
        0,
        limits.cloudStorageGB - usage.storageUsedGB
      );
      return {
        allowed: false,
        reason: `Not enough cloud storage. You have ${remainingGB.toFixed(
          2
        )}GB remaining of ${limits.cloudStorageGB}GB.`,
      };
    }

    return { allowed: true };
  }

  static async getStorageInfo(): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    const limits = await this.getSubscriptionLimits();
    const usage = await this.getUsageStats();

    const used = usage.storageUsedGB;
    const total = limits.cloudStorageGB;
    const percentage = total > 0 ? (used / total) * 100 : 0;

    return { used, total, percentage };
  }

  private static getDefaultFreeStatus(): SubscriptionStatus {
    return {
      isActive: false,
      plan: 'free',
      features: this.getFreeFeatures(),
    };
  }

  private static getFreeFeatures(): string[] {
    return [
      'Up to 200 photos',
      'Up to 50 videos',
      'Up to 100 audio files',
      'Up to 3 secure vaults',
      'Basic PIN/biometric lock',
      'Local storage only',
      'Standard support',
    ];
  }

  private static getPremiumFeatures(): string[] {
    return [
      'Unlimited vaults and media',
      'Advanced AES-256 encryption',
      'Cloud backup with 2FA',
      'Break-in photo capture',
      'Steganography hiding',
      'Priority support',
      'Advanced security analytics',
      'Custom vault themes',
      'Export to multiple formats',
      'Family sharing',
    ];
  }

  static async hasFeature(feature: string): Promise<boolean> {
    const status = await this.getSubscriptionStatus();
    const isActive = await this.checkSubscriptionExpiry();

    if (!isActive || status.plan === 'free') {
      return false;
    }

    const premiumFeatures = [
      'cloudBackup',
      'breakInDetection',
      'advancedEncryption',
      'steganography',
      'prioritySupport',
      'familySharing',
      'customThemes',
      'advancedAnalytics',
    ];

    return premiumFeatures.includes(feature);
  }

  static async hasFamilySharing(): Promise<boolean> {
    const status = await this.getSubscriptionStatus();
    const isActive = await this.checkSubscriptionExpiry();

    return isActive && (status.plan === 'yearly' || status.plan === 'lifetime');
  }

  static async isActiveOrNot(customerInfo: any): Promise<boolean> {
    // Check if any entitlement is actually active (not expired)
    const activeEntitlements: any = Object.values(
      customerInfo.entitlements.active
    );

    for (const entitlement of activeEntitlements) {
      if (entitlement?.isActive) {
        return true;
      }
    }

    return false;
  }

  static async handleSubscriptionUpdate(): Promise<any> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('customerInfo', customerInfo);

      const hasLifetimePurchase =
        customerInfo.nonSubscriptionTransactions.length > 0;
      const hasActiveSubscription = customerInfo.activeSubscriptions.length > 0;
      const currentStatus = await this.getSubscriptionStatus();

      const isRevanueCatActive = await this.isActiveOrNot(customerInfo);
      if (!isRevanueCatActive && currentStatus.plan !== 'free') {
        // No active subscription or purchase - set to free
        if (currentStatus.isActive) {
          await this.cancelSubscription();
          return customerInfo;
        }
      }

      // User has some form of premium access
      if (hasLifetimePurchase && currentStatus.plan !== 'lifetime') {
        await this.activateSubscription('lifetime');
        return customerInfo;
      }

      const activeSubscriptions = customerInfo?.activeSubscriptions;

      // Determine plan type based on subscription IDs
      let planType: 'monthly' | 'yearly' | 'lifetime' = 'monthly';

      for (const subId of activeSubscriptions) {
        if (subId.includes('yearly') || subId.includes('annual')) {
          planType = 'yearly';
          break;
        } else if (subId.includes('lifetime')) {
          planType = 'lifetime';
          break;
        }
      }

      if (
        hasActiveSubscription &&
        currentStatus.plan !== 'yearly' &&
        planType == 'yearly'
      ) {
        await this.activateSubscription('yearly');
      }

      if (
        hasActiveSubscription &&
        currentStatus.plan !== 'monthly' &&
        planType == 'monthly'
      ) {
        await this.activateSubscription('monthly');
      }

      return customerInfo;
    } catch (error) {
      console.error('Failed to update subscription status:', error);
      return {};
    }
  }
}
