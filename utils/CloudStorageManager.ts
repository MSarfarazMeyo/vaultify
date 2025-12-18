import { supabase } from './SupabaseClient';
import { SecurityManager } from './SecurityManager';

export interface CloudFile {
  id: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  vaultId?: string;
  createdAt: string;
}

export class CloudStorageManager {
  private static readonly BUCKET_NAME = 'user-files';

  static async uploadFile(
    fileUri: string, 
    filename: string, 
    vaultId?: string
  ): Promise<CloudFile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Read file data
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const fileSize = blob.size;

      // Check quota
      const canUpload = await this.checkQuota(fileSize);
      if (!canUpload) throw new Error('Storage quota exceeded');

      // Generate unique file path
      const filePath = `${user.id}/${Date.now()}_${filename}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, blob);

      if (error) throw error;

      // Save metadata to database
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          filename,
          file_path: filePath,
          file_size: fileSize,
          mime_type: blob.type,
          vault_id: vaultId
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update storage usage
      await this.updateStorageUsage(fileSize);

      return {
        id: fileRecord.id,
        filename: fileRecord.filename,
        filePath: fileRecord.file_path,
        fileSize: fileRecord.file_size,
        mimeType: fileRecord.mime_type,
        vaultId: fileRecord.vault_id,
        createdAt: fileRecord.created_at
      };
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    }
  }

  static async downloadFile(fileId: string): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get file metadata
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .select('file_path')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single();

      if (dbError || !fileRecord) throw new Error('File not found');

      // Get signed URL for download
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(fileRecord.file_path, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Download failed:', error);
      return null;
    }
  }

  static async deleteFile(fileId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get file metadata
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .select('file_path, file_size')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single();

      if (dbError || !fileRecord) return false;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileRecord.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: deleteError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Update storage usage
      await this.updateStorageUsage(-fileRecord.file_size);
      return true;
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  }

  static async getStorageUsage(): Promise<{ used: number; quota: number }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { used: 0, quota: 0 };

      const { data, error } = await supabase
        .from('storage_usage')
        .select('used_bytes, quota_bytes')
        .eq('user_id', user.id)
        .single();

      if (error || !data) return { used: 0, quota: 0 };
      
      return {
        used: data.used_bytes,
        quota: data.quota_bytes
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { used: 0, quota: 0 };
    }
  }

  private static async checkQuota(fileSize: number): Promise<boolean> {
    const { used, quota } = await this.getStorageUsage();
    return (used + fileSize) <= quota;
  }

  private static async updateStorageUsage(sizeChange: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('update_storage_usage', {
        user_id: user.id,
        size_change: sizeChange
      });
    } catch (error) {
      console.error('Failed to update storage usage:', error);
    }
  }
}