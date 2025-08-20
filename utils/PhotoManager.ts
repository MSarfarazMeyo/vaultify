import SecureStore from './secureStorage';
import * as Crypto from 'expo-crypto';
import { SecurityManager } from './SecurityManager';
import { VaultManager } from './VaultManager';

export interface SecurePhoto {
  id: string;
  filename: string;
  encryptedData: string;
  thumbnail: string;
  createdAt: number;
  size: number;
  hash: string;
  vaultId?: string;
  notes?: string;
  imageUrl?: string;
  photoIndex?: number;
  thumbnailUrl?: string;
  fullSizeUrl?: string;
}

export class PhotoManager {
  private static readonly PHOTOS_KEY = 'secure_photos';
  private static readonly PHOTO_PREFIX = 'photo_';
  
  // Curated list of high-quality Pexels photo IDs for consistent demo experience
  private static readonly DEMO_PHOTO_IDS = [
    1040881, 1040880, 1040879, 1040878, 1040877, 1040876, 1040875, 1040874,
    1040873, 1040872, 1040871, 1040870, 1040869, 1040868, 1040867, 1040866,
    1040865, 1040864, 1040863, 1040862, 1040861, 1040860, 1040859, 1040858,
    1040857, 1040856, 1040855, 1040854, 1040853, 1040852, 1040851, 1040850,
    1040849, 1040848, 1040847, 1040846, 1040845, 1040844, 1040843, 1040842,
    1040841, 1040840, 1040839, 1040838, 1040837, 1040836, 1040835, 1040834,
    1040833, 1040832, 1040831, 1040830, 1040829, 1040828, 1040827, 1040826,
    1040825, 1040824, 1040823, 1040822, 1040821, 1040820, 1040819, 1040818,
    1040817, 1040816, 1040815, 1040814, 1040813, 1040812, 1040811, 1040810,
    1040809, 1040808, 1040807, 1040806, 1040805, 1040804, 1040803, 1040802,
    1040801, 1040800, 1040799, 1040798, 1040797, 1040796, 1040795, 1040794,
    1040793, 1040792, 1040791, 1040790, 1040789, 1040788, 1040787, 1040786,
    1040785, 1040784, 1040783, 1040782, 1040781, 1040780, 1040779, 1040778,
    1040777, 1040776, 1040775, 1040774, 1040773, 1040772, 1040771, 1040770
  ];

  static async saveSecurePhoto(uri: string, base64Data?: string, vaultId?: string): Promise<SecurePhoto> {
    try {
      const photoId = await this.generatePhotoId();
      
      // Get a consistent photo ID based on the photo ID hash
      const photoIndex = this.getDemoPhotoId(photoId);
      
      // In production, this would read the actual image file
      const imageData = base64Data || await this.getImageData(uri);
      
      // Generate multiple Pexels URLs for different sizes
      const baseUrl = `https://images.pexels.com/photos/${photoIndex}/pexels-photo-${photoIndex}.jpeg?auto=compress&cs=tinysrgb`;
      const imageUrl = `${baseUrl}&w=800&h=600&fit=crop`;
      
      const photo: SecurePhoto = {
        id: photoId,
        filename: `photo_${photoId}.jpg`,
        encryptedData: await SecurityManager.encryptData(imageData),
        thumbnail: await this.generateThumbnail(imageData),
        createdAt: Date.now(),
        size: imageData.length,
        hash: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, imageData),
        vaultId,
        photoIndex,
        imageUrl,
        thumbnailUrl: `${baseUrl}&w=400&h=300&fit=crop`,
        fullSizeUrl: `${baseUrl}&w=1200&h=900&fit=crop`
      };

      // Store the photo
      await SecureStore.setItemAsync(this.PHOTO_PREFIX + photoId, JSON.stringify(photo));
      
      // Add to vault if specified
      if (vaultId) {
        await VaultManager.addPhotoToVault(vaultId, photo);
      }

      return photo;
    } catch (error) {
      console.error('Failed to save secure photo:', error);
      throw error;
    }
  }

  static getDemoPhotoId(photoId: string): number {
    // Create a consistent hash from the photo ID
    let hash = 0;
    for (let i = 0; i < photoId.length; i++) {
      const char = photoId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use the hash to select a photo from our curated list
    const index = Math.abs(hash) % this.DEMO_PHOTO_IDS.length;
    return this.DEMO_PHOTO_IDS[index];
  }

  static generateImageUrl(photoId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    const demoPhotoId = this.getDemoPhotoId(photoId);
    const baseUrl = `https://images.pexels.com/photos/${demoPhotoId}/pexels-photo-${demoPhotoId}.jpeg?auto=compress&cs=tinysrgb`;
    
    const sizeMap = {
      small: { w: 400, h: 300 },
      medium: { w: 800, h: 600 },
      large: { w: 1200, h: 900 }
    };
    
    const { w, h } = sizeMap[size];
    return `${baseUrl}&w=${w}&h=${h}&fit=crop`;
  }

  static async getSecurePhoto(photoId: string): Promise<SecurePhoto | null> {
    try {
      const photoData = await SecureStore.getItemAsync(this.PHOTO_PREFIX + photoId);
      if (!photoData) return null;

      const photo = JSON.parse(photoData);
      
      // Decrypt the photo data
      photo.encryptedData = await SecurityManager.decryptData(photo.encryptedData);
      
      return photo;
    } catch (error) {
      console.error('Failed to get secure photo:', error);
      return null;
    }
  }

  static async deleteSecurePhoto(photoId: string): Promise<boolean> {
    try {
      // Get photo data for secure deletion
      const photo = await this.getSecurePhoto(photoId);
      if (!photo) return false;

      // Perform secure deletion
      await SecurityManager.secureDelete(photo.encryptedData);
      
      // Remove from storage
      await SecureStore.deleteItemAsync(this.PHOTO_PREFIX + photoId);
      
      SecurityManager.logSecurityEvent('photo_deleted', { photoId });
      return true;
    } catch (error) {
      console.error('Failed to delete secure photo:', error);
      return false;
    }
  }

  static async getAllPhotos(): Promise<SecurePhoto[]> {
    try {
      // In production, this would iterate through all stored photos
      // For now, return empty array as photos are stored in vaults
      return [];
    } catch (error) {
      console.error('Failed to get all photos:', error);
      return [];
    }
  }

  static async verifyPhotoIntegrity(photo: SecurePhoto): Promise<boolean> {
    try {
      const currentHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        photo.encryptedData
      );
      
      return currentHash === photo.hash;
    } catch (error) {
      console.error('Failed to verify photo integrity:', error);
      return false;
    }
  }

  static async updatePhotoNotes(photoId: string, notes: string): Promise<boolean> {
    try {
      const photo = await this.getSecurePhoto(photoId);
      if (!photo) return false;

      photo.notes = notes;
      await SecureStore.setItemAsync(this.PHOTO_PREFIX + photoId, JSON.stringify(photo));
      
      return true;
    } catch (error) {
      console.error('Failed to update photo notes:', error);
      return false;
    }
  }

  private static async generatePhotoId(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private static async getImageData(uri: string): Promise<string> {
    try {
      // In production, this would read the actual image file
      // For demo, return simulated image data
      return btoa('placeholder_image_data');
    } catch (error) {
      console.error('Failed to get image data:', error);
      throw error;
    }
  }

  private static async generateThumbnail(imageData: string): Promise<string> {
    try {
      // In production, this would generate a smaller thumbnail
      // For demo, return simulated thumbnail
      return imageData.substring(0, 100) + '...';
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return imageData;
    }
  }
}