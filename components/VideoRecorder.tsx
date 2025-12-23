import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import { Video, Square } from 'lucide-react-native';
import { SubscriptionManager } from '@/utils/SubscriptionManager';
import { ItemManager } from '@/utils/ItemManager';

interface VideoRecorderProps {
  facing: CameraType;
  onVideoRecorded: (videoData: any) => void;
}

export default function VideoRecorder({
  facing,
  onVideoRecorded,
}: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    setIsCameraReady(false);
    const timer = setTimeout(() => setIsCameraReady(true), 2000);
    return () => clearTimeout(timer);
  }, [facing]);

  const startRecording = async () => {
    const canAdd = await SubscriptionManager.canAddVideo();
    if (!canAdd.allowed) {
      Alert.alert('Upgrade Required', canAdd.reason);
      return;
    }

    if (!cameraRef.current || isRecording || !isCameraReady) return;

    try {
      setIsRecording(true);
      setDuration(0);

      const timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 300,
      });

      clearInterval(timer);

      if (video) {
        onVideoRecorded({
          type: 'video',
          name: `Video ${Date.now()}`,
          filename: `video_${Date.now()}.mp4`,
          encryptedData: video.uri,
          size: 5120000,
          duration,
          videoUrl: video.uri,
          thumbnailUrl: video.uri,
          resolution: '1280x720',
          format: 'mp4',
          actualVideoData: video.uri,
        });
      }
    } catch (error) {
      console.error('Video recording error:', error);
      Alert.alert('Error', 'Failed to record video');
    } finally {
      setIsRecording(false);
      setDuration(0);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;
    try {
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onCameraReady={() => setIsCameraReady(true)}
        mode="video"
      />
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>
            REC {ItemManager.formatDuration(duration)}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.recordButton, isRecording && styles.recordingButton]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? (
          <Square size={32} color="#FFFFFF" />
        ) : (
          <Video size={32} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
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
  recordButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
  },
});
