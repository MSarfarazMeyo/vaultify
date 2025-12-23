import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Platform,
} from 'react-native';
import {
  X,
  Camera,
  FileText,
  CreditCard,
  User,
  Lock,
  File,
  StickyNote,
  Plus,
  Upload,
  Image as ImageIcon,
  Paperclip,
  Trash2,
} from 'lucide-react-native';
import { Video, Mic, Square } from 'lucide-react-native';
import { ItemManager, ItemType } from '@/utils/ItemManager';
import { useCreateVaultItem, useUploadFile } from '@/hooks/useVaultItems';
import { supabase } from '@/utils/SupabaseClient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import VaultSelectionModal from '@/components/VaultSelectionModal';

interface ItemCreationModalProps {
  visible: boolean;
  onClose: () => void;
  vaultId: string;
  onItemCreated: () => void;
}

const itemTypes = [
  {
    type: 'photo',
    icon: <Camera size={24} color="#007AFF" />,
    title: 'Photo',
    color: '#007AFF',
  },
  {
    type: 'video',
    icon: <Video size={24} color="#FF6B35" />,
    title: 'Video',
    color: '#FF6B35',
  },
  {
    type: 'audio',
    icon: <Mic size={24} color="#9B59B6" />,
    title: 'Audio',
    color: '#9B59B6',
  },
  {
    type: 'document',
    icon: <FileText size={24} color="#34C759" />,
    title: 'Document',
    color: '#34C759',
  },
  {
    type: 'card',
    icon: <CreditCard size={24} color="#FF9500" />,
    title: 'Card',
    color: '#FF9500',
  },
  {
    type: 'identity',
    icon: <User size={24} color="#AF52DE" />,
    title: 'Identity',
    color: '#AF52DE',
  },
  {
    type: 'password',
    icon: <Lock size={24} color="#FF3B30" />,
    title: 'Password',
    color: '#FF3B30',
  },
  {
    type: 'file',
    icon: <File size={24} color="#8E8E93" />,
    title: 'File',
    color: '#8E8E93',
  },
  {
    type: 'note',
    icon: <StickyNote size={24} color="#FFD700" />,
    title: 'Note',
    color: '#FFD700',
  },
];

const fileTypes = ['photo', 'video', 'audio', 'document', 'file'];

