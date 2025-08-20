import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert, Image, Platform } from 'react-native';
import { X, Camera, FileText, CreditCard, User, Lock, File, StickyNote, Plus, Upload, Image as ImageIcon, Paperclip, Trash2 } from 'lucide-react-native';
import { Video, Mic, Play, Pause, Square } from 'lucide-react-native';
import { ItemManager, ItemType } from '@/utils/ItemManager';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import VaultSelectionModal from '@/components/VaultSelectionModal';

interface ItemCreationModalProps {
  visible: boolean;
  onClose: () => void;
  vaultId: string;
  onItemCreated: () => void;
}

interface ItemTypeOption {
  type: ItemType;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

export default function ItemCreationModal({ visible, onClose, vaultId, onItemCreated }: ItemCreationModalProps) {
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Type-specific fields
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [website, setWebsite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // File attachment state
  const [attachedFile, setAttachedFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size: number;
    base64?: string;
  } | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  
  // Audio recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioPermission, setAudioPermission] = useState<boolean>(false);
  
  // Video recording state
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecording, setVideoRecording] = useState<any>(null);
  
  const [showVaultSelection, setShowVaultSelection] = useState(false);
  const [pendingItemData, setPendingItemData] = useState<any>(null);

  const itemTypes: ItemTypeOption[] = [
    {
      type: 'photo',
      icon: <Camera size={24} color="#007AFF" />,
      title: 'Photo',
      description: 'Secure photo storage',
      color: '#007AFF'
    },
    {
      type: 'video',
      icon: <Video size={24} color="#FF6B35" />,
      title: 'Video',
      description: 'Secure video storage',
      color: '#FF6B35'
    },
    {
      type: 'audio',
      icon: <Mic size={24} color="#9B59B6" />,
      title: 'Audio',
      description: 'Voice recordings and audio',
      color: '#9B59B6'
    },
    {
      type: 'document',
      icon: <FileText size={24} color="#34C759" />,
      title: 'Document',
      description: 'Important documents',
      color: '#34C759'
    },
    {
      type: 'card',
      icon: <CreditCard size={24} color="#FF9500" />,
      title: 'Card',
      description: 'Credit cards, IDs, memberships',
      color: '#FF9500'
    },
    {
      type: 'identity',
      icon: <User size={24} color="#AF52DE" />,
      title: 'Identity',
      description: 'Personal identification',
      color: '#AF52DE'
    },
    {
      type: 'password',
      icon: <Lock size={24} color="#FF3B30" />,
      title: 'Password',
      description: 'Login credentials',
      color: '#FF3B30'
    },
    {
      type: 'file',
      icon: <File size={24} color="#8E8E93" />,
      title: 'File',
      description: 'Any file type',
      color: '#8E8E93'
    },
    {
      type: 'note',
      icon: <StickyNote size={24} color="#FFD700" />,
      title: 'Note',
      description: 'Secure text notes',
      color: '#FFD700'
    }
  ];

  useEffect(() => {
    if (visible) {
      checkAudioPermissions();
    }
  }, [visible]);

  const checkAudioPermissions = async () => {
    if (Platform.OS === 'web') {
      setAudioPermission(true);
      return;
    }
    
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setAudioPermission(status === 'granted');
    } catch (error) {
      console.error('Failed to get audio permissions:', error);
      setAudioPermission(false);
    }
  };

