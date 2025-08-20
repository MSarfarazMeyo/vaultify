import SecureStore from './secureStorage';
import * as Crypto from 'expo-crypto';
import { SecurityManager } from './SecurityManager';
import { SubscriptionManager } from './SubscriptionManager';

export interface FamilyMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'adult' | 'child';
  joinedAt: string;
  status: 'active' | 'pending' | 'inactive';
  permissions: {
    canCreateVaults: boolean;
    canShareContent: boolean;
    canInviteMembers: boolean;
    canManageFamily: boolean;
  };
  parentalControls?: ParentalControls;
}

export interface FamilyGroup {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  members: FamilyMember[];
  sharedVaults: SharedVault[];
  usageStats: {
    activeMembers: number;
    totalActivity: number;
  };
  billingInfo: {
    currentPlan: string;
    memberCount: number;
    nextBillingDate: string;
  };
}

export interface SharedVault {
  id: string;
  name: string;
  ownerId: string;
  sharedWith: string[];
  createdAt: string;
}

export interface FamilyActivity {
  id: string;
  memberId: string;
  memberName: string;
  action: 'joined' | 'left' | 'shared_item' | 'created_vault' | 'invited_member' | 'login';
  timestamp: string;
  details?: any;
}

export interface ParentalControls {
  contentFiltering: boolean;
  timeRestrictions: {
    enabled: boolean;
    allowedHours: { start: string; end: string }[];
    allowedDays: number[];
  };
  approvalRequired: {
    newVaults: boolean;
    sharing: boolean;
    invitations: boolean;
  };
  blockedFeatures: string[];
}

export interface FamilyPlan {
  id: string;
  name: string;
  maxMembers: number;
  features: string[];
  pricePerMonth: number;
}

export interface FamilyInvitation {
  id: string;
  familyId: string;
  inviterEmail: string;
  inviteeEmail: string;
  token: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
}

export class FamilyManager {
  private static readonly FAMILY_KEY = 'family_data';
  private static readonly INVITATIONS_KEY = 'family_invitations';
  private static readonly MEMBERS_KEY = 'family_members';
  private static readonly ACTIVITY_KEY = 'family_activity';

  static async getFamilyGroup(): Promise<FamilyGroup | null> {
    try {
      const familyData = await SecureStore.getItemAsync(this.FAMILY_KEY);
      if (!familyData) {
        return null;
      }

      const family = JSON.parse(familyData);
      
      // Get members with updated structure
      const members = await this.getFamilyMembers(family.id);
      const sharedVaults = await this.getSharedVaults(family.id);
      
      return {
        id: family.id,
        name: family.name || 'My Family',
        ownerId: family.adminId,
        createdAt: family.createdAt,
        members: members,
        sharedVaults: sharedVaults,
        usageStats: {
          activeMembers: members.filter(m => m.status === 'active').length,
          totalActivity: 0
        },
        billingInfo: {
          currentPlan: 'premium',
          memberCount: members.length,
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting family group:', error);
      return null;
    }
  }

  static async createFamilyGroup(name: string, ownerInfo: { email: string; firstName: string; lastName: string }): Promise<FamilyGroup> {
    try {
      const familyId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${ownerInfo.email}_${Date.now()}`
      );

      const ownerId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256, 
        ownerInfo.email
      );

      const owner: FamilyMember = {
        id: ownerId,
        email: ownerInfo.email,
        firstName: ownerInfo.firstName,
        lastName: ownerInfo.lastName,
        role: 'owner',
        joinedAt: new Date().toISOString(),
        status: 'active',
        permissions: {
          canCreateVaults: true,
          canShareContent: true,
          canInviteMembers: true,
          canManageFamily: true
        }
      };

      const familyGroup: FamilyGroup = {
        id: familyId,
        name: name,
        ownerId: ownerId,
        createdAt: new Date().toISOString(),
        members: [owner],
        sharedVaults: [],
        usageStats: {
          activeMembers: 1,
          totalActivity: 0
        },
        billingInfo: {
          currentPlan: 'premium',
          memberCount: 1,
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      };

      const familyData = {
        id: familyId,
        name: name,
        adminId: ownerId,
        createdAt: new Date().toISOString(),
        members: [owner]
      };

      await SecureStore.setItemAsync(this.FAMILY_KEY, JSON.stringify(familyData));
      await SecureStore.setItemAsync(`${this.MEMBERS_KEY}_${familyId}`, JSON.stringify([owner]));

      return familyGroup;
    } catch (error) {
      console.error('Error creating family group:', error);
      throw new Error('Failed to create family group');
    }
  }

  static async inviteFamilyMember(email: string, role: 'adult' | 'child'): Promise<void> {
    try {
      const familyGroup = await this.getFamilyGroup();
      if (!familyGroup) {
        throw new Error('No family group found');
      }

      if (familyGroup.members.length >= 6) {
        throw new Error('Family group is full (maximum 6 members)');
      }

      // Generate invitation token
      const token = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${familyGroup.id}_${email}_${Date.now()}`
      );

      const invitation: FamilyInvitation = {
        id: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token),
        familyId: familyGroup.id,
        inviterEmail: familyGroup.members.find(m => m.role === 'owner')?.email || '',
        inviteeEmail: email,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'pending'
      };

      const existingInvitations = await this.getInvitations(familyGroup.id);
      existingInvitations.push(invitation);
      
      await SecureStore.setItemAsync(
        `${this.INVITATIONS_KEY}_${familyGroup.id}`,
        JSON.stringify(existingInvitations)
      );

      // Log activity
      await this.logFamilyActivity(familyGroup.id, familyGroup.ownerId, 'invited_member', {
        inviteeEmail: email,
        role: role
      });
    } catch (error) {
      console.error('Error inviting family member:', error);
      throw error;
    }
  }

