import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Plus, FolderOpen, Lock, Eye, Search, MoveVertical as MoreVertical, Star, TrendingUp, Shield, Clock, Filter, Import as SortAsc, Calendar, Image as ImageIcon } from 'lucide-react-native';
import { Video, Mic } from 'lucide-react-native';
import { VaultManager } from '@/utils/VaultManager';
import { SecurityManager } from '@/utils/SecurityManager';
import { SubscriptionManager } from '@/utils/SubscriptionManager';
import PremiumFeatureCard from '@/components/PremiumFeatureCard';
import StorageIndicator from '@/components/StorageIndicator';

interface Vault {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  createdAt: number;
  lastAccessed: number;
  isLocked: boolean;
  color: string;
}

export default function VaultsScreen() {
  const router = useRouter();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultDescription, setNewVaultDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#007AFF');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'photos'>('date');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [stats, setStats] = useState({ totalPhotos: 0, totalVaults: 0, recentActivity: 0 });
  const [favoriteVaults, setFavoriteVaults] = useState<Set<string>>(new Set());

  const vaultColors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FF2D92'];

  useEffect(() => {
    loadVaults();
  }, [sortBy]);

  const loadVaults = async () => {
    try {
      const vaultData = await VaultManager.getAllVaults();
      
      // Calculate stats
      const totalItems = vaultData.reduce((sum, vault) => sum + vault.itemCount, 0);
      const recentActivity = vaultData.filter(v => 
        Date.now() - v.lastAccessed < 24 * 60 * 60 * 1000
      ).length;
      
      setStats({
        totalPhotos: totalItems,
        totalVaults: vaultData.length,
        recentActivity
      });
      
      // Sort vaults
      const sortedVaults = [...vaultData].sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'photos':
            return b.itemCount - a.itemCount;
          case 'date':
          default:
            return b.lastAccessed - a.lastAccessed;
        }
      });
      
      setVaults(sortedVaults);
    } catch (error) {
      console.error('Failed to load vaults:', error);
    }
  };

  const createVault = async () => {
    if (!newVaultName.trim()) {
      Alert.alert('Error', 'Please enter a vault name');
      return;
    }

    // Check subscription limits
    const canCreate = await SubscriptionManager.canCreateVault();
    if (!canCreate.allowed) {
      Alert.alert('Upgrade Required', canCreate.reason);
      return;
    }

    try {
      await VaultManager.createVault(newVaultName, newVaultDescription, selectedColor);
      await SubscriptionManager.incrementUsage('vault');
      setShowCreateModal(false);
      setNewVaultName('');
      setNewVaultDescription('');
      setSelectedColor('#007AFF');
      loadVaults();
      SecurityManager.logSecurityEvent('vault_created', { name: newVaultName });
    } catch (error) {
      Alert.alert('Error', 'Failed to create vault');
    }
  };

  const openVault = (vault: Vault) => {
    SecurityManager.logSecurityEvent('vault_accessed', { vaultId: vault.id });
    router.push(`/vault/${vault.id}`);
  };

  const toggleFavorite = (vaultId: string) => {
    const newFavorites = new Set(favoriteVaults);
    if (newFavorites.has(vaultId)) {
      newFavorites.delete(vaultId);
    } else {
      newFavorites.add(vaultId);
    }
    setFavoriteVaults(newFavorites);
  };

  const showVaultOptions = (vault: Vault) => {
    Alert.alert(
      vault.name,
      'Choose an action',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: vault.isLocked ? 'Unlock' : 'Lock',
          onPress: () => toggleVaultLock(vault)
        },
        { 
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteVault(vault)
        }
      ]
    );
  };

  const toggleVaultLock = async (vault: Vault) => {
    try {
      if (vault.isLocked) {
        await VaultManager.unlockVault(vault.id);
      } else {
        await VaultManager.lockVault(vault.id);
      }
      loadVaults();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle vault lock');
    }
  };

  const deleteVault = (vault: Vault) => {
    Alert.alert(
      'Delete Vault',
      `Are you sure you want to delete "${vault.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await VaultManager.deleteVault(vault.id);
              loadVaults();
              SecurityManager.logSecurityEvent('vault_deleted', { vaultId: vault.id });
            } catch (error) {
              Alert.alert('Error', 'Failed to delete vault');
            }
          }
        }
      ]
    );
  };

  const filteredVaults = vaults.filter(vault => {
    const matchesSearch = vault.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vault.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterFavorites || favoriteVaults.has(vault.id);
    return matchesSearch && matchesFilter;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vaultify</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}
          >
            <SortAsc size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <FolderOpen size={20} color="#007AFF" />
          <Text style={styles.statNumber}>{stats.totalVaults}</Text>
          <Text style={styles.statLabel}>Vaults</Text>
        </View>
        <View style={styles.statCard}>
          <ImageIcon size={20} color="#34C759" />
          <Text style={styles.statNumber}>{stats.totalPhotos}</Text>
          <Text style={styles.statLabel}>Media</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={20} color="#FF9500" />
          <Text style={styles.statNumber}>{stats.recentActivity}</Text>
          <Text style={styles.statLabel}>Recent</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#8E8E93" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search vaults..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[styles.filterButton, filterFavorites && styles.filterButtonActive]}
          onPress={() => setFilterFavorites(!filterFavorites)}
        >
          <Filter size={16} color={filterFavorites ? "#007AFF" : "#8E8E93"} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.vaultsList} showsVerticalScrollIndicator={false}>
        {filteredVaults.map((vault) => (
          <TouchableOpacity
            key={vault.id}
            style={styles.vaultCard}
            onPress={() => openVault(vault)}
          >
            <View style={styles.vaultHeader}>
              <View style={[styles.vaultIcon, { backgroundColor: vault.color }]}>
                <FolderOpen size={24} color="#FFFFFF" />
              </View>
              <View style={styles.vaultInfo}>
                <Text style={styles.vaultName}>{vault.name}</Text>
                <Text style={styles.vaultDescription}>{vault.description}</Text>
              </View>
              <TouchableOpacity 
                style={styles.favoriteButton}
                onPress={() => toggleFavorite(vault.id)}
              >
                <Star 
                  size={16} 
                  color={favoriteVaults.has(vault.id) ? "#FFD700" : "#8E8E93"}
                  fill={favoriteVaults.has(vault.id) ? "#FFD700" : "transparent"}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.vaultActions}
                onPress={() => showVaultOptions(vault)}
              >
                <MoreVertical size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.vaultStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{vault.itemCount}</Text>
                <Text style={styles.statLabel}>Items</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {vault.lastAccessed > Date.now() - 24 * 60 * 60 * 1000 ? 'Today' : 
                   vault.lastAccessed > Date.now() - 7 * 24 * 60 * 60 * 1000 ? 'This week' :
                   new Date(vault.lastAccessed).toLocaleDateString()}
                </Text>
                <Text style={styles.statLabel}>Last Accessed</Text>
              </View>
              <View style={styles.statItem}>
                {vault.isLocked ? (
                  <Lock size={16} color="#FF3B30" />
                ) : (
                  <Eye size={16} color="#34C759" />
                )}
                <Text style={[styles.statLabel, { color: vault.isLocked ? '#FF3B30' : '#34C759' }]}>
                  {vault.isLocked ? 'Locked' : 'Unlocked'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {filteredVaults.length === 0 && (
          <View style={styles.emptyState}>
            <FolderOpen size={48} color="#8E8E93" />
            <Text style={styles.emptyTitle}>
              {searchQuery || filterFavorites ? 'No vaults found' : 'No vaults yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || filterFavorites 
                ? 'Try adjusting your search or filters'
                : 'Create your first vault to get started'
              }
            </Text>
            {!searchQuery && !filterFavorites && (
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.createFirstButtonText}>Create Vault</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Show premium card if user is approaching or at vault limit */}
        {vaults.length >= 2 && (
          <>
            <StorageIndicator compact={true} />
          <PremiumFeatureCard
            title="Unlock Unlimited Vaults"
            description={`You have ${vaults.length}/3 vaults. Upgrade for unlimited vaults and advanced features.`}
            features={[
              'Unlimited vaults and photos',
              'Advanced security features',
              'Cloud backup and sync',
              'Break-in detection',
              'Priority support'
            ]}
            compact={true}
          />
          </>
        )}
      </ScrollView>

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
            <Text style={styles.sortTitle}>Sort Vaults</Text>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortBy === 'date' && styles.selectedSortOption]}
              onPress={() => {
                setSortBy('date');
                setShowSortModal(false);
              }}
            >
              <Clock size={20} color={sortBy === 'date' ? '#007AFF' : '#8E8E93'} />
              <Text style={[styles.sortOptionText, sortBy === 'date' && styles.selectedSortText]}>
                Last Accessed
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortBy === 'name' && styles.selectedSortOption]}
              onPress={() => {
                setSortBy('name');
                setShowSortModal(false);
              }}
            >
              <SortAsc size={20} color={sortBy === 'name' ? '#007AFF' : '#8E8E93'} />
              <Text style={[styles.sortOptionText, sortBy === 'name' && styles.selectedSortText]}>
                Name
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortOption, sortBy === 'photos' && styles.selectedSortOption]}
              onPress={() => {
                setSortBy('photos');
                setShowSortModal(false);
              }}
            >
              <ImageIcon size={20} color={sortBy === 'photos' ? '#007AFF' : '#8E8E93'} />
              <Text style={[styles.sortOptionText, sortBy === 'photos' && styles.selectedSortText]}>
                Item Count
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Vault Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Vault</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Vault Name"
              placeholderTextColor="#8E8E93"
              value={newVaultName}
              onChangeText={setNewVaultName}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Description (optional)"
              placeholderTextColor="#8E8E93"
              value={newVaultDescription}
              onChangeText={setNewVaultDescription}
            />
            
            <View style={styles.colorPicker}>
              <Text style={styles.colorPickerLabel}>Choose Color:</Text>
              <View style={styles.colorOptions}>
                {vaultColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedColor
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewVaultName('');
                  setNewVaultDescription('');
                  setSelectedColor('#007AFF');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, !newVaultName.trim() && styles.disabledButton]}
                onPress={createVault}
                disabled={!newVaultName.trim()}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sortButton: {
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
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
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  vaultsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  vaultCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  vaultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vaultIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vaultInfo: {
    flex: 1,
  },
  vaultName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  vaultDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  favoriteButton: {
    padding: 8,
    marginRight: 8,
  },
  vaultActions: {
    padding: 4,
  },
  vaultStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
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
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  createFirstButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  colorPicker: {
    marginBottom: 24,
  },
  colorPickerLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  colorOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#48484A',
    borderRadius: 12,
    padding: 16,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginLeft: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#48484A',
    opacity: 0.5,
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
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 12,
  },
  selectedSortText: {
    color: '#007AFF',
  },
});