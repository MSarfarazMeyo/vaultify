# Supabase Implementation Requirements

## Required npm packages:
```bash
npm install @supabase/supabase-js
npm install react-native-url-polyfill # Already installed
```

## Database Schema:
```sql
-- Users table (auto-created by Supabase Auth)
-- Files metadata table
CREATE TABLE files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  vault_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage usage tracking
CREATE TABLE storage_usage (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  used_bytes BIGINT DEFAULT 0,
  quota_bytes BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription tracking
CREATE TABLE subscriptions (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',
  is_active BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Storage Buckets:
- `user-files`: Main storage bucket for encrypted files
- `thumbnails`: Optimized thumbnails

## Row Level Security Policies:
```sql
-- Files table RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own files" ON files
  FOR ALL USING (auth.uid() = user_id);

-- Storage usage RLS  
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own usage" ON storage_usage
  FOR ALL USING (auth.uid() = user_id);
```

## Required Environment Variables:
```env
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```