  const resetForm = () => {
    setSelectedType(null);
    setItemName('');
    setItemNotes('');
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardholderName('');
    setWebsite('');
    setUsername('');
    setPassword('');
    setEmail('');
    setFirstName('');
    setLastName('');
    setIdNumber('');
    setNoteContent('');
    setAttachedFile(null);
    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setIsRecordingVideo(false);
    setVideoRecording(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTakePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Camera not available', 'Camera functionality is not available on web platform');
      return;
    }

    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Camera permission is required to take photos');
        return;
      }
    }

    setShowCameraModal(true);
  };

  const capturePhoto = async () => {
    if (!cameraRef) return;

    try {
      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo) {
        setAttachedFile({
          uri: photo.uri,
          name: `photo_${Date.now()}.jpg`,
          type: 'image/jpeg',
          size: photo.base64?.length || 0,
          base64: photo.base64
        });
        setShowCameraModal(false);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const startAudioRecording = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Audio recording not available', 'Audio recording is not available on web platform');
      return;
    }

    if (!audioPermission) {
      Alert.alert('Permission required', 'Audio recording permission is required');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
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
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start audio recording');
    }
  };

  const stopAudioRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      if (uri) {
        setAttachedFile({
          uri: uri,
          name: `recording_${Date.now()}.m4a`,
          type: 'audio/m4a',
          size: 1024000, // Estimate
          duration: recordingDuration
        });
      }
      
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop audio recording');
    }
  };

  const startVideoRecording = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Video recording not available', 'Video recording is not available on web platform');
      return;
    }

    if (!cameraRef) return;

    try {
      setIsRecordingVideo(true);
      const video = await cameraRef.recordAsync({
        quality: '720p',
        maxDuration: 60, // 1 minute max
      });

      if (video) {
        setAttachedFile({
          uri: video.uri,
          name: `video_${Date.now()}.mp4`,
          type: 'video/mp4',
          size: 5120000, // Estimate
        });
        setShowCameraModal(false);
      }
    } catch (error) {
      console.error('Failed to record video:', error);
      Alert.alert('Error', 'Failed to record video');
    } finally {
      setIsRecordingVideo(false);
    }
  };

  const stopVideoRecording = async () => {
    if (!cameraRef || !isRecordingVideo) return;

    try {
      await cameraRef.stopRecording();
    } catch (error) {
      console.error('Failed to stop video recording:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant permission to access your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAttachedFile({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
          base64: asset.base64
        });
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handlePickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant permission to access your media library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAttachedFile({
          uri: asset.uri,
          name: asset.fileName || `video_${Date.now()}.mp4`,
          type: asset.mimeType || 'video/mp4',
          size: asset.fileSize || 0,
          duration: asset.duration || 0
        });
      }
    } catch (error) {
      console.error('Failed to pick video:', error);
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAttachedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'audio/m4a',
          size: asset.size || 0
        });
      }
    } catch (error) {
      console.error('Failed to pick audio:', error);
      Alert.alert('Error', 'Failed to select audio file');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAttachedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0
        });
      }
    } catch (error) {
      console.error('Failed to pick document:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
  };

  const getAttachmentIcon = () => {
    if (!attachedFile) return null;
    
    if (attachedFile.type.startsWith('image/')) {
      return <ImageIcon size={20} color="#007AFF" />;
    } else if (attachedFile.type.includes('pdf')) {
      return <FileText size={20} color="#FF3B30" />;
    } else {
      return <File size={20} color="#8E8E93" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreateItem = async () => {
    if (!selectedType || !itemName.trim()) {
      Alert.alert('Error', 'Please enter a name for the item');
      return;
    }

    let itemData: any = {
        type: selectedType,
        name: itemName,
        notes: itemNotes
      };

      // Add type-specific data
      switch (selectedType) {
        case 'card':
          itemData = {
            ...itemData,
            cardNumber,
            expiryDate,
            cvv,
            cardholderName,
            cardType: 'credit'
          };
          break;
        case 'password':
          itemData = {
            ...itemData,
            website,
            username,
            password,
            email
          };
          break;
        case 'identity':
          itemData = {
            ...itemData,
            firstName,
            lastName,
            idNumber,
            identityType: 'other'
          };
          break;
        case 'note':
          itemData = {
            ...itemData,
            title: itemName,
            content: noteContent
          };
          break;
        case 'document':
          itemData = {
            ...itemData,
            documentType: 'other',
            filename: attachedFile?.name || `${itemName}.pdf`,
            encryptedData: attachedFile?.base64 || 'demo_document_data',
            size: attachedFile?.size || 512000,
            mimeType: attachedFile?.type || 'application/pdf'
          };
          break;
        case 'file':
          itemData = {
            ...itemData,
            filename: attachedFile?.name || itemName,
            encryptedData: attachedFile?.base64 || 'demo_file_data',
            size: attachedFile?.size || 256000,
            mimeType: attachedFile?.type || 'application/octet-stream'
          };
          break;
        case 'photo':
          itemData = {
            ...itemData,
            filename: attachedFile?.name || `${itemName}.jpg`,
            encryptedData: attachedFile?.base64 || attachedFile?.uri || 'demo_photo_data',
            size: attachedFile?.size || 1024000,
            imageUrl: attachedFile?.uri,
            thumbnailUrl: attachedFile?.uri,
            fullSizeUrl: attachedFile?.uri,
            actualPhotoData: attachedFile?.base64 || attachedFile?.uri
          };
          break;
        case 'video':
          itemData = {
            ...itemData,
            filename: attachedFile?.name || `${itemName}.mp4`,
            encryptedData: attachedFile?.uri || 'demo_video_data',
            size: attachedFile?.size || 5120000,
            duration: (attachedFile as any)?.duration || 30,
            videoUrl: attachedFile?.uri,
            thumbnailUrl: attachedFile?.uri,
            resolution: '1920x1080',
            format: 'mp4',
            actualVideoData: attachedFile?.uri
          };
          break;
        case 'audio':
          itemData = {
            ...itemData,
            filename: attachedFile?.name || `${itemName}.m4a`,
            encryptedData: attachedFile?.uri || 'demo_audio_data',
            size: attachedFile?.size || 1024000,
            duration: (attachedFile as any)?.duration || recordingDuration || 60,
            audioUrl: attachedFile?.uri,
            format: 'm4a',
            bitrate: 128,
            actualAudioData: attachedFile?.uri
          };
          break;
      }

    // Add some demo data for better testing
    if (selectedType === 'password' && !itemData.password) {
      itemData.password = 'SecurePassword123!';
    }
    if (selectedType === 'card' && !itemData.cardNumber) {
      itemData.cardNumber = '4532123456789012';
      itemData.cvv = '123';
      itemData.expiryDate = '12/25';
      itemData.cardholderName = 'John Doe';
    }
    
    // For photos, show vault selection; for other types, save directly to current vault
    if (selectedType === 'photo') {
      setPendingItemData(itemData);
      setShowVaultSelection(true);
    } else if (selectedType === 'video' || selectedType === 'audio') {
      // Also show vault selection for videos and audio
      setPendingItemData(itemData);
      setShowVaultSelection(true);
    } else {
      await saveItem(itemData, vaultId);
    }
  };

  const saveItem = async (itemData: any, targetVaultId: string) => {
    setIsCreating(true);

    try {
      await ItemManager.createItem(itemData, targetVaultId);
      onItemCreated();
      handleClose();
      Alert.alert('Success', `${itemTypes.find(t => t.type === itemData.type)?.title} created successfully`);
    } catch (error) {
      console.error('Failed to create item:', error);
      Alert.alert('Error', 'Failed to create item');
    } finally {
      setIsCreating(false);
    }
  };

  const handleVaultSelected = async (selectedVaultId: string) => {
    if (pendingItemData) {
      await saveItem(pendingItemData, selectedVaultId);
      setPendingItemData(null);
    }
  };

  const handleVaultSelectionClose = () => {
    setShowVaultSelection(false);
    setPendingItemData(null);
  };

  const renderTypeSelection = () => (
    <View style={styles.typeSelection}>
      <Text style={styles.modalTitle}>Add New Item</Text>
      <Text style={styles.modalSubtitle}>Choose the type of item to add</Text>
      
      <ScrollView style={styles.typeGrid} showsVerticalScrollIndicator={false}>
        {itemTypes.map((type) => (
          <TouchableOpacity
            key={type.type}
            style={styles.typeOption}
            onPress={() => setSelectedType(type.type)}
          >
            <View style={[styles.typeIcon, { backgroundColor: `${type.color}20` }]}>
              {type.icon}
            </View>
            <View style={styles.typeInfo}>
              <Text style={styles.typeTitle}>{type.title}</Text>
              <Text style={styles.typeDescription}>{type.description}</Text>
            </View>
            <Plus size={20} color="#8E8E93" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderItemForm = () => {
    const selectedTypeInfo = itemTypes.find(t => t.type === selectedType);
    
    return (
      <>
      <View style={styles.itemForm}>
        <View style={styles.formHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedType(null)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.formTitle}>New {selectedTypeInfo?.title}</Text>
        </View>

        <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder={`Enter ${selectedTypeInfo?.title.toLowerCase()} name`}
              placeholderTextColor="#8E8E93"
              value={itemName}
              onChangeText={setItemName}
            />
          </View>

          {/* Type-specific fields */}
          {selectedType === 'card' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Card Number</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor="#8E8E93"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="MM/YY"
                    placeholderTextColor="#8E8E93"
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="123"
                    placeholderTextColor="#8E8E93"
                    value={cvv}
                    onChangeText={setCvv}
                    keyboardType="numeric"
                    secureTextEntry
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Cardholder Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="John Doe"
                  placeholderTextColor="#8E8E93"
                  value={cardholderName}
                  onChangeText={setCardholderName}
                />
              </View>
            </>
          )}

          {selectedType === 'password' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Website</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="example.com"
                  placeholderTextColor="#8E8E93"
                  value={website}
                  onChangeText={setWebsite}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="username"
                  placeholderTextColor="#8E8E93"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="password"
                  placeholderTextColor="#8E8E93"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="email@example.com"
                  placeholderTextColor="#8E8E93"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </>
          )}

          {selectedType === 'identity' && (
            <>
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="John"
                    placeholderTextColor="#8E8E93"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Doe"
                    placeholderTextColor="#8E8E93"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ID Number</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="123456789"
                  placeholderTextColor="#8E8E93"
                  value={idNumber}
                  onChangeText={setIdNumber}
                />
              </View>
            </>
          )}

          {selectedType === 'note' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Content</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter your note content..."
                placeholderTextColor="#8E8E93"
                value={noteContent}
                onChangeText={setNoteContent}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* File Attachment Section */}
          {(selectedType === 'photo' || selectedType === 'document' || selectedType === 'file') && (
            <View style={styles.attachmentSection}>
              <Text style={styles.inputLabel}>Attachment</Text>
              
              {!attachedFile ? (
                <View style={styles.attachmentOptions}>
                  {selectedType === 'photo' && (
                    <>
                      <TouchableOpacity
                        style={styles.attachmentButton}
                        onPress={handleTakePhoto}
                      >
                        <Camera size={20} color="#007AFF" />
                        <Text style={styles.attachmentButtonText}>Take Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.attachmentButton}
                        onPress={handlePickImage}
                      >
                        <ImageIcon size={20} color="#34C759" />
                        <Text style={styles.attachmentButtonText}>Choose Photo</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  
                  {selectedType === 'document' && (
                    <TouchableOpacity
                      style={styles.attachmentButton}
                      onPress={handlePickDocument}
                    >
                      <FileText size={20} color="#FF9500" />
                      <Text style={styles.attachmentButtonText}>Choose Document</Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedType === 'file' && (
                    <TouchableOpacity
                      style={styles.attachmentButton}
                      onPress={handlePickDocument}
                    >
                      <Paperclip size={20} color="#AF52DE" />
                      <Text style={styles.attachmentButtonText}>Choose File</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.attachedFile}>
                  <View style={styles.fileInfo}>
                    {getAttachmentIcon()}
                    <View style={styles.fileDetails}>
                      <Text style={styles.fileName} numberOfLines={1}>{attachedFile.name}</Text>
                      <Text style={styles.fileSize}>{formatFileSize(attachedFile.size)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={removeAttachment}
                  >
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              )}
              
              {attachedFile?.type.startsWith('image/') && (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: attachedFile.uri }} style={styles.previewImage} />
                </View>
              )}
            </View>
          )}

          {/* Video Attachment Section */}
          {selectedType === 'video' && (
            <View style={styles.attachmentSection}>
              <Text style={styles.inputLabel}>Video</Text>
              
              {!attachedFile ? (
                <View style={styles.attachmentOptions}>
                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={() => setShowCameraModal(true)}
                  >
                    <Video size={20} color="#FF6B35" />
                    <Text style={styles.attachmentButtonText}>Record Video</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={handlePickVideo}
                  >
                    <Upload size={20} color="#34C759" />
                    <Text style={styles.attachmentButtonText}>Choose Video</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.attachedFile}>
                  <View style={styles.fileInfo}>
                    <Video size={20} color="#FF6B35" />
                    <View style={styles.fileDetails}>
                      <Text style={styles.fileName} numberOfLines={1}>{attachedFile.name}</Text>
                      <Text style={styles.fileSize}>
                        {formatFileSize(attachedFile.size)}
                        {(attachedFile as any).duration && ` • ${ItemManager.formatDuration((attachedFile as any).duration)}`}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={removeAttachment}
                  >
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Audio Attachment Section */}
          {selectedType === 'audio' && (
            <View style={styles.attachmentSection}>
              <Text style={styles.inputLabel}>Audio</Text>
              
              {!attachedFile ? (
                <View style={styles.attachmentOptions}>
                  {!isRecording ? (
                    <TouchableOpacity
                      style={styles.attachmentButton}
                      onPress={startAudioRecording}
                    >
                      <Mic size={20} color="#9B59B6" />
                      <Text style={styles.attachmentButtonText}>Record Audio</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.attachmentButton, styles.recordingButton]}
                      onPress={stopAudioRecording}
                    >
                      <Square size={20} color="#FF3B30" />
                      <Text style={styles.attachmentButtonText}>
                        Stop ({ItemManager.formatDuration(recordingDuration)})
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={handlePickAudio}
                  >
                    <Upload size={20} color="#34C759" />
                    <Text style={styles.attachmentButtonText}>Choose Audio</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.attachedFile}>
                  <View style={styles.fileInfo}>
                    <Mic size={20} color="#9B59B6" />
                    <View style={styles.fileDetails}>
                      <Text style={styles.fileName} numberOfLines={1}>{attachedFile.name}</Text>
                      <Text style={styles.fileSize}>
                        {formatFileSize(attachedFile.size)}
                        {((attachedFile as any).duration || recordingDuration) && 
                          ` • ${ItemManager.formatDuration((attachedFile as any).duration || recordingDuration)}`
                        }
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={removeAttachment}
                  >
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Additional notes (optional)"
              placeholderTextColor="#8E8E93"
              value={itemNotes}
              onChangeText={setItemNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={styles.formActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: selectedTypeInfo?.color }]}
            onPress={handleCreateItem}
            disabled={isCreating || !itemName.trim()}
          >
            <Text style={styles.createButtonText}>
              {isCreating ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera Modal */}
      <Modal
        visible={showCameraModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCameraModal(false)}
      >
        <View style={styles.cameraModalOverlay}>
          <View style={styles.cameraContainer}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.cameraCloseButton}
                onPress={() => setShowCameraModal(false)}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Take Photo</Text>
              <View style={{ width: 40 }} />
            </View>
            
            <CameraView
              ref={setCameraRef}
              style={styles.camera}
              facing="back"
            >
              <View style={styles.cameraOverlay}>
                {selectedType === 'video' ? (
                  <View style={styles.videoControls}>
                    {!isRecordingVideo ? (
                      <TouchableOpacity
                        style={styles.recordButton}
                        onPress={startVideoRecording}
                      >
                        <Video size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.recordButton, styles.recordingButton]}
                        onPress={stopVideoRecording}
                      >
                        <Square size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={capturePhoto}
                  >
                    <View style={styles.captureInner} />
                  </TouchableOpacity>
                )}
              </View>
            </CameraView>
          </View>
        </View>
      </Modal>

      <VaultSelectionModal
        visible={showVaultSelection}
        onClose={handleVaultSelectionClose}
        onVaultSelected={handleVaultSelected}
        title="Save Photo"
        subtitle="Choose which vault to save this photo to"
      />
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedType ? renderItemForm() : renderTypeSelection()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    paddingTop: 60, // Account for status bar and notch
    paddingBottom: 40, // Account for home indicator
    paddingHorizontal: 10,
  },
  modalContent: {
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    maxHeight: '95%',
    paddingTop: 10,
    flex: 1,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 5,
  },
  typeSelection: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  typeGrid: {
    flex: 1,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  itemForm: {
    flex: 1,
    minHeight: 0, // Allow flex shrinking
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#48484A',
    flexShrink: 0,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  formTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  formContent: {
    flex: 1,
    padding: 16,
    minHeight: 0, // Allow scrolling
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
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    flexShrink: 0,
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
  attachmentSection: {
    marginBottom: 16,
  },
  attachmentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#48484A',
    borderStyle: 'dashed',
    flex: 1,
    minWidth: 120,
  },
  attachmentButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  attachedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#48484A',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
  cameraModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  cameraContainer: {
    flex: 1,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  cameraCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  camera: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  videoControls: {
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
});