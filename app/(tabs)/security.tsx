import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { Shield, TriangleAlert as AlertTriangle, Eye, Camera, MapPin, Clock, Settings } from 'lucide-react-native';
import { SecurityManager } from '@/utils/SecurityManager';

interface SecurityEvent {
  id: string;
  type: string;
  timestamp: number;
  details: any;
}

export default function SecurityScreen() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [breakInDetection, setBreakInDetection] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [securityLevel, setSecurityLevel] = useState<'high' | 'medium' | 'low'>('high');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSecurityEvents();
    loadSecuritySettings();
  }, []);

  useEffect(() => {
    // Set up periodic sync to stay in sync with Settings screen
    const interval = setInterval(() => {
      loadSecuritySettings();
    }, 1000); // Check for updates every second
    
    return () => clearInterval(interval);
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const settings = await SecurityManager.getUserSettings();
      if (settings) {
        setBreakInDetection(settings.breakInDetection ?? true);
        setAutoLock(settings.autoLock ?? true);
        setSecurityLevel(settings.securityLevel ?? 'high');
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
    } finally {
      if (isLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleBreakInDetectionChange = async (value: boolean) => {
    setBreakInDetection(value);
    
    try {
      const currentSettings = await SecurityManager.getUserSettings();
      await SecurityManager.saveUserSettings({ 
        ...currentSettings,
        breakInDetection: value,
        updatedAt: Date.now()
      });
      SecurityManager.logSecurityEvent('break_in_detection_changed', { enabled: value });
    } catch (error) {
      console.error('Failed to update break-in detection:', error);
      setBreakInDetection(!value); // Revert on error
      Alert.alert('Error', 'Failed to update break-in detection setting');
    }
  };

  const handleAutoLockChange = async (value: boolean) => {
    setAutoLock(value);
    
    try {
      const currentSettings = await SecurityManager.getUserSettings();
      await SecurityManager.saveUserSettings({ 
        ...currentSettings,
        autoLock: value,
        updatedAt: Date.now()
      });
      SecurityManager.logSecurityEvent('auto_lock_changed', { enabled: value });
    } catch (error) {
      console.error('Failed to update auto-lock:', error);
      setAutoLock(!value); // Revert on error
      Alert.alert('Error', 'Failed to update auto-lock setting');
    }
  };

  const handleSecurityLevelChange = () => {
    const levels: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];
    const currentIndex = levels.indexOf(securityLevel);
    const nextIndex = (currentIndex + 1) % levels.length;
    const newLevel = levels[nextIndex];
    
    setSecurityLevel(newLevel);
    
    const updateSecurityLevel = async () => {
      try {
        const currentSettings = await SecurityManager.getUserSettings();
        await SecurityManager.saveUserSettings({ 
          ...currentSettings,
          securityLevel: newLevel,
          updatedAt: Date.now()
        });
        
        await SecurityManager.applySecurityLevel(newLevel);
        
        // Show feedback about the change
        const levelDescriptions = {
          high: 'Maximum security with all features enabled',
          medium: 'Balanced security with essential features',
          low: 'Basic security with minimal restrictions'
        };
        
        Alert.alert(
          'Security Level Changed',
          `Security level set to ${newLevel.toUpperCase()}: ${levelDescriptions[newLevel]}`,
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('Failed to change security level:', error);
        Alert.alert('Error', 'Failed to change security level');
        // Revert to previous level on error
        const revertIndex = currentIndex;
        setSecurityLevel(levels[revertIndex]);
      }
    };
    
    updateSecurityLevel();
  };


  const loadSecurityEvents = async () => {
    try {
      const events = await SecurityManager.getSecurityEvents();
      setSecurityEvents(events);
    } catch (error) {
      console.error('Failed to load security events:', error);
    }
  };

  const clearSecurityLog = () => {
    Alert.alert(
      'Clear Security Log',
      'Are you sure you want to clear all security events?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await SecurityManager.clearSecurityEvents();
            setSecurityEvents([]);
          }
        }
      ]
    );
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'failed_login_attempt':
        return <AlertTriangle size={20} color="#FF3B30" />;
      case 'break_in_attempt':
        return <Camera size={20} color="#FF3B30" />;
      case 'vault_accessed':
        return <Eye size={20} color="#34C759" />;
      case 'photo_captured':
        return <Camera size={20} color="#007AFF" />;
      case 'biometric_auth_success':
        return <Shield size={20} color="#34C759" />;
      default:
        return <Settings size={20} color="#8E8E93" />;
    }
  };

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getSecurityScore = () => {
    const recentEvents = securityEvents.filter(
      event => Date.now() - event.timestamp < 24 * 60 * 60 * 1000
    );
    const failedAttempts = recentEvents.filter(
      event => event.type === 'failed_login_attempt'
    ).length;
    
    if (failedAttempts === 0) return 95;
    if (failedAttempts < 3) return 75;
    return 45;
  };

  const securityScore = getSecurityScore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vaultify Security</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.securityOverview}>
          <View style={styles.securityScore}>
            <View style={[styles.scoreCircle, { borderColor: securityScore > 80 ? '#34C759' : securityScore > 60 ? '#FF9500' : '#FF3B30' }]}>
              <Text style={[styles.scoreText, { color: securityScore > 80 ? '#34C759' : securityScore > 60 ? '#FF9500' : '#FF3B30' }]}>
                {securityScore}
              </Text>
            </View>
            <Text style={styles.scoreLabel}>Security Score</Text>
          </View>
          <View style={styles.securityStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{securityEvents.length}</Text>
              <Text style={styles.statLabel}>Total Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {securityEvents.filter(e => e.type === 'failed_login_attempt').length}
              </Text>
              <Text style={styles.statLabel}>Failed Attempts</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <AlertTriangle size={20} color="#FF9500" />
              <Text style={styles.settingLabel}>Break-in Detection</Text>
            </View>
            <Switch
              value={breakInDetection}
              onValueChange={handleBreakInDetectionChange}
              trackColor={{ false: '#48484A', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Clock size={20} color="#007AFF" />
              <Text style={styles.settingLabel}>Auto-lock</Text>
            </View>
            <Switch
              value={autoLock}
              onValueChange={handleAutoLockChange}
              trackColor={{ false: '#48484A', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity 
            style={styles.securityLevelButton}
            onPress={handleSecurityLevelChange}
          >
            <Shield size={20} color="#34C759" />
            <View style={styles.securityLevelContent}>
              <Text style={styles.securityLevelText}>Security Level: {securityLevel.toUpperCase()}</Text>
              <Text style={styles.securityLevelDescription}>
                {securityLevel === 'high' && 'Maximum protection with all security features'}
                {securityLevel === 'medium' && 'Balanced security with essential features'}
                {securityLevel === 'low' && 'Basic protection with minimal restrictions'}
              </Text>
            </View>
            <View style={[styles.securityLevelIndicator, { 
              backgroundColor: securityLevel === 'high' ? '#34C759' : 
                             securityLevel === 'medium' ? '#FF9500' : '#FF3B30' 
            }]} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={clearSecurityLog}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>

          {securityEvents.slice(0, 10).map((event) => (
            <View key={event.id} style={styles.eventItem}>
              <View style={styles.eventIcon}>
                {getEventIcon(event.type)}
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventType}>{formatEventType(event.type)}</Text>
                <Text style={styles.eventTime}>
                  {new Date(event.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}

          {securityEvents.length === 0 && (
            <View style={styles.noEvents}>
              <Shield size={48} color="#8E8E93" />
              <Text style={styles.noEventsText}>No security events recorded</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Keep Your App Updated</Text>
            <Text style={styles.tipText}>
              Regular updates include security patches and improvements
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Use Strong Passwords</Text>
            <Text style={styles.tipText}>
              Use at least 12 characters with a mix of letters, numbers, and symbols
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Enable Break-in Detection</Text>
            <Text style={styles.tipText}>
              Get alerts when someone tries to access your vault
            </Text>
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  securityOverview: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityScore: {
    alignItems: 'center',
    marginRight: 30,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
  },
  securityStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  clearButton: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  securityLevelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#48484A',
  },
  securityLevelContent: {
    flex: 1,
    marginLeft: 12,
  },
  securityLevelText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  securityLevelDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  securityLevelIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  eventIcon: {
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventType: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  noEvents: {
    alignItems: 'center',
    padding: 40,
  },
  noEventsText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
    marginTop: 16,
  },
  tipCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    lineHeight: 20,
  }
});