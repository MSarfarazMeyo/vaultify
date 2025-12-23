import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/SupabaseClient';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export interface VaultItem {
  id: string;
  vault_id: string;
  user_id: string;
  type: string;
  name: string;
  data: any;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

// Get vault items
export const useVaultItems = (vaultId: string) => {
  return useQuery({
    queryKey: ['vault-items', vaultId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('vault_id', vaultId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to SecureItem format
      return data.map((item) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        vaultId: item.vault_id,
        createdAt: new Date(item.created_at).getTime(),
        updatedAt: new Date(item.updated_at).getTime(),
        tags: item.tags || [],
        isFavorite: item.is_favorite || false,
        ...item.data, // Spread JSONB data
      }));
    },
    enabled: !!vaultId,
  });
};

// Create vault item
export const useCreateVaultItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vaultId,
      itemData,
    }: {
      vaultId: string;
      itemData: any;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Extract base fields and put rest in data JSONB
      const {
        id,
        type,
        name,
        createdAt,
        updatedAt,
        tags,
        isFavorite,
        ...data
      } = itemData;

      const { data: newItem, error } = await supabase
        .from('vault_items')
        .insert({
          vault_id: vaultId,
          user_id: user.id,
          type,
          name,
          data,
          tags: tags || [],
          is_favorite: isFavorite || false,
        })
        .select()
        .single();

      if (error) throw error;
      return newItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['vault-items', data.vault_id],
      });
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
    },
  });
};

// Update vault item
export const useUpdateVaultItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { type, name, tags, isFavorite, ...data } = updates;

      const { data: updatedItem, error } = await supabase
        .from('vault_items')
        .update({
          ...(type && { type }),
          ...(name && { name }),
          ...(tags && { tags }),
          ...(isFavorite !== undefined && { is_favorite: isFavorite }),
          ...(Object.keys(data).length > 0 && { data }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['vault-items', data.vault_id],
      });
    },
  });
};

// Delete vault item
export const useDeleteVaultItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get item info before deletion
      const { data: item } = await supabase
        .from('vault_items')
        .select('vault_id, type, data')
        .eq('id', id)
        .single();

      // Delete file from storage if it's a file item
      if (
        item &&
        ['photo', 'video', 'audio', 'document', 'file'].includes(item.type)
      ) {
        const filePath = item.data?.file_path;
        if (filePath) {
          await supabase.storage.from('vault-files').remove([filePath]);
          console.log(`✅ Deleted file from storage: ${filePath}`);
        }
      }

      const { error } = await supabase
        .from('vault_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log(`✅ Deleted item from table: ${id}`);
      return { id, vaultId: item?.vault_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['vault-items', data.vaultId],
      });
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
    },
  });
};

// Upload file to storage
export const useUploadFile = () => {
  return useMutation({
    mutationFn: async ({
      file,
      vaultId,
      fileName,
    }: {
      file: string;
      vaultId: string;
      fileName: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const filePath = `${user.id}/${vaultId}/${fileName}`;

      const base64 = await FileSystem.readAsStringAsync(file, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(base64);

      const { data, error } = await supabase.storage
        .from('vault-files')
        .upload(filePath, arrayBuffer);

      if (error) throw error;
      return { ...data, filePath };
    },
  });
};
