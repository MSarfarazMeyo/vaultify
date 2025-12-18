-- Function to update storage usage atomically
CREATE OR REPLACE FUNCTION update_storage_usage(user_id UUID, size_change BIGINT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO storage_usage (user_id, used_bytes, updated_at)
  VALUES (user_id, size_change, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    used_bytes = storage_usage.used_bytes + size_change,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set user quota based on subscription
CREATE OR REPLACE FUNCTION set_user_quota(user_id UUID, plan TEXT)
RETURNS VOID AS $$
DECLARE
  quota_gb BIGINT;
BEGIN
  -- Set quota based on plan
  CASE plan
    WHEN 'monthly' THEN quota_gb := 100;
    WHEN 'yearly' THEN quota_gb := 500;
    WHEN 'lifetime' THEN quota_gb := 1000;
    ELSE quota_gb := 0; -- free plan
  END CASE;

  INSERT INTO storage_usage (user_id, quota_bytes, updated_at)
  VALUES (user_id, quota_gb * 1024 * 1024 * 1024, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    quota_bytes = quota_gb * 1024 * 1024 * 1024,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;