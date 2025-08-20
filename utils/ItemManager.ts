import SecureStore from './secureStorage';
import * as Crypto from 'expo-crypto';
import { SecurityManager } from './SecurityManager';
import { VaultManager } from './VaultManager';

export type ItemType = 'photo' | 'video' | 'audio' | 'document' | 'card' | 'identity' | 'password' | 'file' | 'note';

export interface BaseItem {
  id: string;
  type: ItemType;
  name: string;
  createdAt: number;
  updatedAt: number;
  vaultId: string;
  tags: string[];
  isFavorite: boolean;
  notes?: string;
}

export interface PhotoItem extends BaseItem {
  type: 'photo';
  filename: string;
  encryptedData: string;
  thumbnail: string;
  size: number;
  hash: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  fullSizeUrl?: string;
}

export interface VideoItem extends BaseItem {
  type: 'video';
  filename: string;
  encryptedData: string;
  thumbnail: string;
  duration: number; // in seconds
  size: number;
  hash: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  resolution?: string;
  format?: string;
}

export interface AudioItem extends BaseItem {
  type: 'audio';
  filename: string;
  encryptedData: string;
  duration: number; // in seconds
  size: number;
  hash: string;
  audioUrl?: string;
  waveform?: number[]; // Audio waveform data for visualization
  format?: string;
  bitrate?: number;
}

export interface DocumentItem extends BaseItem {
  type: 'document';
  documentType: 'passport' | 'license' | 'insurance' | 'contract' | 'receipt' | 'other';
  filename: string;
  encryptedData: string;
  size: number;
  mimeType: string;
  expiryDate?: number;
  issuer?: string;
  documentNumber?: string;
}

export interface CardItem extends BaseItem {
  type: 'card';
  cardType: 'credit' | 'debit' | 'membership' | 'gift' | 'other';
  cardNumber: string; // Encrypted
  expiryDate?: string; // Encrypted
  cvv?: string; // Encrypted
  cardholderName?: string; // Encrypted
  issuer?: string;
  color?: string;
}

export interface IdentityItem extends BaseItem {
  type: 'identity';
  identityType: 'passport' | 'license' | 'ssn' | 'other';
  firstName?: string; // Encrypted
  lastName?: string; // Encrypted
  dateOfBirth?: string; // Encrypted
  idNumber?: string; // Encrypted
  issuingAuthority?: string;
  expiryDate?: number;
  address?: string; // Encrypted
}

export interface PasswordItem extends BaseItem {
  type: 'password';
  website?: string;
  username?: string; // Encrypted
  password: string; // Encrypted
  email?: string; // Encrypted
  url?: string;
  lastPasswordChange?: number;
  strength?: 'weak' | 'medium' | 'strong';
}

export interface FileItem extends BaseItem {
  type: 'file';
  filename: string;
  encryptedData: string;
  size: number;
  mimeType: string;
  hash: string;
}

export interface NoteItem extends BaseItem {
  type: 'note';
  title: string;
  content: string; // Encrypted
  isMarkdown?: boolean;
}

export type SecureItem = PhotoItem | VideoItem | AudioItem | DocumentItem | CardItem | IdentityItem | PasswordItem | FileItem | NoteItem;

export class ItemManager {
  private static readonly ITEMS_PREFIX = 'item_';
  
  // Demo photo IDs for consistent demo experience
  private static readonly DEMO_PHOTO_IDS = [
    1040881, 1040880, 1040879, 1040878, 1040877, 1040876, 1040875, 1040874,
    1040873, 1040872, 1040871, 1040870, 1040869, 1040868, 1040867, 1040866,
    1040865, 1040864, 1040863, 1040862, 1040861, 1040860, 1040859, 1040858,
    1040857, 1040856, 1040855, 1040854, 1040853, 1040852, 1040851, 1040850
  ];

  // Demo video IDs for consistent demo experience
  private static readonly DEMO_VIDEO_IDS = [
    3045163, 3045164, 3045165, 3045166, 3045167, 3045168, 3045169, 3045170,
    3045171, 3045172, 3045173, 3045174, 3045175, 3045176, 3045177, 3045178,
    3045179, 3045180, 3045181, 3045182, 3045183, 3045184, 3045185, 3045186,
    3045187, 3045188, 3045189, 3045190, 3045191, 3045192, 3045193, 3045194
  ];

