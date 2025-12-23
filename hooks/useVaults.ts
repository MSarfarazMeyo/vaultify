import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/SupabaseClient';

export interface Vault {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
  itemCount?: number;
  lastAccessed?: number;
  isLocked?: boolean;
}

// Get all vaults
export const useVaults = () => {
  return useQuery({
    queryKey: ['vaults'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('vaults')
        .select(`
          *,
          vault_items(count)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data.map(vault => ({
        ...vault,
        itemCount: vault.vault_items?.[0]?.count || 0,
        lastAccessed: new Date(vault.updated_at).getTime(),
        isLocked: false // TODO: Implement locking logic
      }));
    },
  });
};

// Get single vault
export const useVault = (id: string) => {
  return useQuery({
    queryKey: ['vault', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vaults')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

// Create vault
export const useCreateVault = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description, color }: { 
      name: string; 
      description: string; 
      color: string; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('vaults')
        .insert({
          name,
          description,
          color,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
    },
  });
};

// Update vault
export const useUpdateVault = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: Partial<Vault>; 
    }) => {
      const { data, error } = await supabase
        .from('vaults')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      queryClient.invalidateQueries({ queryKey: ['vault', data.id] });
    },
  });
};

// Delete vault
export const useDeleteVault = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete all files in storage for this vault
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Try to delete the entire vault folder
      const { data: files, error: listError } = await supabase.storage
        .from('vault-files')
        .list(`${user.id}/${id}`);

      if (!listError && files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${id}/${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from('vault-files')
          .remove(filePaths);
        
        if (!deleteError) {
          console.log(`🗑️ Deleted ${files.length} files from storage for vault: ${id}`);
        }
      } else {
        console.log(`📁 No files to delete from storage for vault: ${id}`);
      }

      // Delete vault (cascade will delete vault_items)
      const { error } = await supabase
        .from('vaults')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log(`✅ Deleted vault from table: ${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
    },
  });
};