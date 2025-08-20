import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Switch } from 'react-native';
import { X, Users, Share2, Shield, Eye, EyeOff, Lock, Crown, User, Baby } from 'lucide-react-native';
import { FamilyManager, FamilyMember } from '@/utils/FamilyManager';
import { VaultManager } from '@/utils/VaultManager';

interface VaultSharingModalProps {
  visible: boolean;
  onClose: () => void;
  vaultId: string;
  vaultName: string;
}

export default function VaultSharingModal({ visible, onClose, vaultId, vaultName }: VaultSharingModalProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [sharedWith, setSharedWith] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadFamilyMembers();
    }
  }, [visible]);

  const loadFamilyMembers = async () => {
    try {
      setLoading(true);
      const familyGroup = await FamilyManager.getFamilyGroup();
      if (familyGroup) {
        // Filter out the current user (owner)
        const otherMembers = familyGroup.members.filter(member => member.role !== 'owner');
        setFamilyMembers(otherMembers);
        
        // Check which members already have access to this vault
        const sharedVaults = await FamilyManager.getSharedVaults();
        if (sharedVaults.includes(vaultId)) {
          // If vault is shared, all family members have access
          const memberIds = new Set(otherMembers.map(m => m.id));
          setSharedWith(memberIds);
        }
      }
    } catch (error) {
      console.error('Failed to load family members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSharing = async (memberId: string, shouldShare: boolean) => {
    try {
      if (shouldShare) {
        // Add member to shared vault
        setSharedWith(prev => new Set([...prev, memberId]));
        
        // If this is the first member being shared with, share the vault with family
        if (sharedWith.size === 0) {
          await FamilyManager.shareVaultWithFamily(vaultId);
        }
      } else {
        // Remove member from shared vault
        setSharedWith(prev => {
          const newSet = new Set(prev);
          newSet.delete(memberId);
          return newSet;
        });
        
        // If no members are shared with, unshare the vault
        if (sharedWith.size === 1 && sharedWith.has(memberId)) {
          await FamilyManager.unshareVaultFromFamily(vaultId);
        }
      }
    } catch (error) {
      console.error('Failed to toggle vault sharing:', error);
      Alert.alert('Error', 'Failed to update vault sharing');
    }
  };

  const handleShareWithAll = async () => {
    try {
      await FamilyManager.shareVaultWithFamily(vaultId);
      const allMemberIds = new Set(familyMembers.map(m => m.id));
      setSharedWith(allMemberIds);
      Alert.alert('Success', `"${vaultName}" is now shared with all family members`);
    } catch (error) {
      Alert.alert('Error', 'Failed to share vault with family');
    }
  };

  const handleUnshareAll = async () => {
    Alert.alert(
      'Unshare Vault',
      `Are you sure you want to stop sharing "${vaultName}" with your family?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unshare',
          style: 'destructive',
          onPress: async () => {
            try {
              await FamilyManager.unshareVaultFromFamily(vaultId);
              setSharedWith(new Set());
              Alert.alert('Success', 'Vault is no longer shared with family');
            } catch (error) {
              Alert.alert('Error', 'Failed to unshare vault');
            }
          }
        }
      ]
    );
  };

  const getMemberIcon = (member: FamilyMember) => {
    switch (member.role) {
      case 'owner':
        return <Crown size={20} color="#FFD700" />;
      case 'adult':
        return <User size={20} color="#007AFF" />;
      case 'child':
        return <Baby size={20} color="#34C759" />;
      default:
        return <User size={20} color="#8E8E93" />;
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
            <Text style={styles.title}>Share Vault</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.vaultInfo}>
            <Shield size={24} color="#007AFF" />
            <Text style={styles.vaultName}>{vaultName}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading family members...</Text>
            </View>
          ) : familyMembers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={48} color="#8E8E93" />
              <Text style={styles.emptyTitle}>No Family Members</Text>
              <Text style={styles.emptySubtitle}>
                Invite family members to start sharing vaults securely
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.quickActions}>
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={handleShareWithAll}
                >
                  <Share2 size={16} color="#34C759" />
                  <Text style={styles.quickActionText}>Share with All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={handleUnshareAll}
                >
                  <Lock size={16} color="#FF3B30" />
                  <Text style={styles.quickActionText}>Unshare All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
                {familyMembers.map((member) => (
                  <View key={member.id} style={styles.memberItem}>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberAvatar}>
                        {getMemberIcon(member)}
                      </View>
                      <View style={styles.memberDetails}>
                        <Text style={styles.memberName}>
                          {member.firstName} {member.lastName}
                        </Text>
                        <Text style={styles.memberRole}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={sharedWith.has(member.id)}
                      onValueChange={(value) => handleToggleSharing(member.id, value)}
                      trackColor={{ false: '#48484A', true: '#007AFF' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                ))}
              </ScrollView>

              <View style={styles.securityNotice}>
                <Shield size={16} color="#34C759" />
                <Text style={styles.securityText}>
                  Shared vaults maintain end-to-end encryption. Family members can view and add content based on their permissions.
                </Text>
              </View>
            </>
          )}
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
    marginBottom: 20,
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
  vaultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  vaultName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 12,
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
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  quickActionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  membersList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 12,
    padding: 16,
    margin: 20,
  },
  securityText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#34C759',
    marginLeft: 12,
    flex: 1,
    lineHeight: 16,
  },
});