  static async removeFamilyMember(memberId: string): Promise<void> {
    try {
      const familyGroup = await this.getFamilyGroup();
      if (!familyGroup) {
        throw new Error('No family group found');
      }

      const memberToRemove = familyGroup.members.find(m => m.id === memberId);
      if (!memberToRemove) {
        throw new Error('Member not found');
      }

      if (memberToRemove.role === 'owner') {
        throw new Error('Cannot remove family owner');
      }

      // Remove member from family
      const updatedMembers = familyGroup.members.filter(m => m.id !== memberId);
      
      const familyData = {
        id: familyGroup.id,
        name: familyGroup.name,
        adminId: familyGroup.ownerId,
        createdAt: familyGroup.createdAt,
        members: updatedMembers
      };

      await SecureStore.setItemAsync(this.FAMILY_KEY, JSON.stringify(familyData));
      await SecureStore.setItemAsync(
        `${this.MEMBERS_KEY}_${familyGroup.id}`,
        JSON.stringify(updatedMembers)
      );

      // Log activity
      await this.logFamilyActivity(familyGroup.id, familyGroup.ownerId, 'left', {
        removedMember: `${memberToRemove.firstName} ${memberToRemove.lastName}`
      });
    } catch (error) {
      console.error('Error removing family member:', error);
      throw error;
    }
  }

  static async getFamilyActivity(limit: number = 20): Promise<FamilyActivity[]> {
    try {
      const familyGroup = await this.getFamilyGroup();
      if (!familyGroup) {
        return [];
      }

      const activityData = await SecureStore.getItemAsync(`${this.ACTIVITY_KEY}_${familyGroup.id}`);
      if (!activityData) {
        return [];
      }

      const activities: FamilyActivity[] = JSON.parse(activityData);
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting family activity:', error);
      return [];
    }
  }

  static async updateParentalControls(childId: string, controls: ParentalControls): Promise<void> {
    try {
      const familyGroup = await this.getFamilyGroup();
      if (!familyGroup) {
        throw new Error('No family group found');
      }

      const childMember = familyGroup.members.find(m => m.id === childId && m.role === 'child');
      if (!childMember) {
        throw new Error('Child member not found');
      }

      // Update member with parental controls
      const updatedMembers = familyGroup.members.map(member => 
        member.id === childId 
          ? { ...member, parentalControls: controls }
          : member
      );

      const familyData = {
        id: familyGroup.id,
        name: familyGroup.name,
        adminId: familyGroup.ownerId,
        createdAt: familyGroup.createdAt,
        members: updatedMembers
      };

      await SecureStore.setItemAsync(this.FAMILY_KEY, JSON.stringify(familyData));
      await SecureStore.setItemAsync(
        `${this.MEMBERS_KEY}_${familyGroup.id}`,
        JSON.stringify(updatedMembers)
      );
    } catch (error) {
      console.error('Error updating parental controls:', error);
      throw error;
    }
  }

  private static async getSharedVaults(familyId: string): Promise<SharedVault[]> {
    try {
      // Placeholder implementation - in production this would fetch actual shared vaults
      return [];
    } catch (error) {
      console.error('Error getting shared vaults:', error);
      return [];
    }
  }