  static async createItem(itemData: Partial<SecureItem>, vaultId: string): Promise<SecureItem> {
    try {
      const itemId = await this.generateItemId();
      const now = Date.now();

      let item: SecureItem;

      switch (itemData.type) {
        case 'photo':
          item = await this.createPhotoItem(itemId, itemData as Partial<PhotoItem>, vaultId, now);
          break;
        case 'video':
          item = await this.createVideoItem(itemId, itemData as Partial<VideoItem>, vaultId, now);
          break;
        case 'audio':
          item = await this.createAudioItem(itemId, itemData as Partial<AudioItem>, vaultId, now);
          break;
        case 'document':
          item = await this.createDocumentItem(itemId, itemData as Partial<DocumentItem>, vaultId, now);
          break;
        case 'card':
          item = await this.createCardItem(itemId, itemData as Partial<CardItem>, vaultId, now);
          break;
        case 'identity':
          item = await this.createIdentityItem(itemId, itemData as Partial<IdentityItem>, vaultId, now);
          break;
        case 'password':
          item = await this.createPasswordItem(itemId, itemData as Partial<PasswordItem>, vaultId, now);
          break;
        case 'file':
          item = await this.createFileItem(itemId, itemData as Partial<FileItem>, vaultId, now);
          break;
        case 'note':
          item = await this.createNoteItem(itemId, itemData as Partial<NoteItem>, vaultId, now);
          break;
        default:
          throw new Error('Invalid item type');
      }

      // Store the item
      await SecureStore.setItemAsync(this.ITEMS_PREFIX + itemId, JSON.stringify(item));
      
      // Add to vault
      await VaultManager.addItemToVault(vaultId, item);

      // Log the activity
      SecurityManager.logSecurityEvent('item_added', { 
        vaultId, 
        itemId: item.id,
        itemType: item.type,
        itemName: item.name 
      });

      return item;
    } catch (error) {
      console.error('Failed to create item:', error);
      throw error;
    }
  }

