import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Switch } from 'react-native';
import { X, Users, UserPlus, Settings, Shield, Activity, CreditCard, MapPin, Clock, Mail, Crown, User, Baby } from 'lucide-react-native';
import { FamilyManager, FamilyGroup, FamilyMember, FamilyActivity, ParentalControls } from '@/utils/FamilyManager';

interface FamilyManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FamilyManagementModal({ visible, onClose }: FamilyManagementModalProps) {
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [currentMember, setCurrentMember] = useState<FamilyMember | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity' | 'settings' | 'billing'>('overview');
  const [loading, setLoading] = useState(true);
  const [familyActivity, setFamilyActivity] = useState<FamilyActivity[]>([]);
  
  // Invitation state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'adult' | 'child'>('adult');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  
  // Parental controls state
  const [showParentalControls, setShowParentalControls] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [parentalControls, setParentalControls] = useState<ParentalControls>({
    contentFiltering: true,
    timeRestrictions: {
      enabled: false,
      allowedHours: [{ start: '09:00', end: '21:00' }],
      allowedDays: [1, 2, 3, 4, 5, 6, 0]
    },
    approvalRequired: {
      newVaults: false,
      sharing: true,
      invitations: true
    },
    blockedFeatures: []
  });

  useEffect(() => {
    if (visible) {
      loadFamilyData();
    }
  }, [visible]);