export default function ItemCreationModal({
  visible,
  onClose,
  vaultId,
  onItemCreated,
}: ItemCreationModalProps) {
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [attachedFile, setAttachedFile] = useState<any>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showVaultSelection, setShowVaultSelection] = useState(false);
  const [pendingItemData, setPendingItemData] = useState<any>(null);

  const [loadingSave, setLoadingSave] = useState<boolean>(false);

  const { mutateAsync: createItem, isPending: isCreating } =
    useCreateVaultItem();
  const { mutateAsync: uploadFile } = useUploadFile();

  const resetForm = () => {
    setSelectedType(null);
    setItemName('');
    setItemNotes('');
    setFormData({});
    setAttachedFile(null);
    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = async (
    type: 'photo' | 'video' | 'audio' | 'document'
  ) => {
    try {
      let result;

      if (type === 'photo') {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        });
      } else if (type === 'video') {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          quality: 0.8,
        });
      } else {
        result = await DocumentPicker.getDocumentAsync({
          type: type === 'audio' ? 'audio/*' : '*/*',
          copyToCacheDirectory: true,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset: any = result.assets[0];
        setAttachedFile({
          uri: asset.uri,
          name: asset.fileName || asset.name || `${type}_${Date.now()}`,
          type: asset.mimeType || asset.type,
          size: asset.fileSize || asset.size || 0,
          base64: asset.base64,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select file');
    }
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
          base64: photo.base64,
        });
        setShowCameraModal(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const startAudioRecording = async () => {
    if (Platform.OS === 'web') return;
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

      const timer = setInterval(
        () => setRecordingDuration((prev) => prev + 1),
        1000
      );
      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) clearInterval(timer);
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopAudioRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        setAttachedFile({
          uri,
          name: `recording_${Date.now()}.m4a`,
          type: 'audio/m4a',
          size: 1024000,
          duration: recordingDuration,
        });
      }
      setRecording(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const handleCreateItem = async () => {
    if (!selectedType || !itemName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    let itemData = {
      type: selectedType,
      name: itemName,
      notes: itemNotes,
      ...formData,
    };

    // Add file data for file types
    if (fileTypes.includes(selectedType) && attachedFile) {
      itemData = {
        ...itemData,
        filename: attachedFile.name,
        size: attachedFile.size,
        mimeType: attachedFile.type,
      };
    }

    // Demo data for testing
    if (selectedType === 'password' && !formData.password) {
      itemData.password = 'SecurePassword123!';
    }
    if (selectedType === 'card' && !formData.cardNumber) {
      itemData = {
        ...itemData,
        cardNumber: '4532123456789012',
        cvv: '123',
        expiryDate: '12/25',
        cardholderName: 'John Doe',
      };
    }

    if (fileTypes.includes(selectedType)) {
      setPendingItemData(itemData);
      setShowVaultSelection(true);
    } else {
      await saveItem(itemData, vaultId);
    }
  };

  const saveItem = async (itemData: any, targetVaultId: string) => {
    try {
      let finalItemData = { ...itemData };

      if (fileTypes.includes(itemData.type) && attachedFile) {
        try {
          const uploadResult = await uploadFile({
            file: attachedFile.uri,
            vaultId: targetVaultId,
            fileName: `${Date.now()}_${attachedFile.name}`,
          });

          finalItemData.file_path = uploadResult.filePath;
          const { data } = supabase.storage
            .from('vault-files')
            .getPublicUrl(uploadResult.filePath);
          finalItemData.file_url = data.publicUrl;
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
        }
      }

      await createItem({ vaultId: targetVaultId, itemData: finalItemData });
      onItemCreated();
      handleClose();
      Alert.alert('Success', 'Item created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create item');
    }
  };

  const renderTypeSelection = () => (
    <View style={styles.typeSelection}>
      <Text style={styles.modalTitle}>Add New Item</Text>
      <ScrollView style={styles.typeGrid}>
        {itemTypes.map((type: any) => (
          <TouchableOpacity
            key={type.type}
            style={styles.typeOption}
            onPress={() => setSelectedType(type.type)}
          >
            <View
              style={[styles.typeIcon, { backgroundColor: `${type.color}20` }]}
            >
              {type.icon}
            </View>
            <Text style={styles.typeTitle}>{type.title}</Text>
            <Plus size={20} color="#8E8E93" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderForm = () => {
    const selectedTypeInfo = itemTypes.find((t) => t.type === selectedType);

    return (
      <View style={styles.itemForm}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => setSelectedType(null)}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.formTitle}>New {selectedTypeInfo?.title}</Text>
        </View>

        <ScrollView style={styles.formContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder={`Enter ${selectedTypeInfo?.title.toLowerCase()} name`}
              value={itemName}
              onChangeText={setItemName}
            />
          </View>

          {/* Type-specific fields */}
          {selectedType === 'card' && (
            <>
              <TextInput
                style={styles.textInput}
                placeholder="Card Number"
                value={formData.cardNumber}
                onChangeText={(text) =>
                  setFormData({ ...formData, cardNumber: text })
                }
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1, marginRight: 8 }]}
                  placeholder="MM/YY"
                  value={formData.expiryDate}
                  onChangeText={(text) =>
                    setFormData({ ...formData, expiryDate: text })
                  }
                />
                <TextInput
                  style={[styles.textInput, { flex: 1, marginLeft: 8 }]}
                  placeholder="CVV"
                  value={formData.cvv}
                  onChangeText={(text) =>
                    setFormData({ ...formData, cvv: text })
                  }
                  secureTextEntry
                />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Cardholder Name"
                value={formData.cardholderName}
                onChangeText={(text) =>
                  setFormData({ ...formData, cardholderName: text })
                }
              />
            </>
          )}

          {selectedType === 'password' && (
            <>
              <TextInput
                style={styles.textInput}
                placeholder="Website"
                value={formData.website}
                onChangeText={(text) =>
                  setFormData({ ...formData, website: text })
                }
              />
              <TextInput
                style={styles.textInput}
                placeholder="Username"
                value={formData.username}
                onChangeText={(text) =>
                  setFormData({ ...formData, username: text })
                }
              />
              <TextInput
                style={styles.textInput}
                placeholder="Password"
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
                secureTextEntry
              />
              <TextInput
                style={styles.textInput}
                placeholder="Email"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
              />
            </>
          )}

          {selectedType === 'identity' && (
            <>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1, marginRight: 8 }]}
                  placeholder="First Name"
                  value={formData.firstName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, firstName: text })
                  }
                />
                <TextInput
                  style={[styles.textInput, { flex: 1, marginLeft: 8 }]}
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, lastName: text })
                  }
                />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="ID Number"
                value={formData.idNumber}
                onChangeText={(text) =>
                  setFormData({ ...formData, idNumber: text })
                }
              />
            </>
          )}

          {selectedType === 'note' && (
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Note content..."
              value={formData.content}
              onChangeText={(text) =>
                setFormData({ ...formData, content: text })
              }
              multiline
            />
          )}

          {/* File attachment for file types */}
          {fileTypes && selectedType && fileTypes.includes(selectedType) && (
            <View style={styles.attachmentSection}>
              <Text style={styles.inputLabel}>Attachment</Text>
              {!attachedFile ? (
                <View style={styles.attachmentOptions}>
                  {selectedType === 'photo' && (
                    <>
                      <TouchableOpacity
                        style={styles.attachmentButton}
                        onPress={() => setShowCameraModal(true)}
                      >
                        <Camera size={20} color="#007AFF" />
                        <Text style={styles.attachmentButtonText}>
                          Take Photo
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.attachmentButton}
                        onPress={() => handleFileSelect('photo')}
                      >
                        <ImageIcon size={20} color="#34C759" />
                        <Text style={styles.attachmentButtonText}>
                          Choose Photo
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedType === 'video' && (
                    <TouchableOpacity
                      style={styles.attachmentButton}
                      onPress={() => handleFileSelect('video')}
                    >
                      <Video size={20} color="#FF6B35" />
                      <Text style={styles.attachmentButtonText}>
                        Choose Video
                      </Text>
                    </TouchableOpacity>
                  )}
                  {selectedType === 'audio' && (
                    <>
                      {!isRecording ? (
                        <TouchableOpacity
                          style={styles.attachmentButton}
                          onPress={startAudioRecording}
                        >
                          <Mic size={20} color="#9B59B6" />
                          <Text style={styles.attachmentButtonText}>
                            Record Audio
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.attachmentButton}
                          onPress={stopAudioRecording}
                        >
                          <Square size={20} color="#FF3B30" />
                          <Text style={styles.attachmentButtonText}>
                            Stop ({recordingDuration}s)
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.attachmentButton}
                        onPress={() => handleFileSelect('audio')}
                      >
                        <Upload size={20} color="#34C759" />
                        <Text style={styles.attachmentButtonText}>
                          Choose Audio
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {(selectedType === 'document' || selectedType === 'file') && (
                    <TouchableOpacity
                      style={styles.attachmentButton}
                      onPress={() => handleFileSelect('document')}
                    >
                      <Paperclip size={20} color="#AF52DE" />
                      <Text style={styles.attachmentButtonText}>
                        Choose File
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.attachedFile}>
                  <Text style={styles.fileName}>{attachedFile.name}</Text>
                  <TouchableOpacity onPress={() => setAttachedFile(null)}>
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              )}
              {attachedFile?.type?.startsWith('image/') && (
                <Image
                  source={{ uri: attachedFile.uri }}
                  style={styles.previewImage}
                />
              )}
            </View>
          )}

          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Notes (optional)"
            value={itemNotes}
            onChangeText={setItemNotes}
            multiline
          />
        </ScrollView>

        <View style={styles.formActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.createButton,
              { backgroundColor: selectedTypeInfo?.color },
            ]}
            onPress={handleCreateItem}
            disabled={isCreating || !itemName.trim()}
          >
            <Text style={styles.createButtonText}>
              {isCreating || loadingSave ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedType ? renderForm() : renderTypeSelection()}
        </View>
      </View>

      {/* Camera Modal */}
      <Modal
        visible={showCameraModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCameraModal(false)}
      >
        <View style={styles.cameraModalOverlay}>
          <View style={styles.cameraContainer}>
            <TouchableOpacity
              style={styles.cameraCloseButton}
              onPress={() => setShowCameraModal(false)}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <CameraView ref={setCameraRef} style={styles.camera} facing="back">
              <TouchableOpacity
                style={styles.captureButton}
                onPress={capturePhoto}
              >
                <View style={styles.captureInner} />
              </TouchableOpacity>
            </CameraView>
          </View>
        </View>
      </Modal>

      <VaultSelectionModal
        visible={showVaultSelection}
        onClose={() => setShowVaultSelection(false)}
        onVaultSelected={async (selectedVaultId) => {
          if (pendingItemData) {
            setLoadingSave(true);
            await saveItem(pendingItemData, selectedVaultId);
            setPendingItemData(null);
            setLoadingSave(false);
          }
        }}
        isLoading={isCreating}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
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
  typeSelection: { flex: 1, padding: 16, paddingTop: 0 },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  typeGrid: { flex: 1 },
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
  typeTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    flex: 1,
  },
  itemForm: { flex: 1, minHeight: 0 },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#48484A',
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
    marginRight: 16,
  },
  formTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  formContent: { flex: 1, padding: 16 },
  inputGroup: { marginBottom: 16 },
  inputRow: { flexDirection: 'row', marginBottom: 16 },
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
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#48484A',
    marginBottom: 16,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  attachmentSection: { marginBottom: 16 },
  attachmentOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
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
    justifyContent: 'space-between',
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    flex: 1,
  },
  previewImage: { width: '100%', height: 150, borderRadius: 12, marginTop: 12 },
  formActions: { flexDirection: 'row', padding: 16, paddingTop: 0 },
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
  createButton: { flex: 1, borderRadius: 12, padding: 16, marginLeft: 8 },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cameraModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)' },
  cameraContainer: { flex: 1 },
  cameraCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  camera: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
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
});