  private static async createPhotoItem(id: string, data: Partial<PhotoItem>, vaultId: string, timestamp: number): Promise<PhotoItem> {
    // Store the actual photo data without encryption for display purposes
    const actualPhotoData = (data as any).actualPhotoData || data.encryptedData || 'demo_photo_data';
    const imageUrl = data.imageUrl || null;
    const thumbnailUrl = data.thumbnailUrl || data.imageUrl || null;
    const fullSizeUrl = data.fullSizeUrl || data.imageUrl || null;
    
    return {
      id,
      type: 'photo',
      name: data.name || `Photo ${id.slice(0, 8)}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      vaultId,
      tags: data.tags || [],
      isFavorite: data.isFavorite || false,
      notes: data.notes,
      filename: data.filename || `photo_${id}.jpg`,
      encryptedData: actualPhotoData, // Store actual data for now
      thumbnail: 'demo_thumbnail',
      size: data.size || 1024000,
      hash: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, id),
      imageUrl: imageUrl,
      thumbnailUrl: thumbnailUrl,
      fullSizeUrl: fullSizeUrl
    };
  }

  private static async createVideoItem(id: string, data: Partial<VideoItem>, vaultId: string, timestamp: number): Promise<VideoItem> {
    // Store the actual video data without encryption for display purposes
    const actualVideoData = (data as any).actualVideoData || data.encryptedData || 'demo_video_data';
    const videoUrl = data.videoUrl || null;
    const thumbnailUrl = data.thumbnailUrl || null;
    
    return {
      id,
      type: 'video',
      name: data.name || `Video ${id.slice(0, 8)}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      vaultId,
      tags: data.tags || [],
      isFavorite: data.isFavorite || false,
      notes: data.notes,
      filename: data.filename || `video_${id}.mp4`,
      encryptedData: actualVideoData,
      thumbnail: 'demo_thumbnail',
      duration: data.duration || 30,
      size: data.size || 5120000, // 5MB default
      hash: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, id),
      videoUrl: videoUrl,
      thumbnailUrl: thumbnailUrl,
      resolution: data.resolution || '1920x1080',
      format: data.format || 'mp4'
    };
  }

  private static async createAudioItem(id: string, data: Partial<AudioItem>, vaultId: string, timestamp: number): Promise<AudioItem> {
    // Store the actual audio data without encryption for display purposes
    const actualAudioData = (data as any).actualAudioData || data.encryptedData || 'demo_audio_data';
    const audioUrl = data.audioUrl || null;
    
    return {
      id,
      type: 'audio',
      name: data.name || `Audio ${id.slice(0, 8)}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      vaultId,
      tags: data.tags || [],
      isFavorite: data.isFavorite || false,
      notes: data.notes,
      filename: data.filename || `audio_${id}.m4a`,
      encryptedData: actualAudioData,
      duration: data.duration || 60,
      size: data.size || 1024000, // 1MB default
      hash: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, id),
      audioUrl: audioUrl,
      waveform: data.waveform || this.generateDemoWaveform(),
      format: data.format || 'm4a',
      bitrate: data.bitrate || 128
    };
  }

  private static async createDocumentItem(id: string, data: Partial<DocumentItem>, vaultId: string, timestamp: number): Promise<DocumentItem> {
    return {
      id,
      type: 'document',
      name: data.name || 'New Document',
      createdAt: timestamp,
      updatedAt: timestamp,
      vaultId,
      tags: data.tags || [],
      isFavorite: data.isFavorite || false,
      notes: data.notes,
      documentType: data.documentType || 'other',
      filename: data.filename || `document_${id}.pdf`,
      encryptedData: await SecurityManager.encryptData(data.encryptedData || 'demo_document_data'),
      size: data.size || 512000,
      mimeType: data.mimeType || 'application/pdf',
      expiryDate: data.expiryDate,
      issuer: data.issuer,
      documentNumber: data.documentNumber
    };
  }

  private static async createCardItem(id: string, data: Partial<CardItem>, vaultId: string, timestamp: number): Promise<CardItem> {
    return {
      id,
      type: 'card',
      name: data.name || 'New Card',
      createdAt: timestamp,
      updatedAt: timestamp,
      vaultId,
      tags: data.tags || [],
      isFavorite: data.isFavorite || false,
      notes: data.notes,
      cardType: data.cardType || 'credit',
      cardNumber: await SecurityManager.encryptData(data.cardNumber || ''),
      expiryDate: data.expiryDate ? await SecurityManager.encryptData(data.expiryDate) : undefined,
      cvv: data.cvv ? await SecurityManager.encryptData(data.cvv) : undefined,
      cardholderName: data.cardholderName ? await SecurityManager.encryptData(data.cardholderName) : undefined,
      issuer: data.issuer,
      color: data.color || '#007AFF'
    };
  }

  private static async createIdentityItem(id: string, data: Partial<IdentityItem>, vaultId: string, timestamp: number): Promise<IdentityItem> {
    return {
      id,
      type: 'identity',
      name: data.name || 'New Identity',
      createdAt: timestamp,
      updatedAt: timestamp,
      vaultId,
      tags: data.tags || [],
      isFavorite: data.isFavorite || false,
      notes: data.notes,
      identityType: data.identityType || 'other',
      firstName: data.firstName ? await SecurityManager.encryptData(data.firstName) : undefined,
      lastName: data.lastName ? await SecurityManager.encryptData(data.lastName) : undefined,
      dateOfBirth: data.dateOfBirth ? await SecurityManager.encryptData(data.dateOfBirth) : undefined,
      idNumber: data.idNumber ? await SecurityManager.encryptData(data.idNumber) : undefined,
      issuingAuthority: data.issuingAuthority,
      expiryDate: data.expiryDate,
      address: data.address ? await SecurityManager.encryptData(data.address) : undefined
    };
  }

  private static async createPasswordItem(id: string, data: Partial<PasswordItem>, vaultId: string, timestamp: number): Promise<PasswordItem> {
    return {
      id,
      type: 'password',
      name: data.name || 'New Password',
      createdAt: timestamp,
      updatedAt: timestamp,
      vaultId,
      tags: data.tags || [],
      isFavorite: data.isFavorite || false,
      notes: data.notes,
      website: data.website,
      username: data.username ? await SecurityManager.encryptData(data.username) : undefined,
      password: await SecurityManager.encryptData(data.password || ''),
      email: data.email ? await SecurityManager.encryptData(data.email) : undefined,
      url: data.url,
      lastPasswordChange: timestamp,
      strength: this.calculatePasswordStrength(data.password || '')
    };
  }

  private static async createFileItem(id: string, data: Partial<FileItem>, vaultId: string, timestamp: number): Promise<FileItem> {
    return {
      id,
      type: 'file',
      name: data.name || 'New File',
      createdAt: timestamp,
      updatedAt: timestamp,
      vaultId,
      tags: data.tags || [],
      isFavorite: data.isFavorite || false,
      notes: data.notes,
      filename: data.filename || `file_${id}`,
      encryptedData: await SecurityManager.encryptData(data.encryptedData || 'demo_file_data'),
      size: data.size || 256000,
      mimeType: data.mimeType || 'application/octet-stream',
      hash: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, id)
    };
  }

  private static async createNoteItem(id: string, data: Partial<NoteItem>, vaultId: string, timestamp: number): Promise<NoteItem> {
    return {
      id,
      type: 'note',
      name: data.name || 'New Note',
      createdAt: timestamp,
      updatedAt: timestamp,
      vaultId,
      tags: data.tags || [],
      isFavorite: data.isFavorite || false,
      notes: data.notes,
      title: data.title || 'Untitled Note',
      content: await SecurityManager.encryptData(data.content || ''),
      isMarkdown: data.isMarkdown || false
    };
  }

  static async getItem(itemId: string): Promise<SecureItem | null> {
    try {
      const itemData = await SecureStore.getItemAsync(this.ITEMS_PREFIX + itemId);
      if (!itemData) return null;

      const item = JSON.parse(itemData);
      return await this.decryptItem(item);
    } catch (error) {
      console.error('Failed to get item:', error);
      return null;
    }
  }

  static async updateItem(itemId: string, updates: Partial<SecureItem>): Promise<boolean> {
    try {
      const existingItem = await this.getItem(itemId);
      if (!existingItem) return false;

      const updatedItem = {
        ...existingItem,
        ...updates,
        updatedAt: Date.now()
      };

      // Re-encrypt sensitive fields
      const encryptedItem = await this.encryptItem(updatedItem);
      
      await SecureStore.setItemAsync(this.ITEMS_PREFIX + itemId, JSON.stringify(encryptedItem));
      return true;
    } catch (error) {
      console.error('Failed to update item:', error);
      return false;
    }
  }

  static async deleteItem(itemId: string): Promise<boolean> {
    try {
      const item = await this.getItem(itemId);
      if (!item) return false;

      // Remove from vault
      await VaultManager.removeItemFromVault(item.vaultId, itemId);
      
      // Delete the item
      await SecureStore.deleteItemAsync(this.ITEMS_PREFIX + itemId);
      
      SecurityManager.logSecurityEvent('item_deleted', { 
        vaultId: item.vaultId,
        itemId, 
        itemType: item.type,
        itemName: item.name 
      });
      return true;
    } catch (error) {
      console.error('Failed to delete item:', error);
      return false;
    }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async decryptSensitiveField(encryptedData: string): Promise<string> {
    try {
      return await SecurityManager.decryptData(encryptedData);
    } catch (error) {
      console.error('Failed to decrypt sensitive field:', error);
      return encryptedData; // Return as-is if decryption fails
    }
  }

  private static async encryptItem(item: SecureItem): Promise<SecureItem> {
    const encryptedItem = { ...item };

    switch (item.type) {
      case 'card':
        const cardItem = encryptedItem as CardItem;
        if (cardItem.cardNumber) cardItem.cardNumber = await SecurityManager.encryptData(cardItem.cardNumber);
        // Don't encrypt these for demo purposes - keep them readable
        // if (cardItem.expiryDate) cardItem.expiryDate = await SecurityManager.encryptData(cardItem.expiryDate);
        // if (cardItem.cvv) cardItem.cvv = await SecurityManager.encryptData(cardItem.cvv);
        // if (cardItem.cardholderName) cardItem.cardholderName = await SecurityManager.encryptData(cardItem.cardholderName);
        break;
      case 'identity':
        const identityItem = encryptedItem as IdentityItem;
        // Don't encrypt these for demo purposes - keep them readable
        // if (identityItem.firstName) identityItem.firstName = await SecurityManager.encryptData(identityItem.firstName);
        // if (identityItem.lastName) identityItem.lastName = await SecurityManager.encryptData(identityItem.lastName);
        // if (identityItem.dateOfBirth) identityItem.dateOfBirth = await SecurityManager.encryptData(identityItem.dateOfBirth);
        // if (identityItem.idNumber) identityItem.idNumber = await SecurityManager.encryptData(identityItem.idNumber);
        // if (identityItem.address) identityItem.address = await SecurityManager.encryptData(identityItem.address);
        break;
      case 'password':
        const passwordItem = encryptedItem as PasswordItem;
        // Don't encrypt these for demo purposes - keep them readable
        // if (passwordItem.username) passwordItem.username = await SecurityManager.encryptData(passwordItem.username);
        // passwordItem.password = await SecurityManager.encryptData(passwordItem.password);
        // if (passwordItem.email) passwordItem.email = await SecurityManager.encryptData(passwordItem.email);
        break;
      case 'note':
        const noteItem = encryptedItem as NoteItem;
        // Don't encrypt for demo purposes - keep readable
        // noteItem.content = await SecurityManager.encryptData(noteItem.content);
        break;
    }

    return encryptedItem;
  }

  private static async decryptItem(item: SecureItem): Promise<SecureItem> {
    const decryptedItem = { ...item };

    try {
      switch (item.type) {
        case 'card':
          // const cardItem = decryptedItem as CardItem;
          // if (cardItem.cardNumber) cardItem.cardNumber = await SecurityManager.decryptData(cardItem.cardNumber);
          // if (cardItem.expiryDate) cardItem.expiryDate = await SecurityManager.decryptData(cardItem.expiryDate);
          // if (cardItem.cvv) cardItem.cvv = await SecurityManager.decryptData(cardItem.cvv);
          // if (cardItem.cardholderName) cardItem.cardholderName = await SecurityManager.decryptData(cardItem.cardholderName);
          break;
        case 'identity':
          // const identityItem = decryptedItem as IdentityItem;
          // if (identityItem.firstName) identityItem.firstName = await SecurityManager.decryptData(identityItem.firstName);
          // if (identityItem.lastName) identityItem.lastName = await SecurityManager.decryptData(identityItem.lastName);
          // if (identityItem.dateOfBirth) identityItem.dateOfBirth = await SecurityManager.decryptData(identityItem.dateOfBirth);
          // if (identityItem.idNumber) identityItem.idNumber = await SecurityManager.decryptData(identityItem.idNumber);
          // if (identityItem.address) identityItem.address = await SecurityManager.decryptData(identityItem.address);
          break;
        case 'password':
          // const passwordItem = decryptedItem as PasswordItem;
          // if (passwordItem.username) passwordItem.username = await SecurityManager.decryptData(passwordItem.username);
          // passwordItem.password = await SecurityManager.decryptData(passwordItem.password);
          // if (passwordItem.email) passwordItem.email = await SecurityManager.decryptData(passwordItem.email);
          break;
        case 'note':
          // const noteItem = decryptedItem as NoteItem;
          // noteItem.content = await SecurityManager.decryptData(noteItem.content);
          break;
      }
    } catch (error) {
      console.error('Failed to decrypt item fields:', error);
    }

    return decryptedItem;
  }

  private static calculatePasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    if (password.length < 8) return 'weak';
    
    let score = 0;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score >= 4) return 'strong';
    if (score >= 2) return 'medium';
    return 'weak';
  }

  private static getDemoPhotoId(photoId: string): number {
    let hash = 0;
    for (let i = 0; i < photoId.length; i++) {
      const char = photoId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const index = Math.abs(hash) % this.DEMO_PHOTO_IDS.length;
    return this.DEMO_PHOTO_IDS[index];
  }

  private static async generateItemId(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private static generateDemoWaveform(): number[] {
    // Generate a demo waveform for audio visualization
    const points = 50;
    const waveform = [];
    for (let i = 0; i < points; i++) {
      waveform.push(Math.random() * 100);
    }
    return waveform;
  }

  static generateImageUrl(itemId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    // Generate a consistent Pexels photo URL based on item ID
    const demoPhotoId = this.getDemoPhotoId(itemId);
    const baseUrl = `https://images.pexels.com/photos/${demoPhotoId}/pexels-photo-${demoPhotoId}.jpeg?auto=compress&cs=tinysrgb`;
    
    const sizeMap = {
      small: { w: 400, h: 300 },
      medium: { w: 800, h: 600 },
      large: { w: 1200, h: 900 }
    };
    
    const { w, h } = sizeMap[size];
    return `${baseUrl}&w=${w}&h=${h}&fit=crop`;
  }

  static generateVideoUrl(itemId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    // Generate a consistent Pexels video URL based on item ID
    const demoVideoId = this.getDemoVideoId(itemId);
    const baseUrl = `https://player.vimeo.com/external/${demoVideoId}.hd.mp4?s=`;
    
    // Generate a consistent hash for the video URL
    let hash = 0;
    for (let i = 0; i < itemId.length; i++) {
      const char = itemId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const hashString = Math.abs(hash).toString(16).substring(0, 8);
    return `${baseUrl}${hashString}`;
  }

  private static getDemoVideoId(itemId: string): number {
    // Create a consistent hash from the item ID
    let hash = 0;
    for (let i = 0; i < itemId.length; i++) {
      const char = itemId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    // Use the hash to select a video from our curated list
    const index = Math.abs(hash) % this.DEMO_VIDEO_IDS.length;
    return this.DEMO_VIDEO_IDS[index];
  }

  private static getDemoPhotoId(itemId: string): number {
    // Create a consistent hash from the item ID
    let hash = 0;
    for (let i = 0; i < itemId.length; i++) {
      const char = itemId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use the hash to select a photo from our curated list
    const index = Math.abs(hash) % this.DEMO_PHOTO_IDS.length;
    return this.DEMO_PHOTO_IDS[index];
  }

  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  static async getActualPhotoItem(itemId: string): Promise<PhotoItem | null> {
    try {
      const item = await this.getItem(itemId);
      if (!item || item.type !== 'photo') return null;
      
      const photoItem = item as PhotoItem;
      
      // Return the photo item with actual URLs
      if (photoItem.imageUrl) {
        return photoItem;
      }
      
      // If we have encrypted data, try to use it
      if (photoItem.encryptedData && photoItem.encryptedData !== 'demo_photo_data') {
        let dataUrl: string;
        
        if (photoItem.encryptedData.startsWith('data:')) {
          dataUrl = photoItem.encryptedData;
        } else if (photoItem.encryptedData.startsWith('/') || 
                   photoItem.encryptedData.startsWith('file://') || 
                   photoItem.encryptedData.startsWith('content://') ||
                   photoItem.encryptedData.startsWith('http')) {
          // It's a URI, use it directly
          dataUrl = photoItem.encryptedData;
        } else {
          // Assume it's base64 data
          dataUrl = `data:image/jpeg;base64,${photoItem.encryptedData}`;
        }
        
        return {
          ...photoItem,
          imageUrl: dataUrl,
          thumbnailUrl: dataUrl,
          fullSizeUrl: dataUrl
        };
      }
      
      return photoItem;
    } catch (error) {
      console.error('Failed to get photo item:', error);
      return null;
    }
  }

  static async getPhotoDisplayUrl(itemId: string): Promise<string> {
    try {
      const photoItem = await this.getActualPhotoItem(itemId);
      
      if (photoItem?.imageUrl) {
        return photoItem.imageUrl;
      }
      
      // Fallback to Pexels image
      return this.generateImageUrl(itemId, 'medium');
    } catch (error) {
      console.error('Failed to get photo display URL:', error);
      return this.generateImageUrl(itemId, 'medium');
    }
  }

  static async updatePhotoUrls(itemId: string, imageUrl: string): Promise<boolean> {
    try {
      const success = await this.updateItem(itemId, {
        imageUrl: imageUrl,
        thumbnailUrl: imageUrl,
        fullSizeUrl: imageUrl
      });
      return success;
    } catch (error) {
      console.error('Failed to update photo URLs:', error);
      return false;
    }
  }

  static async refreshPhotoItem(itemId: string): Promise<PhotoItem | null> {
    try {
      // Get the raw item data
      const itemData = await SecureStore.getItemAsync(this.ITEMS_PREFIX + itemId);
      if (!itemData) return null;

      const item = JSON.parse(itemData);
      if (item.type !== 'photo') return null;

      // If we have encryptedData that looks like actual photo data, use it
      if (item.encryptedData && item.encryptedData !== 'demo_photo_data') {
        let imageUrl = item.imageUrl;
        
        if (!imageUrl || imageUrl === 'demo_photo_data') {
          // Try to construct URL from encrypted data
          if (item.encryptedData.startsWith('data:') || 
              item.encryptedData.startsWith('/') || 
              item.encryptedData.startsWith('file://') || 
              item.encryptedData.startsWith('content://') ||
              item.encryptedData.startsWith('http')) {
            imageUrl = item.encryptedData;
          } else {
            // It's base64 data
            imageUrl = `data:image/jpeg;base64,${item.encryptedData}`;
          }
          
          // Update the item with the correct URLs
          item.imageUrl = imageUrl;
          item.thumbnailUrl = imageUrl;
          item.fullSizeUrl = imageUrl;
          
          // Save the updated item
          await SecureStore.setItemAsync(this.ITEMS_PREFIX + itemId, JSON.stringify(item));
        }
      }
      
      return item;
    } catch (error) {
      console.error('Failed to refresh photo item:', error);
      return null;
    }
  }
}