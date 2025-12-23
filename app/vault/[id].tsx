import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Search,
  MoveVertical as MoreVertical,
  Share,
  Activity,
  Eye,
  EyeOff,
  Star,
  Trash2,
  CreditCard as Edit3,
  Download,
  Upload,
  Filter,
  Import as SortAsc,
  Grid2x2 as Grid,
  List,
  Camera,
  FileText,
  CreditCard,
  User,
  Lock,
  File,
  StickyNote,
  Copy,
  ExternalLink,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe,
  Key,
  Shield,
  CreditCard as Card,
  X,
  Video,
  Mic,
  Play,
  Pause,
  Users,
} from 'lucide-react-native';
import { SecurityManager } from '@/utils/SecurityManager';
import { ItemManager, SecureItem } from '@/utils/ItemManager';
import ItemCreationModal from '@/components/ItemCreationModal';
import VaultSharingModal from '@/components/VaultSharingModal';
import { Audio } from 'expo-av';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEvent } from 'expo';

import { useVault } from '@/hooks/useVaults';
import { useVaultItems, useDeleteVaultItem } from '@/hooks/useVaultItems';

const AudioPlayer = ({ url }: { url: string }) => {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  const progress = status.duration ? status.currentTime / status.duration : 0;

  return (
    <View
      style={{
        width: '100%',
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (status.playing) {
              player.pause();
            } else {
              player.seekTo(0);
              player.play();
            }
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#9B59B6',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {status.playing ? (
            <Pause size={20} color="#FFFFFF" />
          ) : (
            <Play size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 14 }}>Audio</Text>
          <Text style={{ color: '#8E8E93', fontSize: 12 }}>
            {Math.floor(status.currentTime || 0)}s /{' '}
            {Math.floor(status.duration || 0)}s
          </Text>
        </View>
      </View>
      <View
        style={{
          height: 4,
          backgroundColor: '#48484A',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            backgroundColor: '#9B59B6',
          }}
        />
      </View>
    </View>
  );
};

const VideoPlayer = ({ url }: { url: string }) => {
  const player = useVideoPlayer(url, (player) => {
    player.loop = false;
    player.muted = false;
  });

  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  const isLoading = status !== 'readyToPlay';

  return (
    <View
      style={{
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#e71919ff',
        position: 'relative',
      }}
    >
      {isLoading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#1C1C1E',
            borderRadius: 12,
            zIndex: 1,
          }}
        >
          <ActivityIndicator size="large" color="#007AFF" />
          <Text
            style={{
              color: '#8E8E93',
              marginTop: 8,
              fontSize: 14,
            }}
          >
            Loading video...
          </Text>
        </View>
      )}
      <VideoView
        style={{
          width: '100%',
          height: 200,
          borderRadius: 12,
          backgroundColor: '#0c0c0cff',
        }}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
    </View>
  );
};

