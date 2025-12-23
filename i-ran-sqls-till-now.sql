-- Vaults table
CREATE TABLE vaults (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#007AFF',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vault items (both data items and file references)
CREATE TABLE vault_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;

-- Vault policies
CREATE POLICY "Users can view own vaults" ON vaults
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vaults" ON vaults
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vaults" ON vaults
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vaults" ON vaults
  FOR DELETE USING (auth.uid() = user_id);

-- Vault items policies
CREATE POLICY "Users can view own vault items" ON vault_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vault items" ON vault_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault items" ON vault_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault items" ON vault_items
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for vault files
INSERT INTO storage.buckets (id, name, public) VALUES ('vault-files', 'vault-files', false);

-- Storage policies
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vault-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'vault-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vault-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Indexes for performance
CREATE INDEX idx_vaults_user_id ON vaults(user_id);
CREATE INDEX idx_vault_items_vault_id ON vault_items(vault_id);
CREATE INDEX idx_vault_items_user_id ON vault_items(user_id);
CREATE INDEX idx_vault_items_type ON vault_items(type);
