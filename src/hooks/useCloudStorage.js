import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

/**
 * useCloudStorage — Hook para sincronizar dados entre localStorage e Supabase.
 * Usa localStorage como cache local + fallback, e Supabase como fonte remota.
 */
export const useCloudStorage = (key, defaultValue = []) => {
  const storageKey = `guru_cloud_${key}`;

  const [data, setDataState] = useState(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      return cached ? JSON.parse(cached) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // Load from Supabase on mount
  useEffect(() => {
    const loadFromCloud = async () => {
      try {
        const userRaw = localStorage.getItem('guru_user');
        if (!userRaw) return;
        const user = JSON.parse(userRaw);
        if (!user?.email) return;

        const { data: rows, error } = await supabase
          .from('guru_cloud_data')
          .select('value')
          .eq('user_email', user.email)
          .eq('key', key)
          .single();

        if (!error && rows?.value) {
          const parsed = typeof rows.value === 'string' ? JSON.parse(rows.value) : rows.value;
          setDataState(parsed);
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn(`[CloudStorage] Failed to load "${key}" from cloud:`, e.message);
      }
    };
    loadFromCloud();
  }, [key, storageKey]);

  // Setter: update local + cloud
  const setData = useCallback(async (newValue) => {
    const value = typeof newValue === 'function' ? newValue(data) : newValue;
    setDataState(value);
    localStorage.setItem(storageKey, JSON.stringify(value));

    try {
      const userRaw = localStorage.getItem('guru_user');
      if (!userRaw) return;
      const user = JSON.parse(userRaw);
      if (!user?.email) return;

      await supabase
        .from('guru_cloud_data')
        .upsert({
          user_email: user.email,
          key,
          value: JSON.stringify(value),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_email,key' });
    } catch (e) {
      console.warn(`[CloudStorage] Failed to save "${key}" to cloud:`, e.message);
    }
  }, [key, storageKey, data]);

  return [data, setData];
};

/**
 * preloadUserCloudData — Preloads ALL cloud data for a user into localStorage.
 * Called on login/session restore to ensure fast local reads.
 */
export const preloadUserCloudData = async (email) => {
  if (!email) return;
  try {
    const { data: rows, error } = await supabase
      .from('guru_cloud_data')
      .select('key, value')
      .eq('user_email', email);

    if (!error && rows) {
      rows.forEach(row => {
        try {
          localStorage.setItem(`guru_cloud_${row.key}`, typeof row.value === 'string' ? row.value : JSON.stringify(row.value));
        } catch {}
      });
      console.log(`[CloudStorage] Preloaded ${rows.length} keys for ${email}`);
    }
  } catch (e) {
    console.warn('[CloudStorage] Preload failed:', e.message);
  }
};
