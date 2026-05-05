import { useState, useEffect, useCallback } from 'react';

/**
 * useCloudStorage — Hook para armazenamento persistente via localStorage.
 * Funciona como um useState sincronizado com localStorage.
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

  // Listen for cross-tab updates
  useEffect(() => {
    const handler = (e) => {
      if (e.key === storageKey && e.newValue) {
        try {
          setDataState(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [storageKey]);

  const setData = useCallback((newValue) => {
    const value = typeof newValue === 'function' ? newValue(data) : newValue;
    setDataState(value);
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (e) {
      console.warn(`[CloudStorage] Failed to save "${key}":`, e.message);
    }
  }, [key, storageKey, data]);

  return [data, setData];
};

/**
 * preloadUserCloudData — No-op for compatibility.
 * Data is loaded from localStorage on hook mount.
 */
export const preloadUserCloudData = async (email) => {
  // Data is already in localStorage — nothing to preload
  return;
};