  const loadFamilyData = async () => {
    try {
      setLoading(true);
      const group = await FamilyManager.getFamilyGroup();
      setFamilyGroup(group);
      
      if (group) {
        const activity = await FamilyManager.getFamilyActivity(20);
        setFamilyActivity(activity);
      }
    } catch (error) {
      console.error('Failed to load family data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async () => {
    try {
      Alert.prompt(
        'Create Family Group',
        'Enter a name for your family group:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create',
            onPress: async (familyName) => {
              if (familyName) {
                const group = await FamilyManager.createFamilyGroup(familyName, {
                  email: 'user@example.com',
                  firstName: 'Family',
                  lastName: 'Owner'
                });
                setFamilyGroup(group);
                Alert.alert('Success', 'Family group created successfully!');
              }
            }
          }
        ],
        'plain-text',
        'My Family'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create family group');
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteFirstName || !inviteLastName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await FamilyManager.inviteFamilyMember(inviteEmail, inviteRole);
      Alert.alert('Success', `Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
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

  const handleUpdateParentalControls = async () => {
    try {
      await FamilyManager.updateParentalControls(selectedChildId, parentalControls);
      Alert.alert('Success', 'Parental controls updated');
      setShowParentalControls(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update parental controls');
    }
  };

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.overviewCard}>
        <View style={styles.cardHeader}>
          <Users size={24} color="#007AFF" />
          <Text style={styles.cardTitle}>Family Overview</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{familyGroup?.members.length || 0}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{familyGroup?.sharedVaults.length || 0}</Text>
            <Text style={styles.statLabel}>Shared Vaults</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{familyGroup?.usageStats.activeMembers || 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
      </View>

      <View style={styles.overviewCard}>
        <View style={styles.cardHeader}>
          <Activity size={24} color="#34C759" />
          <Text style={styles.cardTitle}>Recent Activity</Text>
        </View>
        {familyActivity.slice(0, 5).map((activity) => (
          <View key={activity.id} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              {activity.action === 'joined' && <UserPlus size={16} color="#34C759" />}
              {activity.action === 'shared_item' && <Users size={16} color="#007AFF" />}
              {activity.action === 'created_vault' && <Shield size={16} color="#FF9500" />}
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityText}>
                {activity.memberName} {activity.action.replace('_', ' ')}
              </Text>
              <Text style={styles.activityTime}>
                {new Date(activity.timestamp).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.overviewCard}>
        <View style={styles.cardHeader}>
          <CreditCard size={24} color="#FF9500" />
          <Text style={styles.cardTitle}>Subscription</Text>
        </View>
        <Text style={styles.subscriptionPlan}>
          {familyGroup?.billingInfo.currentPlan.toUpperCase()} Plan
        </Text>
        <Text style={styles.subscriptionDetails}>
          {familyGroup?.billingInfo.memberCount} of 6 members
        </Text>
        <Text style={styles.subscriptionDetails}>
          Next billing: {new Date(familyGroup?.billingInfo.nextBillingDate || 0).toLocaleDateString()}
        </Text>
      </View>
    </ScrollView>
  );

  const renderMembers = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.inviteButton} onPress={() => setShowInviteModal(true)}>
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
          </View>

          <View style={styles.memberActions}>
            {member.role === 'child' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setSelectedChildId(member.id);
                  setParentalControls(member.parentalControls || parentalControls);
                  setShowParentalControls(true);
                }}
              >
                <Shield size={16} color="#FF9500" />
                <Text style={styles.actionButtonText}>Parental Controls</Text>
              </TouchableOpacity>
            )}
            
            {member.role !== 'owner' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.removeButton]}
                onPress={() => handleRemoveMember(member)}
              >
                <X size={16} color="#FF3B30" />
                <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Remove</Text>
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
    </ScrollView>
  );

  const renderActivity = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {familyActivity.map((activity) => (
        <View key={activity.id} style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <View style={styles.activityIcon}>
              {activity.action === 'joined' && <UserPlus size={20} color="#34C759" />}
              {activity.action === 'left' && <X size={20} color="#FF3B30" />}
              {activity.action === 'shared_item' && <Users size={20} color="#007AFF" />}
              {activity.action === 'created_vault' && <Shield size={20} color="#FF9500" />}
              {activity.action === 'invited_member' && <Mail size={20} color="#AF52DE" />}
              {activity.action === 'login' && <User size={20} color="#34C759" />}
            </View>
            <View style={styles.activityDetails}>
              <Text style={styles.activityMember}>{activity.memberName}</Text>
              <Text style={styles.activityAction}>
                {activity.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </View>
            <Text style={styles.activityTimestamp}>
              {new Date(activity.timestamp).toLocaleString()}
            </Text>
          </View>
          
          {activity.details && (
            <View style={styles.activityDetailsContainer}>
              <Text style={styles.activityDetailsText}>
                {JSON.stringify(activity.details, null, 2)}
              </Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.loadingText}>Loading family data...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!familyGroup) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.emptyState}>
              <Users size={64} color="#8E8E93" />
              <Text style={styles.emptyTitle}>No Family Group</Text>
              <Text style={styles.emptySubtitle}>
                Create a family group to share premium features with up to 6 family members
              </Text>
              <TouchableOpacity style={styles.createFamilyButton} onPress={handleCreateFamily}>
                <UserPlus size={20} color="#FFFFFF" />
                <Text style={styles.createFamilyButtonText}>Create Family Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Family Sharing</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
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

          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'members' && renderMembers()}
          {activeTab === 'activity' && renderActivity()}
        </View>
      </View>

      {/* Invite Member Modal */}
      <Modal visible={showInviteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.inviteModal}>
            <View style={styles.inviteHeader}>
              <Text style={styles.inviteTitle}>Invite Family Member</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.inviteForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="member@example.com"
                  placeholderTextColor="#8E8E93"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="John"
                    placeholderTextColor="#8E8E93"
                    value={inviteFirstName}
                    onChangeText={setInviteFirstName}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Doe"
                    placeholderTextColor="#8E8E93"
                    value={inviteLastName}
                    onChangeText={setInviteLastName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role</Text>
                <View style={styles.roleSelector}>
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
            </View>

            <View style={styles.inviteActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowInviteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendInviteButton}
                onPress={handleInviteMember}
              >
                <Text style={styles.sendInviteButtonText}>Send Invitation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Parental Controls Modal */}
      <Modal visible={showParentalControls} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.parentalModal}>
            <View style={styles.parentalHeader}>
              <Text style={styles.parentalTitle}>Parental Controls</Text>
              <TouchableOpacity onPress={() => setShowParentalControls(false)}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.parentalContent}>
              <View style={styles.controlGroup}>
                <View style={styles.controlHeader}>
                  <Shield size={20} color="#FF9500" />
                  <Text style={styles.controlTitle}>Content Filtering</Text>
                  <Switch
                    value={parentalControls.contentFiltering}
                    onValueChange={(value) => 
                      setParentalControls(prev => ({ ...prev, contentFiltering: value }))
                    }
                    trackColor={{ false: '#48484A', true: '#007AFF' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <View style={styles.controlGroup}>
                <View style={styles.controlHeader}>
                  <Clock size={20} color="#FF9500" />
                  <Text style={styles.controlTitle}>Time Restrictions</Text>
                  <Switch
                    value={parentalControls.timeRestrictions.enabled}
                    onValueChange={(value) => 
                      setParentalControls(prev => ({ 
                        ...prev, 
                        timeRestrictions: { ...prev.timeRestrictions, enabled: value }
                      }))
                    }
                    trackColor={{ false: '#48484A', true: '#007AFF' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                
                {parentalControls.timeRestrictions.enabled && (
                  <View style={styles.timeSettings}>
                    <Text style={styles.timeLabel}>Allowed Hours: 9:00 AM - 9:00 PM</Text>
                    <Text style={styles.timeLabel}>Allowed Days: All days</Text>
                  </View>
                )}
              </View>

              <View style={styles.controlGroup}>
                <Text style={styles.controlTitle}>Approval Required</Text>
                
                <View style={styles.approvalItem}>
                  <Text style={styles.approvalLabel}>New Vaults</Text>
                  <Switch
                    value={parentalControls.approvalRequired.newVaults}
                    onValueChange={(value) => 
                      setParentalControls(prev => ({ 
                        ...prev, 
                        approvalRequired: { ...prev.approvalRequired, newVaults: value }
                      }))
                    }
                    trackColor={{ false: '#48484A', true: '#007AFF' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.approvalItem}>
                  <Text style={styles.approvalLabel}>Content Sharing</Text>
                  <Switch
                    value={parentalControls.approvalRequired.sharing}
                    onValueChange={(value) => 
                      setParentalControls(prev => ({ 
                        ...prev, 
                        approvalRequired: { ...prev.approvalRequired, sharing: value }
                      }))
                    }
                    trackColor={{ false: '#48484A', true: '#007AFF' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.parentalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowParentalControls(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateParentalControls}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    width: '95%',
    maxWidth: 600,
    maxHeight: '90%',
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
    fontSize: 24,
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
    backgroundColor: '#1C1C1E',
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
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    padding: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
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
  overviewCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#48484A',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  subscriptionPlan: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  subscriptionDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginBottom: 4,
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
    backgroundColor: '#1C1C1E',
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
    flexDirection: 'row',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#48484A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  removeButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 4,
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
  activityCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityDetails: {
    flex: 1,
    marginLeft: 12,
  },
  activityMember: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  activityAction: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  activityTimestamp: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  activityDetailsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#48484A',
    borderRadius: 8,
  },
  activityDetailsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  inviteModal: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  inviteTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  inviteForm: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#48484A',
  },
  roleSelector: {
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
  inviteActions: {
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
  sendInviteButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginLeft: 8,
  },
  sendInviteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  parentalModal: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  parentalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  parentalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  parentalContent: {
    maxHeight: 400,
    marginBottom: 24,
  },
  controlGroup: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
  },
  timeSettings: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#48484A',
  },
  timeLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  approvalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#48484A',
  },
  approvalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  parentalActions: {
    flexDirection: 'row',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});