import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Camera, RotateCcw, Image, FlashlightOff as FlashOff, Slash as FlashOn, Video, Mic, Square, Play, Pause } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { PhotoManager } from '@/utils/PhotoManager';
import { SecurityManager } from '@/utils/SecurityManager';
import { VaultManager } from '@/utils/VaultManager';
import { SubscriptionManager } from '@/utils/SubscriptionManager';
import { ItemManager } from '@/utils/ItemManager';
import VaultSelectionModal from '@/components/VaultSelectionModal';

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video' | 'audio'>('photo');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [showVaultSelection, setShowVaultSelection] = useState(false);
  const [pendingPhotoData, setPendingPhotoData] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      requestPermission();
    }
  }, []);

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(!flash);
  };

  const takePicture = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Camera not available', 'Camera functionality is not available on web');
      return;
    }

    // Check subscription limits
    const canAdd = await SubscriptionManager.canAddPhoto();
    if (!canAdd.allowed) {
      Alert.alert('Upgrade Required', canAdd.reason);
      return;
    }

    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo) {
        // Prepare photo data and show vault selection
        setPendingPhotoData({
          type: 'photo' as const,
          name: `Photo ${Date.now()}`,
          filename: `photo_${Date.now()}.jpg`,
          encryptedData: photo.base64 || photo.uri,
          size: photo.base64?.length || 1024000,
          imageUrl: photo.uri,
          thumbnailUrl: photo.uri,
          fullSizeUrl: photo.uri,
          actualPhotoData: photo.base64 || photo.uri
        });
        setShowVaultSelection(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take picture');
    } finally {
      setIsCapturing(false);
    }
  };

  const startVideoRecording = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Video recording not available', 'Video recording is not available on web');
      return;
    }

    // Check subscription limits
    const canAdd = await SubscriptionManager.canAddVideo();
    if (!canAdd.allowed) {
      Alert.alert('Upgrade Required', canAdd.reason);
      return;
    }

    if (!cameraRef.current || isRecordingVideo) return;

    try {
      setIsRecordingVideo(true);
      setRecordingDuration(0);
      
      // Start duration timer
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        quality: '720p',
        maxDuration: 300, // 5 minutes max
      });

      clearInterval(timer);

      if (video) {
        setPendingPhotoData({
          type: 'video' as const,
          name: `Video ${Date.now()}`,
          filename: `video_${Date.now()}.mp4`,
          encryptedData: video.uri,
          size: 5120000, // Estimate
          duration: recordingDuration,
          videoUrl: video.uri,
          thumbnailUrl: video.uri,
          resolution: '1280x720',
          format: 'mp4',
          actualVideoData: video.uri
        });
        setShowVaultSelection(true);
      }
    } catch (error) {
      console.error('Video recording error:', error);
      Alert.alert('Error', 'Failed to record video');
    } finally {
      setIsRecordingVideo(false);
      setRecordingDuration(0);
    }
  };

  const stopVideoRecording = async () => {
    if (!cameraRef.current || !isRecordingVideo) return;

    try {
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('Failed to stop video recording:', error);
    }
  };

  const startAudioRecording = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Audio recording not available', 'Audio recording is not available on web');
      return;
    }

    // Check subscription limits
    const canAdd = await SubscriptionManager.canAddAudio();
    if (!canAdd.allowed) {
      Alert.alert('Upgrade Required', canAdd.reason);
      return;
    }

    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setAudioRecording(recording);
      setIsRecordingAudio(true);
      setRecordingDuration(0);
      
      // Start duration timer
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) {
          clearInterval(timer);
        }
      });
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      Alert.alert('Error', 'Failed to start audio recording');
    }
  };

  const stopAudioRecording = async () => {
    if (!audioRecording) return;

    try {
      setIsRecordingAudio(false);
      await audioRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = audioRecording.getURI();
      if (uri) {
        setPendingPhotoData({
          type: 'audio' as const,
          name: `Audio ${Date.now()}`,
          filename: `audio_${Date.now()}.m4a`,
          encryptedData: uri,
          size: 1024000, // Estimate
          duration: recordingDuration,
          audioUrl: uri,
          format: 'm4a',
          bitrate: 128,
          actualAudioData: uri
        });
        setShowVaultSelection(true);
      }
      
      setAudioRecording(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to stop audio recording:', error);
      Alert.alert('Error', 'Failed to stop audio recording');
    }
  };
  const pickFromLibrary = async () => {
    try {
      // Check subscription limits
      const canAdd = captureMode === 'photo' ? await SubscriptionManager.canAddPhoto() :
                    captureMode === 'video' ? await SubscriptionManager.canAddVideo() :
                    await SubscriptionManager.canAddAudio();
      if (!canAdd.allowed) {
        Alert.alert('Upgrade Required', canAdd.reason);
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant permission to access your photo library');
        return;
      }

      const mediaTypes = captureMode === 'photo' ? ImagePicker.MediaTypeOptions.Images :
                        captureMode === 'video' ? ImagePicker.MediaTypeOptions.Videos :
                        ImagePicker.MediaTypeOptions.All;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Prepare photo data and show vault selection
        setPendingPhotoData({
          type: captureMode as const,
          name: `Imported ${captureMode.charAt(0).toUpperCase() + captureMode.slice(1)} ${Date.now()}`,
          filename: `${captureMode}_${Date.now()}.${captureMode === 'photo' ? 'jpg' : captureMode === 'video' ? 'mp4' : 'm4a'}`,
          encryptedData: asset.base64 || asset.uri,
          size: asset.base64?.length || 1024000,
          duration: asset.duration || (captureMode === 'video' ? 30 : captureMode === 'audio' ? 60 : undefined),
          imageUrl: asset.uri,
          thumbnailUrl: asset.uri,
          fullSizeUrl: asset.uri,
          videoUrl: captureMode === 'video' ? asset.uri : undefined,
          audioUrl: captureMode === 'audio' ? asset.uri : undefined,
          actualPhotoData: asset.base64 || asset.uri,
          actualVideoData: captureMode === 'video' ? asset.uri : undefined,
          actualAudioData: captureMode === 'audio' ? asset.uri : undefined
        });
        setShowVaultSelection(true);
      }
    } catch (error) {
      console.error('Media picker error:', error);
      Alert.alert('Error', `Failed to import ${captureMode}`);
    }
  };

  const handleVaultSelected = async (vaultId: string) => {
    if (!pendingPhotoData) return;

    try {
      const vault = await VaultManager.getVault(vaultId);
      if (!vault) {
        Alert.alert('Error', 'Selected vault not found');
        return;
      }

      const savedPhoto = await ItemManager.createItem(pendingPhotoData, vaultId);
      
      await SubscriptionManager.incrementUsage('photo');
      SecurityManager.logSecurityEvent('photo_captured');
      Alert.alert('Success', `Photo saved securely to ${vault.name}`);
      
      // Clear pending data
      setPendingPhotoData(null);
      setShowVaultSelection(false);
    } catch (error) {
      console.error('Failed to save photo:', error);
      Alert.alert('Error', 'Failed to save photo');
    }
  };

  const handleVaultSelectionClose = () => {
    setShowVaultSelection(false);
    setPendingPhotoData(null);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webContainer}>
          <Camera size={64} color="#8E8E93" />
          <Text style={styles.webTitle}>Camera Not Available</Text>
          <Text style={styles.webSubtitle}>
            Camera functionality is not available on web platform
          </Text>
          <TouchableOpacity
            style={styles.importButton}
            onPress={pickFromLibrary}
          >
            <Image size={24} color="#FFFFFF" />
            <Text style={styles.importButtonText}>Import from Library</Text>
          </TouchableOpacity>
          <Text style={styles.webNote}>
            Photos will be saved to your most recently accessed unlocked vault
          </Text>
        </View>
        <VaultSelectionModal
          visible={showVaultSelection}
          onClose={handleVaultSelectionClose}
          onVaultSelected={handleVaultSelected}
          title="Save Photo"
          subtitle="Choose which vault to save this photo to"
        />
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Camera size={64} color="#8E8E93" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            This app needs camera access to take secure photos
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vaultify Camera</Text>
        <View style={styles.headerButtons}>
          {captureMode === 'photo' && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={toggleFlash}
            >
              {flash ? (
                <FlashOn size={24} color="#FFFFFF" />
              ) : (
                <FlashOff size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mode Selection */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, captureMode === 'photo' && styles.activeModeButton]}
          onPress={() => setCaptureMode('photo')}
        >
          <Camera size={20} color={captureMode === 'photo' ? '#007AFF' : '#8E8E93'} />
          <Text style={[styles.modeButtonText, captureMode === 'photo' && styles.activeModeButtonText]}>
            Photo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, captureMode === 'video' && styles.activeModeButton]}
          onPress={() => setCaptureMode('video')}
        >
          <Video size={20} color={captureMode === 'video' ? '#007AFF' : '#8E8E93'} />
          <Text style={[styles.modeButtonText, captureMode === 'video' && styles.activeModeButtonText]}>
            Video
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, captureMode === 'audio' && styles.activeModeButton]}
          onPress={() => setCaptureMode('audio')}
        >
          <Mic size={20} color={captureMode === 'audio' ? '#007AFF' : '#8E8E93'} />
          <Text style={[styles.modeButtonText, captureMode === 'audio' && styles.activeModeButtonText]}>
            Audio
          </Text>
        </TouchableOpacity>
      </View>

      {captureMode !== 'audio' ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flash ? 'on' : 'off'}
        >
          <View style={styles.cameraOverlay}>
            {captureMode === 'photo' && <View style={styles.focusFrame} />}
            {isRecordingVideo && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  REC {ItemManager.formatDuration(recordingDuration)}
                </Text>
              </View>
            )}
          </View>
        </CameraView>
      ) : (
        <View style={styles.audioRecordingContainer}>
          <View style={styles.audioVisualizer}>
            <Mic size={64} color={isRecordingAudio ? '#FF3B30' : '#9B59B6'} />
            {isRecordingAudio && (
              <View style={styles.audioWaves}>
                {[...Array(5)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.audioWave,
                      { animationDelay: `${i * 0.1}s` }
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
          {isRecordingAudio && (
            <Text style={styles.audioRecordingTime}>
              {ItemManager.formatDuration(recordingDuration)}
            </Text>
          )}
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={pickFromLibrary}
        >
          {captureMode === 'photo' && <Image size={24} color="#FFFFFF" />}
          {captureMode === 'video' && <Video size={24} color="#FFFFFF" />}
          {captureMode === 'audio' && <Mic size={24} color="#FFFFFF" />}
          <Text style={styles.controlButtonText}>Import</Text>
        </TouchableOpacity>

        {captureMode === 'photo' && (
          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.capturingButton]}
            onPress={takePicture}
            disabled={isCapturing}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>
        )}

        {captureMode === 'video' && (
          <TouchableOpacity
            style={[styles.captureButton, isRecordingVideo && styles.recordingButton]}
            onPress={isRecordingVideo ? stopVideoRecording : startVideoRecording}
          >
            {isRecordingVideo ? (
              <Square size={32} color="#FFFFFF" />
            ) : (
              <Video size={32} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        )}

        {captureMode === 'audio' && (
          <TouchableOpacity
            style={[styles.captureButton, isRecordingAudio && styles.recordingButton]}
            onPress={isRecordingAudio ? stopAudioRecording : startAudioRecording}
          >
            {isRecordingAudio ? (
              <Square size={32} color="#FFFFFF" />
            ) : (
              <Mic size={32} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        )}

        {captureMode !== 'audio' && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleCameraFacing}
          >
            <RotateCcw size={24} color="#FFFFFF" />
            <Text style={styles.controlButtonText}>Flip</Text>
          </TouchableOpacity>
        )}
        
        {captureMode === 'audio' && (
          <View style={styles.controlButton} />
        )}
      </View>

      <VaultSelectionModal
        visible={showVaultSelection}
        onClose={handleVaultSelectionClose}
        onVaultSelected={handleVaultSelected}
        title="Save Photo"
        subtitle="Choose which vault to save this photo to"
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  activeModeButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
    marginLeft: 6,
  },
  activeModeButtonText: {
    color: '#007AFF',
  },
  camera: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  focusFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  audioRecordingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    margin: 20,
    borderRadius: 16,
  },
  audioVisualizer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  audioWaves: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  audioWave: {
    width: 4,
    height: 20,
    backgroundColor: '#9B59B6',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  audioRecordingTime: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2C2C2E',
  },
  controlButtonText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginTop: 4,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  capturingButton: {
    backgroundColor: '#FF3B30',
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  webSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
  },
  webNote: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  importButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});