  private static async logFamilyActivity(familyId: string, memberId: string, action: FamilyActivity['action'], details?: any): Promise<void> {
    try {
      const familyGroup = await this.getFamilyGroup();
      if (!familyGroup) return;

      const member = familyGroup.members.find(m => m.id === memberId);
      if (!member) return;

      const activity: FamilyActivity = {
        id: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${familyId}_${memberId}_${Date.now()}`),
        memberId,
        memberName: `${member.firstName} ${member.lastName}`,
        action,
        timestamp: new Date().toISOString(),
        details
      };

      const existingActivity = await this.getFamilyActivity(100);
      const updatedActivity = [activity, ...existingActivity].slice(0, 100); // Keep last 100 activities

      await SecureStore.setItemAsync(
        `${this.ACTIVITY_KEY}_${familyId}`,
        JSON.stringify(updatedActivity)
      );
    } catch (error) {
      console.error('Error logging family activity:', error);
    }
  }

  // Legacy methods for backward compatibility
  static async createFamily(adminEmail: string, planId: string): Promise<string> {
    try {
      const familyGroup = await this.createFamilyGroup('My Family', {
        email: adminEmail,
        firstName: adminEmail.split('@')[0],
        lastName: 'User'
      });
      return familyGroup.id;
    } catch (error) {
      console.error('Error creating family:', error);
      throw new Error('Failed to create family');
    }
  }

  static async inviteMember(familyId: string, inviterEmail: string, inviteeEmail: string): Promise<string> {
    try {
      await this.inviteFamilyMember(inviteeEmail, 'adult');
      return 'invitation-token';
    } catch (error) {
      console.error('Error inviting member:', error);
      throw error;
    }
  }

  static async acceptInvitation(token: string, memberName: string): Promise<boolean> {
    try {
      // Placeholder implementation
      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  static async removeMember(familyId: string, adminEmail: string, memberEmail: string): Promise<boolean> {
    try {
      const familyGroup = await this.getFamilyGroup();
      if (!familyGroup) {
        throw new Error('Family not found');
      }

      const memberToRemove = familyGroup.members.find(m => m.email === memberEmail);
      if (!memberToRemove) {
        throw new Error('Member not found');
      }

      await this.removeFamilyMember(memberToRemove.id);
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  static async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    try {
      const membersData = await SecureStore.getItemAsync(`${this.MEMBERS_KEY}_${familyId}`);
      if (!membersData) {
        return [];
      }

      const members = JSON.parse(membersData);
      
      // Transform legacy member format to new format if needed
      return members.map((member: any) => ({
        id: member.id,
        email: member.email,
        firstName: member.firstName || member.name?.split(' ')[0] || member.email.split('@')[0],
        lastName: member.lastName || member.name?.split(' ')[1] || 'User',
        role: member.role === 'admin' ? 'owner' : (member.role || 'adult'),
        joinedAt: member.joinedAt || new Date().toISOString(),
        status: member.isActive ? 'active' : 'inactive',
        permissions: member.permissions || {
          canCreateVaults: member.role === 'admin' || member.role === 'owner',
          canShareContent: true,
          canInviteMembers: member.role === 'admin' || member.role === 'owner',
          canManageFamily: member.role === 'admin' || member.role === 'owner'
        },
        parentalControls: member.parentalControls
      }));
    } catch (error) {
      console.error('Error getting family members:', error);
      return [];
    }
  }

  static async getFamilyData(familyId: string): Promise<any> {
    try {
      const familyData = await SecureStore.getItemAsync(this.FAMILY_KEY);
      if (!familyData) return null;
      
      const family = JSON.parse(familyData);
      return family.id === familyId ? family : null;
    } catch (error) {
      console.error('Error getting family data:', error);
      return null;
    }
  }

  static async getInvitations(familyId: string): Promise<FamilyInvitation[]> {
    try {
      const invitationsData = await SecureStore.getItemAsync(`${this.INVITATIONS_KEY}_${familyId}`);
      return invitationsData ? JSON.parse(invitationsData) : [];
    } catch (error) {
      console.error('Error getting invitations:', error);
      return [];
    }
  }

  static async getAllFamilies(): Promise<string[]> {
    try {
      const familyData = await SecureStore.getItemAsync(this.FAMILY_KEY);
      if (!familyData) return [];
      
      const family = JSON.parse(familyData);
      return [family.id];
    } catch (error) {
      console.error('Error getting all families:', error);
      return [];
    }
  }

  static async leaveFamily(familyId: string, memberEmail: string): Promise<boolean> {
    try {
      const family = await this.getFamilyData(familyId);
      if (!family) {
        throw new Error('Family not found');
      }

      const member = family.members.find((m: any) => m.email === memberEmail);
      if (!member) {
        throw new Error('Member not found');
      }

      if (member.role === 'admin' || member.role === 'owner') {
        throw new Error('Admin cannot leave family. Transfer ownership first.');
      }

      // Remove member from family
      family.members = family.members.filter((m: any) => m.email !== memberEmail);
      
      await SecureStore.setItemAsync(this.FAMILY_KEY, JSON.stringify(family));
      await SecureStore.setItemAsync(
        `${this.MEMBERS_KEY}_${familyId}`,
        JSON.stringify(family.members)
      );

      // Revoke member access
      await this.revokeMemberAccess(member.id);

      return true;
    } catch (error) {
      console.error('Error leaving family:', error);
      throw error;
    }
  }

  private static async createMemberAccount(member: FamilyMember, password: string): Promise<void> {
    // In production, create separate account with family association
    console.log(`Creating account for family member ${member.email}`);
  }

  private static async revokeMemberAccess(memberId: string): Promise<void> {
    // In production, revoke access to all shared resources
    console.log(`Revoking access for member ${memberId}`);
  }
}