import { useState, useEffect, useCallback, useRef } from 'react';
import { resolveApiUrl } from '../utils/apiUtils';

/**
 * useCloudStorage — Drop-in replacement for useState + localStorage.
 * Syncs automatically to Supabase per user account.
 *
 * Usage:
 *   const [scripts, setScripts] = useCloudStorage('scripts', []);
 *
 * - On mount: loads from Supabase (fallback to localStorage cache).
 * - On change: saves to BOTH Supabase AND localStorage (offline cache).
 * - Debounced: waits 800ms after last change before saving to cloud.
 * - Isolated: each user only sees their own data.
 */

const getUserEmail = () => {
  try {
    const stored = localStorage.getItem('guru_user');
    if (stored) return (JSON.parse(stored).email || '').toLowerCase().trim();
  } catch {}
  return '';
};

// Global loader cache to avoid duplicate fetches for the same key in same session
const loadedKeys = new Set();
const pendingSaves = {};

export function useCloudStorage(dataKey, defaultValue) {
  const localKey = `guru_cloud_${dataKey}`;
  
  // ID único para identificar esta chamada específica do hook e evitar loops de disparos
  const instanceId = useRef(Math.random()).current;

  // Initialize from localStorage cache first (instant)
  const [value, setValue] = useState(() => {
    try {
      const cached = localStorage.getItem(localKey);
      if (cached !== null) return JSON.parse(cached);
    } catch {}
    return defaultValue;
  });

  const [isLoaded, setIsLoaded] = useState(loadedKeys.has(dataKey));
  const saveTimerRef = useRef(null);

  // Load from cloud on mount (if not already loaded this session)
  useEffect(() => {
    if (loadedKeys.has(dataKey)) {
      setIsLoaded(true);
      return;
    }

    const email = getUserEmail();
    if (!email) {
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    fetch(resolveApiUrl(`/api/user-data?email=${encodeURIComponent(email)}&key=${dataKey}`))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return;
        if (data?.value !== null && data?.value !== undefined) {
          const cloudValue = data.value;
          setValue(cloudValue);
          // Update local cache
          localStorage.setItem(localKey, JSON.stringify(cloudValue));
        }
        loadedKeys.add(dataKey);
        setIsLoaded(true);
      })
      .catch(() => {
        // Cloud unreachable — use local cache (already set in useState init)
        loadedKeys.add(dataKey);
        setIsLoaded(true);
      });

    return () => { cancelled = true; };
  }, [dataKey]);

  // Setter that mirrors localStorage and debounces cloud save
  const setCloudValue = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      // Instant local cache
      try { localStorage.setItem(localKey, JSON.stringify(next)); } catch {}

      // Dispara um evento para notificar outras instâncias na mesma aba de forma assíncrona
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(`guru_cloud_storage_update_${dataKey}`, {
          detail: { value: next, senderId: instanceId }
        }));
      }, 0);

      // Debounced cloud save
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const email = getUserEmail();
        if (!email) return;
        fetch(resolveApiUrl('/api/user-data'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, key: dataKey, value: next })
        }).catch(err => console.warn(`[CloudStorage] Save failed for key "${dataKey}":`, err));
      }, 800);

      return next;
    });
  }, [dataKey, localKey, instanceId]);

  // Escuta atualizações de outras instâncias (mesma aba ou abas diferentes)
  useEffect(() => {
    const handleCustomEvent = (e) => {
      if (e.detail && e.detail.senderId !== instanceId) {
        setValue(e.detail.value);
      }
    };

    const handleStorageEvent = (e) => {
      if (e.key === localKey) {
        try {
          setValue(e.newValue ? JSON.parse(e.newValue) : defaultValue);
        } catch {}
      }
    };

    window.addEventListener(`guru_cloud_storage_update_${dataKey}`, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(`guru_cloud_storage_update_${dataKey}`, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [dataKey, localKey, defaultValue, instanceId]);

  return [value, setCloudValue, isLoaded];
}

/**
 * Preloads ALL cloud data for a user on login.
 * Call this once from AuthContext after login to warm all caches.
 */
export async function preloadUserCloudData(email) {
  if (!email) return;
  try {
    const res = await fetch(resolveApiUrl(`/api/user-data?email=${encodeURIComponent(email)}`));
    if (!res.ok) return;
    const data = await res.json();
    // Cache each key locally
    Object.entries(data).forEach(([key, val]) => {
      try {
        localStorage.setItem(`guru_cloud_${key}`, JSON.stringify(val));
        loadedKeys.add(key);
      } catch {}
    });
  } catch (err) {
    console.warn('[CloudStorage] Preload failed:', err);
  }
}