export default function VaultDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SecureItem | null>(null);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'type'>('date');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [showSharingModal, setShowSharingModal] = useState(false);

  const [photoUrls, setPhotoUrls] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [showSensitiveData, setShowSensitiveData] = useState<{
    [key: string]: boolean;
  }>({});

  // Audio playback state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);

  // TanStack Query hooks
  const { data: vault, isLoading, error } = useVault(id as string);
  const { data: items = [], isLoading: itemsLoading } = useVaultItems(
    id as string
  );
  const { mutateAsync: deleteItem, isPending: isDeleting } =
    useDeleteVaultItem();

  const handleItemCreated = () => {
    // Items will auto-refresh via TanStack Query
  };

  const handleUnlockVault = async () => {
    if (!vault) return;

    try {
      // TODO: Implement unlock logic
      SecurityManager.logSecurityEvent('vault_unlocked', { vaultId: vault.id });
    } catch (error) {
      Alert.alert('Error', 'Failed to unlock vault');
    }
  };

  const handleLockVault = async () => {
    if (!vault) return;

    Alert.alert('Lock Vault', 'Are you sure you want to lock this vault?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Lock',
        onPress: async () => {
          try {
            // TODO: Implement lock logic
            SecurityManager.logSecurityEvent('vault_locked', {
              vaultId: vault.id,
            });
          } catch (error) {
            Alert.alert('Error', 'Failed to lock vault');
          }
        },
      },
    ]);
  };

  const handleItemPress = (item: SecureItem) => {
    setSelectedItem(item);
    setShowItemDetails(true);
  };

  const handleDeleteItem = async (item: SecureItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(item.id);
              setShowItemDetails(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleActivity = () => {
    setShowActivityModal(true);
  };

  const handleShareVault = async (method: 'export' | 'link' | 'qr') => {
    try {
      switch (method) {
        case 'export':
          await handleExportVault();
          break;
        case 'link':
          await handleShareLink();
          break;
        case 'qr':
          await handleShareQR();
          break;
      }
      setShowShareModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to share vault');
    }
  };

  const handleExportVault = async () => {
    try {
      const vaultData = {
        vault: vault,
        items: items,
        exportedAt: new Date().toISOString(),
        exportedBy: 'Secure Vault App',
      };

      const exportJson = JSON.stringify(vaultData, null, 2);

      if (Platform.OS === 'web') {
        // Create and download file on web
        const blob = new Blob([exportJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${vault?.name || 'vault'}_export_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Alert.alert('Success', 'Vault exported successfully');
      } else {
        // For native platforms, you would use expo-sharing or similar
        Alert.alert(
          'Export Complete',
          'Vault data has been prepared for export'
        );
      }

      SecurityManager.logSecurityEvent('vault_exported', {
        vaultId: vault?.id,
      });
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to export vault');
    }
  };

  const handleShareLink = async () => {
    try {
      // Generate a secure sharing link (in production, this would be a real URL)
      const shareLink = `https://securevault.app/shared/${
        vault?.id
      }?token=${Date.now()}`;

      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({
          title: `Secure Vault: ${vault?.name}`,
          text: `Check out my secure vault: ${vault?.name}`,
          url: shareLink,
        });
      } else if (Platform.OS === 'web') {
        // Fallback for web browsers without Web Share API
        await navigator.clipboard.writeText(shareLink);
        Alert.alert('Link Copied', 'Sharing link has been copied to clipboard');
      } else {
        // For native platforms, you would use expo-sharing
        Alert.alert('Share Link', `Link: ${shareLink}`);
      }

      SecurityManager.logSecurityEvent('vault_link_shared', {
        vaultId: vault?.id,
      });
    } catch (error) {
      console.error('Share link failed:', error);
      Alert.alert('Error', 'Failed to create sharing link');
    }
  };

  const handleShareQR = async () => {
    try {
      // Generate QR code data (in production, this would generate an actual QR code)
      const qrData = {
        type: 'vault_share',
        vaultId: vault?.id,
        vaultName: vault?.name,
        timestamp: Date.now(),
      };

      Alert.alert(
        'QR Code Generated',
        'QR code has been generated for sharing. In a production app, this would display a scannable QR code.',
        [{ text: 'OK' }]
      );

      SecurityManager.logSecurityEvent('vault_qr_shared', {
        vaultId: vault?.id,
      });
    } catch (error) {
      console.error('QR share failed:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    }
  };

  const formatActivityTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'vault_accessed':
        return <Eye size={16} color="#34C759" />;
      case 'vault_locked':
        return <Lock size={16} color="#FF9500" />;
      case 'vault_unlocked':
        return <Eye size={16} color="#34C759" />;
      case 'item_added':
        return <Plus size={16} color="#007AFF" />;
      case 'item_deleted':
        return <Trash2 size={16} color="#FF3B30" />;
      case 'vault_exported':
        return <Share size={16} color="#AF52DE" />;
      case 'vault_link_shared':
        return <ExternalLink size={16} color="#AF52DE" />;
      case 'vault_qr_shared':
        return <Share size={16} color="#AF52DE" />;
      default:
        return <Activity size={16} color="#8E8E93" />;
    }
  };

  const getActivityDescription = (type: string, details?: any) => {
    switch (type) {
      case 'vault_accessed':
        return 'Vault was accessed';
      case 'vault_locked':
        return 'Vault was locked';
      case 'vault_unlocked':
        return 'Vault was unlocked';
      case 'item_added':
        return `Added ${details?.itemType || 'item'}: ${
          details?.itemName || 'Unknown'
        }`;
      case 'item_deleted':
        return `Deleted ${details?.itemType || 'item'}: ${
          details?.itemName || 'Unknown'
        }`;
      case 'vault_exported':
        return 'Vault data was exported';
      case 'vault_link_shared':
        return 'Sharing link was created';
      case 'vault_qr_shared':
        return 'QR code was generated for sharing';
      default:
        return 'Activity occurred';
    }
  };

  const togglePasswordVisibility = (itemId: string) => {
    setShowPassword((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const toggleSensitiveDataVisibility = (itemId: string) => {
    setShowSensitiveData((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const getItemIcon = (type: string) => {
    // Add null check for type
    if (!type) return <File size={20} color="#8E8E93" />;

    switch (type) {
      case 'photo':
        return <Camera size={20} color="#007AFF" />;
      case 'video':
        return <Video size={20} color="#FF6B35" />;
      case 'audio':
        return <Mic size={20} color="#9B59B6" />;
      case 'document':
        return <FileText size={20} color="#34C759" />;
      case 'card':
        return <CreditCard size={20} color="#FF9500" />;
      case 'identity':
        return <User size={20} color="#AF52DE" />;
      case 'password':
        return <Lock size={20} color="#FF3B30" />;
      case 'file':
        return <File size={20} color="#8E8E93" />;
      case 'note':
        return <StickyNote size={20} color="#FFD700" />;
      default:
        return <File size={20} color="#8E8E93" />;
    }
  };

  const getItemTypeLabel = (type: string) => {
    // Add null check for type
    if (!type) return 'Unknown';

    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
      } else {
        // For native platforms, you'd use @react-native-clipboard/clipboard
        console.log('Copy to clipboard:', text);
      }
      Alert.alert('Copied', `${label} copied to clipboard`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const openUrl = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    }
  };

  const playAudio = async (audioItem: any) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Audio playback not available',
        'Audio playback is not available on web platform'
      );
      return;
    }

    try {
      // Stop any currently playing audio
      if (audioSound) {
        await audioSound.unloadAsync();
        setAudioSound(null);
        setPlayingAudio(null);
      }

      if (playingAudio === audioItem.id) {
        return; // Already stopped
      }

      // Load and play new audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioItem.audioUrl || audioItem.encryptedData },
        { shouldPlay: true }
      );

      setAudioSound(sound);
      setPlayingAudio(audioItem.id);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAudio(null);
          setAudioSound(null);
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const stopAudio = async () => {
    if (audioSound) {
      await audioSound.unloadAsync();
      setAudioSound(null);
      setPlayingAudio(null);
    }
  };

  const filteredAndSortedItems = items
    .filter((item) => {
      const matchesSearch = (item.name || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFilter = !filterType || item.type === filterType;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        case 'date':
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

  const renderItemPreview = (item: SecureItem) => {
    switch (item.type) {
      case 'password':
        const passwordItem = item as any;
        return (
          <View style={styles.itemPreview}>
            <Text style={styles.previewLabel}>Website</Text>
            <Text style={styles.previewValue}>
              {passwordItem.website || 'No website'}
            </Text>
            <Text style={styles.previewLabel}>Username</Text>
            <Text style={styles.previewValue}>
              {passwordItem.username || 'No username'}
            </Text>
          </View>
        );
      case 'card':
        const cardItem = item as any;
        return (
          <View style={styles.itemPreview}>
            <Text style={styles.previewLabel}>Card Type</Text>
            <Text style={styles.previewValue}>
              {cardItem.cardType || 'Unknown'}
            </Text>
            <Text style={styles.previewLabel}>Last 4 digits</Text>
            <Text style={styles.previewValue}>
              ****{cardItem.cardNumber?.slice(-4) || '****'}
            </Text>
          </View>
        );
      case 'identity':
        const identityItem = item as any;
        return (
          <View style={styles.itemPreview}>
            <Text style={styles.previewLabel}>Type</Text>
            <Text style={styles.previewValue}>
              {identityItem.identityType || 'Unknown'}
            </Text>
            <Text style={styles.previewLabel}>Name</Text>
            <Text style={styles.previewValue}>
              {`${identityItem.firstName || ''} ${
                identityItem.lastName || ''
              }`.trim() || 'No name'}
            </Text>
          </View>
        );
      default:
        return (
          <Text style={styles.previewValue}>
            {item.notes || 'No additional details'}
          </Text>
        );
    }
  };

  const renderGridItem = (item: SecureItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.gridItem}
      onPress={() => handleItemPress(item)}
    >
      {item.type === 'photo' && (
        <Image
          source={{
            uri:
              (item as any).file_url ||
              (item as any).imageUrl ||
              photoUrls[item.id] ||
              ItemManager.generateImageUrl(item.id, 'medium'),
          }}
          style={styles.photoThumbnail}
          onError={(error) => {
            console.log('Image load error for', item.id, error);
            const fallbackUrl = ItemManager.generateImageUrl(item.id, 'medium');
            setPhotoUrls((prev) => ({ ...prev, [item.id]: fallbackUrl }));
          }}
        />
      )}
      {item.type !== 'photo' && (
        <View style={styles.itemIconContainer}>{getItemIcon(item.type)}</View>
      )}
      <Text style={styles.itemName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.itemType}>{getItemTypeLabel(item.type)}</Text>
      {renderItemPreview(item)}
    </TouchableOpacity>
  );

  const renderListItem = (item: SecureItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.listItem}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.listItemIcon}>{getItemIcon(item.type)}</View>
      <View style={styles.listItemInfo}>
        <Text style={styles.listItemName}>{item.name}</Text>
        <Text style={styles.listItemType}>{getItemTypeLabel(item.type)}</Text>
        <Text style={styles.listItemDate}>
          {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
        {renderItemPreview(item)}
      </View>
      <TouchableOpacity
        style={styles.listItemAction}
        onPress={() => handleItemPress(item)}
      >
        <MoreVertical size={20} color="#8E8E93" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderItemDetails = (item: SecureItem) => {
    switch (item.type) {
      case 'password':
        const passwordItem = item as any;
        return (
          <ScrollView style={styles.itemDetailsScroll}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Login Information</Text>

              {passwordItem.website && (
                <View style={styles.detailRow}>
                  <Globe size={16} color="#007AFF" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Website</Text>
                    <TouchableOpacity
                      onPress={() => openUrl(passwordItem.website)}
                    >
                      <Text style={[styles.detailValue, styles.linkText]}>
                        {passwordItem.website}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      copyToClipboard(passwordItem.website, 'Website')
                    }
                  >
                    <Copy size={16} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              )}

              {passwordItem.username && (
                <View style={styles.detailRow}>
                  <User size={16} color="#34C759" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Username</Text>
                    <Text style={styles.detailValue}>
                      {passwordItem.username}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      copyToClipboard(passwordItem.username, 'Username')
                    }
                  >
                    <Copy size={16} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.detailRow}>
                <Key size={16} color="#FF9500" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Password</Text>
                  <Text style={styles.detailValue}>
                    {showPassword[item.id] ? passwordItem.password : '••••••••'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => togglePasswordVisibility(item.id)}
                >
                  {showPassword[item.id] ? (
                    <EyeOff size={16} color="#8E8E93" />
                  ) : (
                    <Eye size={16} color="#8E8E93" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    copyToClipboard(passwordItem.password, 'Password')
                  }
                >
                  <Copy size={16} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {passwordItem.email && (
                <View style={styles.detailRow}>
                  <Mail size={16} color="#AF52DE" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{passwordItem.email}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(passwordItem.email, 'Email')}
                  >
                    <Copy size={16} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'card':
        const cardItem = item as any;
        return (
          <ScrollView style={styles.itemDetailsScroll}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Card Information</Text>

              <View style={styles.detailRow}>
                <Card size={16} color="#007AFF" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Card Number</Text>
                  <Text style={styles.detailValue}>
                    {showSensitiveData[item.id]
                      ? cardItem.cardNumber
                      : `****-****-****-${
                          cardItem.cardNumber?.slice(-4) || '****'
                        }`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleSensitiveDataVisibility(item.id)}
                >
                  {showSensitiveData[item.id] ? (
                    <EyeOff size={16} color="#8E8E93" />
                  ) : (
                    <Eye size={16} color="#8E8E93" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    copyToClipboard(cardItem.cardNumber, 'Card Number')
                  }
                >
                  <Copy size={16} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {cardItem.cardholderName && (
                <View style={styles.detailRow}>
                  <User size={16} color="#34C759" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Cardholder Name</Text>
                    <Text style={styles.detailValue}>
                      {cardItem.cardholderName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      copyToClipboard(
                        cardItem.cardholderName,
                        'Cardholder Name'
                      )
                    }
                  >
                    <Copy size={16} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              )}

              {cardItem.expiryDate && (
                <View style={styles.detailRow}>
                  <Calendar size={16} color="#FF9500" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Expiry Date</Text>
                    <Text style={styles.detailValue}>
                      {cardItem.expiryDate}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      copyToClipboard(cardItem.expiryDate, 'Expiry Date')
                    }
                  >
                    <Copy size={16} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              )}

              {cardItem.cvv && (
                <View style={styles.detailRow}>
                  <Shield size={16} color="#FF3B30" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>CVV</Text>
                    <Text style={styles.detailValue}>
                      {showSensitiveData[item.id] ? cardItem.cvv : '•••'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(cardItem.cvv, 'CVV')}
                  >
                    <Copy size={16} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'identity':
        const identityItem = item as any;
        return (
          <ScrollView style={styles.itemDetailsScroll}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>
                Identity Information
              </Text>

              {(identityItem.firstName || identityItem.lastName) && (
                <View style={styles.detailRow}>
                  <User size={16} color="#007AFF" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Full Name</Text>
                    <Text style={styles.detailValue}>
                      {`${identityItem.firstName || ''} ${
                        identityItem.lastName || ''
                      }`.trim()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      copyToClipboard(
                        `${identityItem.firstName || ''} ${
                          identityItem.lastName || ''
                        }`.trim(),
                        'Full Name'
                      )
                    }
                  >
                    <Copy size={16} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              )}

              {identityItem.idNumber && (
                <View style={styles.detailRow}>
                  <CreditCard size={16} color="#34C759" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>ID Number</Text>
                    <Text style={styles.detailValue}>
                      {showSensitiveData[item.id]
                        ? identityItem.idNumber
                        : `****${identityItem.idNumber?.slice(-4) || '****'}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleSensitiveDataVisibility(item.id)}
                  >
                    {showSensitiveData[item.id] ? (
                      <EyeOff size={16} color="#8E8E93" />
                    ) : (
                      <Eye size={16} color="#8E8E93" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      copyToClipboard(identityItem.idNumber, 'ID Number')
                    }
                  >
                    <Copy size={16} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              )}

              {identityItem.dateOfBirth && (
                <View style={styles.detailRow}>
                  <Calendar size={16} color="#FF9500" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Date of Birth</Text>
                    <Text style={styles.detailValue}>
                      {identityItem.dateOfBirth}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      copyToClipboard(identityItem.dateOfBirth, 'Date of Birth')
                    }
                  >
                    <Copy size={16} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              )}

              {identityItem.address && (
                <View style={styles.detailRow}>
                  <MapPin size={16} color="#AF52DE" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailValue}>
                      {identityItem.address}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      copyToClipboard(identityItem.address, 'Address')
                    }
                  >
                    <Copy size={16} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case 'note':
        const noteItem = item as any;
        return (
          <ScrollView style={styles.itemDetailsScroll}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Note Content</Text>
              <View style={styles.noteContent}>
                <Text style={styles.noteText}>
                  {noteItem.content || 'No content'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() =>
                  copyToClipboard(noteItem.content, 'Note content')
                }
              >
                <Copy size={16} color="#007AFF" />
                <Text style={styles.copyButtonText}>Copy Note</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case 'video':
        const videoItem = item as any;
        return (
          <ScrollView style={styles.itemDetailsScroll}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Video</Text>
              {videoItem.file_url && <VideoPlayer url={videoItem.file_url} />}
            </View>
          </ScrollView>
        );

      case 'audio':
        const audioItem = item as any;
        return (
          <ScrollView style={styles.itemDetailsScroll}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Audio</Text>
              {audioItem.file_url && <AudioPlayer url={audioItem.file_url} />}
            </View>
          </ScrollView>
        );

      case 'document':
      case 'file':
        const fileItem = item as any;
        return (
          <ScrollView style={styles.itemDetailsScroll}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>File Information</Text>

              <View style={styles.detailRow}>
                <File size={16} color="#007AFF" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Filename</Text>
                  <Text style={styles.detailValue}>
                    {fileItem.filename || 'Unknown'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => copyToClipboard(fileItem.filename, 'Filename')}
                >
                  <Copy size={16} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <View style={styles.detailRow}>
                <FileText size={16} color="#34C759" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>File Size</Text>
                  <Text style={styles.detailValue}>
                    {formatFileSize(fileItem.size || 0)}
                  </Text>
                </View>
              </View>

              {fileItem.mimeType && (
                <View style={styles.detailRow}>
                  <FileText size={16} color="#FF9500" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>File Type</Text>
                    <Text style={styles.detailValue}>{fileItem.mimeType}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.downloadButton}>
                <Download size={16} color="#007AFF" />
                <Text style={styles.downloadButtonText}>Download File</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      default:
        return (
          <View style={styles.itemDetailsContent}>
            <Text style={styles.itemDetailsDate}>
              Created: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <Text style={styles.itemDetailsDate}>
              Updated: {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
            {item.notes && (
              <>
                <Text style={styles.notesLabel}>Notes:</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </>
            )}
          </View>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading || itemsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading vault...</Text>
      </View>
    );
  }

  if (error || !vault) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Vault not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (vault.isLocked) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{vault.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.lockedContainer}>
          <View style={[styles.vaultIcon, { backgroundColor: vault.color }]}>
            <EyeOff size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.lockedTitle}>Vault Locked</Text>
          <Text style={styles.lockedSubtitle}>
            This vault is locked. Unlock it to view your secure items.
          </Text>
          <TouchableOpacity
            style={styles.unlockButton}
            onPress={handleUnlockVault}
          >
            <Eye size={20} color="#FFFFFF" />
            <Text style={styles.unlockButtonText}>Unlock Vault</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{vault.name}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleLockVault}>
          <EyeOff size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.vaultInfo}>
        <View
          style={[styles.vaultColorBar, { backgroundColor: vault.color }]}
        />
        <View style={styles.vaultDetails}>
          <Text style={styles.vaultDescription}>{vault.description}</Text>
          <Text style={styles.vaultStats}>
            {items.length} items • Last accessed{' '}
            {new Date(vault.lastAccessed).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowItemModal(true)}
        >
          <Plus size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Add Item</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Share size={20} color="#34C759" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleActivity}>
          <Activity size={20} color="#FF9500" />
          <Text style={styles.actionButtonText}>Activity</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#8E8E93" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setShowSortModal(true)}
        >
          <SortAsc size={20} color="#8E8E93" />
          <Text style={styles.toolbarButtonText}>Sort</Text>
        </TouchableOpacity>

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === 'grid' && styles.viewButtonActive,
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Grid
              size={20}
              color={viewMode === 'grid' ? '#007AFF' : '#8E8E93'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === 'list' && styles.viewButtonActive,
            ]}
            onPress={() => setViewMode('list')}
          >
            <List
              size={20}
              color={viewMode === 'list' ? '#007AFF' : '#8E8E93'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredAndSortedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Plus size={48} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || filterType
                ? 'No items match your search or filter'
                : 'Add your first secure item to get started'}
            </Text>
            {!searchQuery && !filterType && (
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => setShowItemModal(true)}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.addFirstButtonText}>Add Item</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View
            style={
              viewMode === 'grid' ? styles.gridContainer : styles.listContainer
            }
          >
            {filteredAndSortedItems.map((item) =>
              viewMode === 'grid' ? renderGridItem(item) : renderListItem(item)
            )}
          </View>
        )}
      </ScrollView>

      <ItemCreationModal
        visible={showItemModal}
        onClose={() => setShowItemModal(false)}
        vaultId={vault.id}
        onItemCreated={handleItemCreated}
      />

      <VaultSharingModal
        visible={showSharingModal}
        onClose={() => setShowSharingModal(false)}
        vaultId={vault.id}
        vaultName={vault.name}
      />

      {/* Item Details Modal */}
      <Modal
        visible={showItemDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowItemDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.itemDetailsModal}>
            {selectedItem && (
              <>
                <View style={styles.itemDetailsHeader}>
                  <View style={styles.itemDetailsIcon}>
                    {getItemIcon(selectedItem.type)}
                  </View>
                  <View style={styles.itemDetailsInfo}>
                    <Text style={styles.itemDetailsName}>
                      {selectedItem.name}
                    </Text>
                    <Text style={styles.itemDetailsType}>
                      {getItemTypeLabel(selectedItem.type)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeModalButton}
                    onPress={() => setShowItemDetails(false)}
                  >
                    <ArrowLeft size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {selectedItem.type === 'photo' && (
                  <View style={styles.photoContainer}>
                    <Image
                      source={{
                        uri:
                          (selectedItem as any).file_url ||
                          (selectedItem as any).imageUrl ||
                          photoUrls[selectedItem.id] ||
                          ItemManager.generateImageUrl(
                            selectedItem.id,
                            'large'
                          ),
                      }}
                      style={styles.fullPhoto}
                      resizeMode="contain"
                      onError={(error) => {
                        console.log(
                          'Full photo load error for',
                          selectedItem.id,
                          error
                        );
                        const fallbackUrl = ItemManager.generateImageUrl(
                          selectedItem.id,
                          'large'
                        );
                        setPhotoUrls((prev) => ({
                          ...prev,
                          [selectedItem.id]: fallbackUrl,
                        }));
                      }}
                    />
                  </View>
                )}

                {renderItemDetails(selectedItem)}
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      /* Edit functionality */
                    }}
                  >
                    <Edit3 size={20} color="#007AFF" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteItem(selectedItem)}
                  >
                    <Trash2 size={20} color="#FF3B30" />
                    <Text
                      style={[styles.actionButtonText, { color: '#FF3B30' }]}
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModal}>
            <Text style={styles.sortTitle}>Sort by</Text>
            {[
              { key: 'date', label: 'Date Modified' },
              { key: 'name', label: 'Name' },
              { key: 'type', label: 'Type' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  sortBy === option.key && styles.selectedSortOption,
                ]}
                onPress={() => {
                  setSortBy(option.key as any);
                  setShowSortModal(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.key && styles.selectedSortText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.sortModal}>
            <Text style={styles.sortTitle}>Filter by type</Text>
            {[
              { key: null, label: 'All Items' },
              { key: 'photo', label: 'Photos' },
              { key: 'document', label: 'Documents' },
              { key: 'card', label: 'Cards' },
              { key: 'password', label: 'Passwords' },
              { key: 'note', label: 'Notes' },
              { key: 'file', label: 'Files' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key || 'all'}
                style={[
                  styles.sortOption,
                  filterType === option.key && styles.selectedSortOption,
                ]}
                onPress={() => {
                  setFilterType(option.key);
                  setShowFilterModal(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    filterType === option.key && styles.selectedSortText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.shareModal}>
            <View style={styles.shareHeader}>
              <Text style={styles.shareTitle}>Share Vault</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowShareModal(false)}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.shareSubtitle}>
              Choose how you'd like to share "{vault?.name}"
            </Text>

            <View style={styles.shareOptions}>
              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShareVault('export')}
              >
                <View style={styles.shareOptionIcon}>
                  <Download size={24} color="#007AFF" />
                </View>
                <View style={styles.shareOptionText}>
                  <Text style={styles.shareOptionTitle}>Export Data</Text>
                  <Text style={styles.shareOptionDescription}>
                    Download vault data as encrypted JSON file
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShareVault('link')}
              >
                <View style={styles.shareOptionIcon}>
                  <ExternalLink size={24} color="#34C759" />
                </View>
                <View style={styles.shareOptionText}>
                  <Text style={styles.shareOptionTitle}>Share Link</Text>
                  <Text style={styles.shareOptionDescription}>
                    Create a secure sharing link for this vault
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShareVault('qr')}
              >
                <View style={styles.shareOptionIcon}>
                  <Share size={24} color="#FF9500" />
                </View>
                <View style={styles.shareOptionText}>
                  <Text style={styles.shareOptionTitle}>QR Code</Text>
                  <Text style={styles.shareOptionDescription}>
                    Generate QR code for easy sharing
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.shareWarning}>
              <Shield size={16} color="#FF9500" />
              <Text style={styles.shareWarningText}>
                Shared data will be encrypted and require authentication to
                access
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activity Modal */}
      <Modal
        visible={showActivityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowActivityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.activityModal}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityTitle}>Vault Activity</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowActivityModal(false)}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.activitySubtitle}>
              Recent activity for "{vault?.name}"
            </Text>

            <ScrollView
              style={styles.activityList}
              showsVerticalScrollIndicator={false}
            >
              {loadingActivity ? (
                <View style={styles.activityLoading}>
                  <Text style={styles.activityLoadingText}>
                    Loading activity...
                  </Text>
                </View>
              ) : activityLog.length === 0 ? (
                <View style={styles.activityEmpty}>
                  <Activity size={48} color="#8E8E93" />
                  <Text style={styles.activityEmptyTitle}>No Activity Yet</Text>
                  <Text style={styles.activityEmptySubtitle}>
                    Activity will appear here as you use this vault
                  </Text>
                </View>
              ) : (
                activityLog.map((activity, index) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={styles.activityItemIcon}>
                      {getActivityIcon(activity.type)}
                    </View>
                    <View style={styles.activityItemContent}>
                      <Text style={styles.activityItemTitle}>
                        {getActivityDescription(
                          activity.type,
                          activity.details
                        )}
                      </Text>
                      <Text style={styles.activityItemTime}>
                        {formatActivityTime(activity.timestamp)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.clearActivityButton}
              onPress={async () => {
                Alert.alert(
                  'Clear Activity Log',
                  'Are you sure you want to clear the activity log for this vault?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: async () => {
                        await SecurityManager.clearVaultActivity(
                          vault?.id || ''
                        );
                        setActivityLog([]);
                      },
                    },
                  ]
                );
              }}
            >
              <Trash2 size={16} color="#FF3B30" />
              <Text style={styles.clearActivityButtonText}>
                Clear Activity Log
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FF3B30',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  vaultInfo: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  vaultColorBar: {
    width: 4,
    borderRadius: 2,
    marginRight: 16,
  },
  vaultDetails: {
    flex: 1,
  },
  vaultDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  vaultStats: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  filterButton: {
    padding: 8,
    marginLeft: 8,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolbarButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 2,
  },
  viewButton: {
    padding: 8,
    borderRadius: 6,
  },
  viewButtonActive: {
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  itemPreview: {
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
    marginBottom: 2,
  },
  previewValue: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  photoThumbnail: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoPlaceholder: {
    backgroundColor: '#48484A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginTop: 4,
  },
  itemIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#48484A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  listContainer: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#48484A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  listItemType: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginBottom: 2,
  },
  listItemDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  listItemAction: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  addFirstButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  vaultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  unlockButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetailsModal: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 0,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  itemDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#48484A',
  },
  itemDetailsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#48484A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemDetailsInfo: {
    flex: 1,
  },
  itemDetailsName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  itemDetailsType: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  closeModalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#48484A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoContainer: {
    padding: 20,
  },
  fullPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    objectFit: 'cover',
  },
  itemDetailsScroll: {
    maxHeight: 400,
  },
  detailSection: {
    padding: 20,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  linkText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  noteContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  copyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
    marginLeft: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  downloadButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
    marginLeft: 8,
  },
  itemDetailsContent: {
    padding: 20,
  },
  itemDetailsDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    lineHeight: 20,
  },
  itemActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
  },
  sortModal: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    marginTop: 'auto',
  },
  sortTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  sortOption: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSortOption: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  sortOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  selectedSortText: {
    color: '#007AFF',
  },
  shareModal: {
    backgroundColor: '#2C2C2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingTop: 20,
    marginTop: 'auto',
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  shareTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  shareSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  shareOptions: {
    paddingHorizontal: 20,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  shareOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  shareOptionText: {
    flex: 1,
  },
  shareOptionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  shareOptionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  shareWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    margin: 20,
    marginTop: 16,
  },
  shareWarningText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FF9500',
    marginLeft: 8,
    flex: 1,
  },
  activityModal: {
    backgroundColor: '#2C2C2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
    marginTop: 'auto',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  activitySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  activityList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  activityLoading: {
    padding: 40,
    alignItems: 'center',
  },
  activityLoadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  activityEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  activityEmptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  activityEmptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  activityItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#48484A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityItemContent: {
    flex: 1,
  },
  activityItemTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activityItemTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  clearActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginTop: 16,
  },
  clearActivityButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FF3B30',
    marginLeft: 8,
  },
  videoPlayer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#000000',
  },
  videoItem: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  videoThumbnail: {
    height: 120,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  videoDurationText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  videoOverlay: {
    padding: 12,
  },
  videoName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  videoSize: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  audioItem: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  audioPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9B59B6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  waveformBar: {
    width: 2,
    backgroundColor: '#9B59B6',
    marginHorizontal: 1,
    borderRadius: 1,
  },
  audioInfo: {
    marginTop: 8,
  },
  audioName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  audioDuration: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
});
