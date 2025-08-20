import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users, UserPlus, Settings, Shield, Activity, Crown, User, Baby, Mail, MoveVertical as MoreVertical, Trash2, CreditCard as Edit3 } from 'lucide-react-native';
import { FamilyManager, FamilyGroup, FamilyMember } from '@/utils/FamilyManager';
import { SubscriptionManager } from '@/utils/SubscriptionManager';

export default function FamilyScreen() {
  const router = useRouter();
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'adult' | 'child'>('adult');
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity'>('overview');

  useEffect(() => {
    loadFamilyData();
  }, []);

  const loadFamilyData = async () => {
    try {
      setLoading(true);
      const group = await FamilyManager.getFamilyGroup();
      setFamilyGroup(group);
    } catch (error) {
      console.error('Failed to load family data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Error', 'Please enter a family name');
      return;
    }

    try {
      // Check if user has premium subscription
      const subscription = await SubscriptionManager.getSubscriptionStatus();
      if (!subscription.isActive) {
        Alert.alert(
          'Premium Required',
          'Family sharing requires a premium subscription. Would you like to upgrade?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/paywall') }
          ]
        );
        return;
      }

      // For demo purposes, we'll create a family group with demo user info
      // In production, this would use actual user profile data
      const group = await FamilyManager.createFamilyGroup(familyName, {
        email: 'owner@vaultify.com',
        firstName: 'John',
        lastName: 'Doe'
      });
      
      setFamilyGroup(group);
      setShowCreateModal(false);
      setFamilyName('');
      Alert.alert('Success', 'Family group created successfully!');
    } catch (error) {
      console.error('Create family error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create family group');
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      await FamilyManager.inviteFamilyMember(inviteEmail, inviteRole);
      
      // Show success with invitation details
      Alert.alert(
        '📧 Invitation Sent!',
        `An invitation has been sent to ${inviteEmail}.\n\nFor demo purposes, the invitation link has been copied to your clipboard. In a real app, this would be sent via email.\n\nThe invitation expires in 7 days.`,
        [
          {
            text: 'View Link',
            onPress: () => {
              // Generate the invitation link for display
              const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
              Alert.alert(
                'Invitation Link',
                `Share this link with ${inviteEmail}:\n\n${baseUrl}/family/join/demo-token-${Date.now()}`,
                [{ text: 'OK' }]
              );
            }
          },
          { text: 'OK' }
        ]
      );
      
      setShowInviteModal(false);
      setInviteEmail('');
      loadFamilyData();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send invitation');
    }
  };

  const handleRemoveMember = (member: FamilyMember) => {
    Alert.alert(
      'Remove Family Member',
      `Are you sure you want to remove ${member.firstName} ${member.lastName} from the family?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await FamilyManager.removeFamilyMember(member.id);
              Alert.alert('Success', 'Member removed from family');
              loadFamilyData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Users size={24} color="#007AFF" />
          <Text style={styles.statNumber}>{familyGroup?.members.length || 0}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statCard}>
          <Shield size={24} color="#34C759" />
          <Text style={styles.statNumber}>{familyGroup?.sharedVaults.length || 0}</Text>
          <Text style={styles.statLabel}>Shared Vaults</Text>
        </View>
        <View style={styles.statCard}>
          <Activity size={24} color="#FF9500" />
          <Text style={styles.statNumber}>{familyGroup?.usageStats.activeMembers || 0}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Family Sharing Benefits</Text>
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Shield size={16} color="#34C759" />
            <Text style={styles.benefitText}>Share premium features with up to 6 family members</Text>
          </View>
          <View style={styles.benefitItem}>
            <Users size={16} color="#007AFF" />
            <Text style={styles.benefitText}>Collaborative vault access with permissions</Text>
          </View>
          <View style={styles.benefitItem}>
            <Activity size={16} color="#FF9500" />
            <Text style={styles.benefitText}>Family activity monitoring and security</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMembers = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity 
        style={styles.inviteButton} 
        onPress={() => setShowInviteModal(true)}
      >
        <UserPlus size={20} color="#FFFFFF" />
        <Text style={styles.inviteButtonText}>Invite Family Member</Text>
      </TouchableOpacity>

      {familyGroup?.members.map((member) => (
        <View key={member.id} style={styles.memberCard}>
          <View style={styles.memberHeader}>
            <View style={styles.memberAvatar}>
              {member.role === 'owner' && <Crown size={20} color="#FFD700" />}
              {member.role === 'adult' && <User size={20} color="#007AFF" />}
              {member.role === 'child' && <Baby size={20} color="#34C759" />}
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.firstName} {member.lastName}</Text>
              <Text style={styles.memberEmail}>{member.email}</Text>
              <Text style={styles.memberRole}>{member.role.toUpperCase()}</Text>
            </View>
            <View style={styles.memberStatus}>
              <View style={[styles.statusDot, { backgroundColor: member.status === 'active' ? '#34C759' : '#FF9500' }]} />
              <Text style={styles.statusText}>{member.status}</Text>
            </View>
            {member.role !== 'owner' && (
              <TouchableOpacity
                style={styles.memberActions}
                onPress={() => handleRemoveMember(member)}
              >
                <MoreVertical size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.memberPermissions}>
            <Text style={styles.permissionsTitle}>Permissions:</Text>
            <View style={styles.permissionsList}>
              {member.permissions.canCreateVaults && (
                <Text style={styles.permissionItem}>• Create Vaults</Text>
              )}
              {member.permissions.canShareContent && (
                <Text style={styles.permissionItem}>• Share Content</Text>
              )}
              {member.permissions.canInviteMembers && (
                <Text style={styles.permissionItem}>• Invite Members</Text>
              )}
              {member.permissions.canManageFamily && (
                <Text style={styles.permissionItem}>• Manage Family</Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderActivity = () => (
    <View style={styles.tabContent}>
      <Text style={styles.comingSoonText}>Activity monitoring coming soon...</Text>
      <Text style={styles.comingSoonSubtext}>
        Track family member activity, vault access, and security events.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Family Sharing</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading family data...</Text>
        </View>
      </View>
    );
  }

  if (!familyGroup) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Family Sharing</Text>
        </View>

        <View style={styles.emptyState}>
          <Users size={64} color="#8E8E93" />
          <Text style={styles.emptyTitle}>No Family Group</Text>
          <Text style={styles.emptySubtitle}>
            Create a family group to share premium features with up to 6 family members
          </Text>
          <TouchableOpacity 
            style={styles.createFamilyButton} 
            onPress={() => setShowCreateModal(true)}
          >
            <UserPlus size={20} color="#FFFFFF" />
            <Text style={styles.createFamilyButtonText}>Create Family Group</Text>
          </TouchableOpacity>
        </View>

        {/* Create Family Modal */}
        <Modal
          visible={showCreateModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Family Group</Text>
              <Text style={styles.modalSubtitle}>
                Choose a name for your family group
              </Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Family Name"
                placeholderTextColor="#8E8E93"
                value={familyName}
                onChangeText={setFamilyName}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowCreateModal(false);
                    setFamilyName('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateFamily}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Family Sharing</Text>
      </View>

      <View style={styles.familyHeader}>
        <Text style={styles.familyName}>{familyGroup.name}</Text>
        <Text style={styles.familySubtitle}>
          {familyGroup.members.length} of 6 members
        </Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
            Members
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
          onPress={() => setActiveTab('activity')}
        >
          <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>
            Activity
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'members' && renderMembers()}
        {activeTab === 'activity' && renderActivity()}
      </ScrollView>

      {/* Invite Member Modal */}
      <Modal
        visible={showInviteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Family Member</Text>
            <Text style={styles.modalSubtitle}>
              Send an invitation to join your family group
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Email Address"
              placeholderTextColor="#8E8E93"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.roleSelector}>
              <Text style={styles.roleSelectorLabel}>Role:</Text>
              <View style={styles.roleOptions}>
                <TouchableOpacity
                  style={[styles.roleOption, inviteRole === 'adult' && styles.selectedRole]}
                  onPress={() => setInviteRole('adult')}
                >
                  <User size={20} color={inviteRole === 'adult' ? '#007AFF' : '#8E8E93'} />
                  <Text style={[styles.roleText, inviteRole === 'adult' && styles.selectedRoleText]}>
                    Adult
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, inviteRole === 'child' && styles.selectedRole]}
                  onPress={() => setInviteRole('child')}
                >
                  <Baby size={20} color={inviteRole === 'child' ? '#007AFF' : '#8E8E93'} />
                  <Text style={[styles.roleText, inviteRole === 'child' && styles.selectedRoleText]}>
                    Child
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleInviteMember}
              >
                <Text style={styles.createButtonText}>Send Invitation</Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  createFamilyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  createFamilyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  familyHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  familyName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  familySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 24,
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
  infoCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginLeft: 12,
    flex: 1,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
  },
  inviteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  memberCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  memberStatus: {
    alignItems: 'center',
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  memberActions: {
    padding: 4,
  },
  memberPermissions: {
    borderTopWidth: 1,
    borderTopColor: '#48484A',
    paddingTop: 12,
  },
  permissionsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  permissionItem: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginRight: 16,
    marginBottom: 4,
  },
  comingSoonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 12,
  },
  comingSoonSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#48484A',
  },
  roleSelector: {
    marginBottom: 24,
  },
  roleSelectorLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  roleOptions: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 4,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectedRole: {
    backgroundColor: '#007AFF',
  },
  roleText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
    marginLeft: 8,
  },
  selectedRoleText: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
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
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});