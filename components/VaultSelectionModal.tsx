import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { X, FolderOpen, Plus, Check } from 'lucide-react-native';
import { useVaults } from '@/hooks/useVaults';

interface VaultSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onVaultSelected: (vaultId: string) => void;
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
}

export default function VaultSelectionModal({
  visible,
  onClose,
  onVaultSelected,
  title = 'Choose Vault',
  subtitle = 'Select where to save this item',
  isLoading = false,
}: VaultSelectionModalProps) {
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const { data: vaults = [], isLoading: loading } = useVaults();

  useEffect(() => {
    if (vaults.length > 0 && !selectedVaultId) {
      const mostRecent = vaults.reduce((prev, current) =>
        prev.lastAccessed > current.lastAccessed ? prev : current
      );
      setSelectedVaultId(mostRecent.id);
    }
  }, [vaults, selectedVaultId]);

  const handleCreateNewVault = () => {
    Alert.alert(
      'Create New Vault',
      'You can create a new vault from the main vaults screen.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleConfirm = () => {
    if (selectedVaultId) {
      onVaultSelected(selectedVaultId);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>{subtitle}</Text>

          <ScrollView
            style={styles.vaultsList}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading vaults...</Text>
              </View>
            ) : vaults.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FolderOpen size={48} color="#8E8E93" />
                <Text style={styles.emptyTitle}>No unlocked vaults</Text>
                <Text style={styles.emptySubtitle}>
                  Create a vault or unlock an existing one to save items
                </Text>
                <TouchableOpacity
                  style={styles.createVaultButton}
                  onPress={handleCreateNewVault}
                >
                  <Plus size={20} color="#FFFFFF" />
                  <Text style={styles.createVaultButtonText}>Create Vault</Text>
                </TouchableOpacity>
              </View>
            ) : (
              vaults.map((vault) => (
                <TouchableOpacity
                  key={vault.id}
                  style={[
                    styles.vaultOption,
                    selectedVaultId === vault.id && styles.selectedVaultOption,
                  ]}
                  onPress={() => setSelectedVaultId(vault.id)}
                >
                  <View
                    style={[styles.vaultIcon, { backgroundColor: vault.color }]}
                  >
                    <FolderOpen size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.vaultInfo}>
                    <Text style={styles.vaultName}>{vault.name}</Text>
                    <Text style={styles.vaultDescription}>
                      {vault.description}
                    </Text>
                    <Text style={styles.vaultStats}>
                      {vault.itemCount} items • Last accessed{' '}
                      {new Date(vault.lastAccessed).toLocaleDateString()}
                    </Text>
                  </View>
                  {selectedVaultId === vault.id && (
                    <View style={styles.checkIcon}>
                      <Check size={20} color="#007AFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedVaultId || isLoading) && styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={!selectedVaultId || isLoading}
            >
              <Text style={styles.confirmButtonText}>
                {isLoading ? 'Saving...' : 'Save Here'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2C2C2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  vaultsList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  createVaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  createVaultButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  vaultOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedVaultOption: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
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
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  vaultDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  vaultStats: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
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
  confirmButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginLeft: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#48484A',
    opacity: 0.5,
  },
});
