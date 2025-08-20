import SecureStore from './secureStorage';
import * as Crypto from 'expo-crypto';
import { SecurityManager } from './SecurityManager';
import { SubscriptionManager } from './SubscriptionManager';
import { SecureItem } from './ItemManager';

export interface Vault {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  createdAt: number;
  lastAccessed: number;
  isLocked: boolean;
  color: string;
  encryptionKey: string;
}

export class VaultManager {
  private static readonly VAULTS_KEY = 'vaults_data';
  private static readonly VAULT_PREFIX = 'vault_';

  static async createVault(name: string, description: string, color: string): Promise<Vault> {
    try {
      const vault: Vault = {
        id: await this.generateVaultId(),
        name,
        description,
        itemCount: 0,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isLocked: false,
        color,
        encryptionKey: await SecurityManager.generateEncryptionKey()
      };

      const existingVaults = await this.getAllVaults();
      const updatedVaults = [...existingVaults, vault];
      
      await this.saveVaults(updatedVaults);
      return vault;
    } catch (error) {
      console.error('Failed to create vault:', error);
      throw error;
    }
  }

  static async getAllVaults(): Promise<Vault[]> {
    try {
      const encryptedVaults = await SecureStore.getItemAsync(this.VAULTS_KEY);
      if (!encryptedVaults) {
        // Initialize with empty array if no vaults exist
        return [];
      }

      try {
        const decryptedVaults = await SecurityManager.decryptData(encryptedVaults);
        return JSON.parse(decryptedVaults);
      } catch (decryptError) {
        console.warn('Failed to decrypt vaults, returning empty array:', decryptError);
        // Clear corrupted data and return empty array
        await SecureStore.deleteItemAsync(this.VAULTS_KEY);
        return [];
      }
    } catch (error) {
      console.error('Failed to get vaults:', error);
      return [];
    }
  }

  static async getVault(id: string): Promise<Vault | null> {
    try {
      const vaults = await this.getAllVaults();
      return vaults.find(vault => vault.id === id) || null;
    } catch (error) {
      console.error('Failed to get vault:', error);
      return null;
    }
  }

  static async updateVault(id: string, updates: Partial<Vault>): Promise<boolean> {
    try {
      const vaults = await this.getAllVaults();
      const vaultIndex = vaults.findIndex(vault => vault.id === id);
      
      if (vaultIndex === -1) return false;

      vaults[vaultIndex] = { ...vaults[vaultIndex], ...updates };
      await this.saveVaults(vaults);
      return true;
    } catch (error) {
      console.error('Failed to update vault:', error);
      return false;
    }
  }

  static async deleteVault(id: string): Promise<boolean> {
    try {
      const vaults = await this.getAllVaults();
      const filteredVaults = vaults.filter(vault => vault.id !== id);
      
      // Also delete vault-specific data
      await SecureStore.deleteItemAsync(this.VAULT_PREFIX + id);
      
      // Decrement usage count
      await SubscriptionManager.decrementUsage('vault');
      
      await this.saveVaults(filteredVaults);
      return true;
    } catch (error) {
      console.error('Failed to delete vault:', error);
      return false;
    }
  }

  static async lockVault(id: string): Promise<boolean> {
    try {
      const success = await this.updateVault(id, { isLocked: true });
      if (success) {
        SecurityManager.logSecurityEvent('vault_locked', { vaultId: id });
      }
      return success;
    } catch (error) {
      console.error('Failed to lock vault:', error);
      throw error;
    }
  }

  static async unlockVault(id: string): Promise<boolean> {
    try {
      const success = await this.updateVault(id, { 
        isLocked: false,
        lastAccessed: Date.now()
      });
      if (success) {
        SecurityManager.logSecurityEvent('vault_unlocked', { vaultId: id });
      }
      return success;
    } catch (error) {
      console.error('Failed to unlock vault:', error);
      throw error;
    }
  }

  static async getVaultPhotos(vaultId: string): Promise<any[]> {
    return this.getVaultItems(vaultId);
  }

  static async getVaultItems(vaultId: string): Promise<SecureItem[]> {
    try {
      const vaultData = await SecureStore.getItemAsync(this.VAULT_PREFIX + vaultId);
      if (!vaultData) return [];

      const decryptedData = await SecurityManager.decryptData(vaultData);
      const items = JSON.parse(decryptedData);
      return items || [];
    } catch (error) {
      console.error('Failed to get vault items:', error);
      return [];
    }
  }

  static async addPhotoToVault(vaultId: string, photoData: any): Promise<boolean> {
    return this.addItemToVault(vaultId, photoData);
  }

  static async addItemToVault(vaultId: string, itemData: SecureItem): Promise<boolean> {
    try {
      const existingItems = await this.getVaultItems(vaultId);
      
      const updatedItems = [...existingItems, itemData];
      
      const encryptedData = await SecurityManager.encryptData(JSON.stringify(updatedItems));
      await SecureStore.setItemAsync(this.VAULT_PREFIX + vaultId, encryptedData);
      
      // Update item count
      await this.updateVault(vaultId, { itemCount: updatedItems.length });
      
      // Increment usage count based on item type
      if (itemData.type === 'photo') {
        await SubscriptionManager.incrementUsage('photo');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to add item to vault:', error);
      return false;
    }
  }

  static async removePhotoFromVault(vaultId: string, photoId: string): Promise<boolean> {
    return this.removeItemFromVault(vaultId, photoId);
  }

  static async removeItemFromVault(vaultId: string, itemId: string): Promise<boolean> {
    try {
      const existingItems = await this.getVaultItems(vaultId);
      const itemToRemove = existingItems.find(item => item.id === itemId);
      const updatedItems = existingItems.filter(item => item.id !== itemId);
      
      const encryptedData = await SecurityManager.encryptData(JSON.stringify(updatedItems));
      await SecureStore.setItemAsync(this.VAULT_PREFIX + vaultId, encryptedData);
      
      // Update item count
      await this.updateVault(vaultId, { itemCount: updatedItems.length });
      
      // Decrement usage count based on item type
      if (itemToRemove?.type === 'photo') {
        await SubscriptionManager.decrementUsage('photo');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to remove item from vault:', error);
      return false;
    }
  }

  private static async saveVaults(vaults: Vault[]) {
    try {
      const encryptedVaults = await SecurityManager.encryptData(JSON.stringify(vaults));
      await SecureStore.setItemAsync(this.VAULTS_KEY, encryptedVaults);
    } catch (error) {
      console.error('Failed to save vaults:', error);
      throw error;
    }
  }

  private static async generateVaultId(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}