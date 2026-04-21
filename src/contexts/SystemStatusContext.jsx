import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { resolveApiUrl } from '../utils/apiUtils';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

const SystemStatusContext = createContext();

// Helper: get email from localStorage as fallback during initial boot
const getEmailFromStorage = () => {
  try {
    const stored = localStorage.getItem('guru_user');
    if (stored) return (JSON.parse(stored).email || '').toLowerCase();
  } catch {}
  return '';
};

export const SystemStatusProvider = ({ children }) => {
  // Use real authenticated user email — works on any machine/browser
  const { user } = useAuth();
  const userEmail = user?.email || getEmailFromStorage();
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState({
    rendering: 'checking...',
    ffmpeg: 'checking...',
    ffprobe: 'checking...',
    gemini: 'checking...',
    openai: 'checking...',
    grok: 'checking...',
    anthropic: 'checking...',
    deepseek: 'checking...',
    elevenlabs: 'checking...',
    leonardo: 'checking...',
    smtp: 'checking...',
    youtube: 'checking...',
    autoFlow: 'offline',
    details: { ffmpeg: '', error: '', youtube_error: '' }
  });
  const [lastLatency, setLastLatency] = useState(0);
  const [isHealthy, setIsHealthy] = useState(true);
  const [keyStatuses, setKeyStatuses] = useState({ gemini: [], openai: [], grok: [] });
  const DEFAULTS = {
    gemini_key: '',
    grok_key: '',
    gpt_key: '',
    gemini_prompts_key: '',
    anthropic_key: '',
    deepseek_key: '',
    elevenlabs_key: '',
    leonardo_key: '',
    youtube_key: '',
    google_client_id: '',
    smtp_user: '',
    smtp_password: '',
    active_ai: 'Gemini',
    active_model: 'gemini-1.5-flash-8b'
  };

  const [configs, setConfigs] = useState(() => {
    // Restore from localStorage cache for instant display on page refresh
    try {
      const cached = localStorage.getItem('guru_configs_cache');
      if (cached) return { ...DEFAULTS, ...JSON.parse(cached) };
    } catch {}
    return DEFAULTS;
  });

  const [activeIndices, setActiveIndices] = useState({ gemini: 0, openai: 0, grok: 0 });
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  // Ref so callbacks always have latest configs without stale closure
  const configsRef = useRef(configs);
  useEffect(() => { configsRef.current = configs; }, [configs]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);
  }, []);

  // ── STEP 1: Ping the server health endpoint ────────────────────────
  const checkServer = useCallback(async () => {
    try {
      const res = await fetch(resolveApiUrl('/api/check'));
      if (res.ok) {
        const data = await res.json();
        setStatus(prev => ({
          ...prev,
          rendering: 'online',
          ffmpeg: data.ffmpeg !== 'Not found' ? 'online' : 'offline',
          ffprobe: data.ffprobe !== 'Not found' ? 'online' : 'offline',
          smtp: data.smtp ? 'online' : 'offline',
          details: { ...prev.details, ffmpeg: data.ffmpeg, error: data.error || '' }
        }));
        setIsHealthy(true);
        return true;
      }
    } catch (e) {
      console.warn('[SystemStatus] Server check failed:', e.message);
    }
    setStatus(prev => ({ ...prev, rendering: 'offline' }));
    setIsHealthy(false);
    return false;
  }, []);

  // ── STEP 2: Load user configs from Supabase ────────────────────────
  // Always uses the live authenticated email — works across machines/browsers
  const loadConfigs = useCallback(async (emailOverride) => {
    const email = emailOverride || userEmail;
    if (!email) {
      setStatus(prev => ({
        ...prev,
        gemini: 'offline', openai: 'offline', grok: 'offline',
        anthropic: 'offline', deepseek: 'offline'
      }));
      return null;
    }
    try {
      const res = await fetch(resolveApiUrl(`/api/config?email=${encodeURIComponent(email)}`));
      if (res.ok) {
        const configData = await res.json();
        setConfigs(configData);
        configsRef.current = configData;
        setActiveIndices({
          gemini: configData.gemini_active_idx || 0,
          openai: configData.gpt_active_idx || 0,
          grok: configData.grok_active_idx || 0
        });
        // Cache locally for instant restore on same-machine refresh
        try { localStorage.setItem('guru_configs_cache', JSON.stringify(configData)); } catch {}
        return configData;
      }
    } catch (err) {
      console.error('[SystemStatus] Error loading config:', err);
    }
    return null;
  }, [userEmail]);

  // ── STEP 3: Ping API keys for a provider ──────────────────────────
  const checkBulkKeys = useCallback(async (provider, keys) => {
    const validKeys = (keys || []).filter(k => k && k.trim() !== '');
    if (validKeys.length === 0) {
      setStatus(prev => ({ ...prev, [provider]: 'offline' }));
      return [];
    }
    try {
      const start = Date.now();
      const res = await fetch(resolveApiUrl('/api/check'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, keys: validKeys })
      });
      const elapsed = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        const statuses = data.statuses || [];
        setKeyStatuses(prev => ({ ...prev, [provider]: statuses }));
        setLastLatency(Math.max(15, elapsed));
        const best = statuses.find(s => s === 'online') || statuses.find(s => s === 'quota') || 'offline';
        setStatus(prev => ({ ...prev, [provider]: best }));
        if (best === 'online') setIsHealthy(true);
        return statuses;
      }
    } catch (err) {
      console.error(`[SystemStatus] Bulk key check failed for ${provider}:`, err);
    }
    return [];
  }, []);

  // ── STEP 4: Check all AI keys using loaded config ─────────────────
  const checkAllApiKeys = useCallback(async (cfg) => {
    const c = cfg || configsRef.current;
    const geminiKeys = (c.gemini_key || '').split(',').map(k => k.trim()).filter(Boolean);
    const gptKeys    = (c.gpt_key    || '').split(',').map(k => k.trim()).filter(Boolean);
    const grokKeys   = (c.grok_key   || '').split(',').map(k => k.trim()).filter(Boolean);

    if (geminiKeys.length === 0) setStatus(prev => ({ ...prev, gemini: 'offline' }));
    if (gptKeys.length === 0)    setStatus(prev => ({ ...prev, openai: 'offline' }));
    if (grokKeys.length === 0)   setStatus(prev => ({ ...prev, grok: 'offline' }));

    const checks = [];
    if (geminiKeys.length > 0) checks.push(checkBulkKeys('gemini', geminiKeys));
    if (gptKeys.length > 0)    checks.push(checkBulkKeys('openai', gptKeys));
    if (grokKeys.length > 0)   checks.push(checkBulkKeys('grok', grokKeys));

    await Promise.allSettled(checks);
  }, [checkBulkKeys]);

  // ── MASTER: server → configs → keys (sequential, correct order) ───
  const checkConnectivity = useCallback(async () => {
    await checkServer();
    const freshConfigs = await loadConfigs();
    if (freshConfigs) {
      await checkAllApiKeys(freshConfigs);
    }
    setIsInitialized(true);
  }, [checkServer, loadConfigs, checkAllApiKeys]);

  // ── updateConfig: save to Supabase using real auth email ─────────
  const updateConfig = useCallback(async (newConfig) => {
    try {
      const email = userEmail;
      if (!email) {
        console.warn('updateConfig: usuário não autenticado.');
        return false;
      }
      const res = await fetch(resolveApiUrl('/api/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...newConfig })
      });
      if (res.ok) {
        const merged = { ...configsRef.current, ...newConfig };
        setConfigs(merged);
        configsRef.current = merged;
        // Keep local cache in sync
        try { localStorage.setItem('guru_configs_cache', JSON.stringify(merged)); } catch {}
        window.dispatchEvent(new Event('guru_config_updated'));
        await checkAllApiKeys(merged);
        return true;
      }
    } catch (err) {
      console.error('Erro ao salvar configuração:', err);
    }
    return false;
  }, [userEmail, checkAllApiKeys]);

  const rotateKey = useCallback((provider) => {
    setActiveIndices(prev => {
      const keyProp = provider === 'openai' ? 'gpt_key' : `${provider}_key`;
      const idxProp = provider === 'openai' ? 'gpt_active_idx' : `${provider}_active_idx`;
      const keys = (configsRef.current[keyProp] || '').split(',').filter(k => k.trim());
      const nextIndex = keys.length > 0 ? (prev[provider] + 1) % keys.length : 0;
      updateConfig({ [idxProp]: nextIndex });
      return { ...prev, [provider]: nextIndex };
    });
  }, [updateConfig]);

  const setManualActiveIndex = useCallback((provider, index) => {
    setActiveIndices(prev => ({ ...prev, [provider]: index }));
    const idxProp = provider === 'openai' ? 'gpt_active_idx' : `${provider}_active_idx`;
    updateConfig({ [idxProp]: index });
    window.dispatchEvent(new CustomEvent('guru_manual_key_select', { detail: { provider, index } }));
  }, [updateConfig]);

  // ── Key rotation event listeners ───────────────────────────────────
  useEffect(() => {
    const handleRotation = (e) => {
      const { provider, index } = e.detail;
      setActiveIndices(prev => ({ ...prev, [provider]: index }));
      showToast(`🔄 Rodando chave ${provider}: #${index + 1}`, 'success');
    };
    const handleFallback = (e) => {
      showToast(`⚡ ${e.detail.message}`, 'warning');
    };
    window.addEventListener('guru_key_rotated', handleRotation);
    window.addEventListener('guru_fallback_triggered', handleFallback);
    return () => {
      window.removeEventListener('guru_key_rotated', handleRotation);
      window.removeEventListener('guru_fallback_triggered', handleFallback);
    };
  }, [showToast]);

  // ── Autonomous background key rotation every 25s ───────────────────
  useEffect(() => {
    if (!isInitialized) return;
    const checkAndRotate = async () => {
      const c = configsRef.current;
      const providers = [
        { name: 'gemini', keys: (c.gemini_key || '').split(',').map(k => k.trim()).filter(Boolean) },
        { name: 'openai', keys: (c.gpt_key    || '').split(',').map(k => k.trim()).filter(Boolean) },
        { name: 'grok',   keys: (c.grok_key   || '').split(',').map(k => k.trim()).filter(Boolean) }
      ];
      for (const { name, keys } of providers) {
        if (keys.length === 0) continue;
        const statuses = await checkBulkKeys(name, keys);
        const currentIdx = activeIndices[name] || 0;
        if (statuses[currentIdx] && statuses[currentIdx] !== 'online') {
          const nextValid = statuses.findIndex(s => s === 'online');
          if (nextValid !== -1 && nextValid !== currentIdx) {
            setManualActiveIndex(name, nextValid);
            console.log(`[Auto-Rotate] ${name} chave #${currentIdx} → #${nextValid}`);
          }
        }
      }
    };
    const interval = setInterval(checkAndRotate, 25000);
    const timeout  = setTimeout(checkAndRotate, 5000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [isInitialized, checkBulkKeys, setManualActiveIndex, activeIndices]);

  // ── Reload configs whenever user changes (login / logout / new machine) ──
  const prevEmailRef = useRef('');
  useEffect(() => {
    if (userEmail && userEmail !== prevEmailRef.current) {
      // New user logged in — fetch their configs from Supabase immediately
      prevEmailRef.current = userEmail;
      checkConnectivity();
    } else if (!userEmail && prevEmailRef.current) {
      // User logged out — clear configs so next user starts fresh
      prevEmailRef.current = '';
      setConfigs(DEFAULTS);
      configsRef.current = DEFAULTS;
      try { localStorage.removeItem('guru_configs_cache'); } catch {}
    }
  }, [userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial boot (ping server + start 30s health interval) ────────
  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SystemStatusContext.Provider value={{
      status, configs, checkConnectivity, updateConfig,
      isInitialized, activeIndices, rotateKey, setManualActiveIndex,
      toast, showToast, keyStatuses, checkBulkKeys, lastLatency, isHealthy
    }}>
      {children}
    </SystemStatusContext.Provider>
  );
};

export const useSystemStatus = () => useContext(SystemStatusContext);
