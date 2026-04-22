import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { resolveApiUrl } from '../utils/apiUtils';
import { useAuth } from './AuthContext';

const SystemStatusContext = createContext();

// Fallback: read email from localStorage during initial hydration
const getEmailFromStorage = () => {
  try {
    const stored = localStorage.getItem('guru_user');
    if (stored) return (JSON.parse(stored).email || '').toLowerCase();
  } catch {}
  return '';
};

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
  active_model: 'gemini-2.5-flash',
};

export const SystemStatusProvider = ({ children }) => {
  const { user } = useAuth();

  // ── emailRef: always has the latest email, safe across async closures ──
  const emailRef = useRef(user?.email || getEmailFromStorage());
  useEffect(() => {
    emailRef.current = user?.email || getEmailFromStorage();
  }, [user]);

  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState({
    rendering: 'checking...',
    gemini: 'checking...',
    openai: 'checking...',
    grok: 'checking...',
    // presence-only (no API ping needed):
    anthropic: 'unconfigured',
    deepseek: 'unconfigured',
    elevenlabs: 'unconfigured',
    leonardo: 'unconfigured',
    youtube: 'unconfigured',
    prompts_key: 'unconfigured',
    smtp: 'unconfigured',
    details: { error: '' },
  });
  const [lastLatency, setLastLatency] = useState(0);
  const [isHealthy, setIsHealthy] = useState(true);
  const [keyStatuses, setKeyStatuses] = useState({ gemini: [], openai: [], grok: [] });

  const [configs, setConfigs] = useState(() => {
    try {
      const cached = localStorage.getItem('guru_configs_cache');
      if (cached) return { ...DEFAULTS, ...JSON.parse(cached) };
    } catch {}
    return DEFAULTS;
  });

  const [activeIndices, setActiveIndices] = useState({ gemini: 0, openai: 0, grok: 0 });
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  // configsRef: always latest config without stale closures
  const configsRef = useRef(configs);
  useEffect(() => { configsRef.current = configs; }, [configs]);

  // ── Update presence-based statuses whenever configs change ────────
  useEffect(() => {
    const c = configs;
    setStatus(prev => ({
      ...prev,
      anthropic:   c.anthropic_key?.trim()   ? 'configured' : 'unconfigured',
      deepseek:    c.deepseek_key?.trim()     ? 'configured' : 'unconfigured',
      elevenlabs:  c.elevenlabs_key?.trim()   ? 'configured' : 'unconfigured',
      leonardo:    c.leonardo_key?.trim()     ? 'configured' : 'unconfigured',
      youtube:     c.youtube_key?.trim()      ? 'configured' : 'unconfigured',
      smtp:        c.smtp_user?.trim()        ? 'configured' : 'unconfigured',
    }));
  }, [configs]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);
  }, []);

  // ── STEP 1: Ping server health ─────────────────────────────────────
  const checkServer = useCallback(async () => {
    try {
      const res = await fetch(resolveApiUrl('/api/check'));
      if (res.ok) {
        const data = await res.json();
        setStatus(prev => ({
          ...prev,
          rendering: 'online',
          details: { error: data.error || '' },
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

  // ── STEP 2: Load configs from Supabase by email ────────────────────
  const loadConfigs = useCallback(async () => {
    const email = emailRef.current;
    if (!email) {
      setStatus(prev => ({
        ...prev,
        gemini: 'offline', openai: 'offline', grok: 'offline',
      }));
      return null;
    }
    try {
      const res = await fetch(resolveApiUrl(`/api/config?email=${encodeURIComponent(email)}`));
      if (res.ok) {
        const configData = await res.json();
        const merged = { ...DEFAULTS, ...configData };
        setConfigs(merged);
        configsRef.current = merged;
        setActiveIndices({
          gemini: merged.gemini_active_idx || 0,
          openai: merged.gpt_active_idx || 0,
          grok:   merged.grok_active_idx || 0,
        });
        try { localStorage.setItem('guru_configs_cache', JSON.stringify(merged)); } catch {}
        return merged;
      }
    } catch (err) {
      console.error('[SystemStatus] Error loading config:', err);
    }
    return null;
  }, []); // no deps — uses emailRef which is always current
  
  // ── Sync configs to localStorage for aiUtils motor ───────────────
  useEffect(() => {
    if (configs.gemini_key) localStorage.setItem('guru_gemini_key', configs.gemini_key);
    if (configs.gpt_key) localStorage.setItem('guru_gpt_key', configs.gpt_key);
    if (configs.grok_key) localStorage.setItem('guru_grok_key', configs.grok_key);
    if (configs.gemini_prompts_key) localStorage.setItem('guru_gemini_prompts_key', configs.gemini_prompts_key);
    if (configs.youtube_key) localStorage.setItem('guru_youtube_key', configs.youtube_key);
    if (configs.active_ai) localStorage.setItem('guru_active_ai', configs.active_ai);
    if (configs.gemini_active_idx !== undefined) localStorage.setItem('guru_gemini_active_idx', configs.gemini_active_idx.toString());
    // Always persist full configs in cache so they survive refreshes and browser switches
    try { localStorage.setItem('guru_configs_cache', JSON.stringify({ ...configs })); } catch {}
  }, [configs]);

  // ── STEP 3: Ping API keys for Gemini / OpenAI / Grok ──────────────
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
        body: JSON.stringify({ provider, keys: validKeys }),
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

  // ── STEP 4: Check Gemini / OpenAI / Grok connectivity ────────────
  const checkAllApiKeys = useCallback(async (cfg) => {
    const c = cfg || configsRef.current;
    const geminiKeys = (c.gemini_key || '').split(',').map(k => k.trim()).filter(Boolean);
    const gptKeys    = (c.gpt_key || '').split(',').map(k => k.trim()).filter(Boolean);
    const grokKeys   = (c.grok_key || '').split(',').map(k => k.trim()).filter(Boolean);
    const promptsKey = (c.gemini_prompts_key || '').trim();
    const youtubeKey = (c.youtube_key || '').trim();

    if (geminiKeys.length === 0) setStatus(prev => ({ ...prev, gemini: 'offline' }));
    if (gptKeys.length    === 0) setStatus(prev => ({ ...prev, openai: 'offline' }));
    if (grokKeys.length   === 0) setStatus(prev => ({ ...prev, grok:   'offline' }));
    if (!promptsKey)           setStatus(prev => ({ ...prev, prompts_key: 'unconfigured' }));
    if (!youtubeKey)           setStatus(prev => ({ ...prev, youtube:     'unconfigured' }));

    const checks = [];
    if (geminiKeys.length > 0) checks.push(checkBulkKeys('gemini', geminiKeys));
    if (gptKeys.length    > 0) checks.push(checkBulkKeys('openai', gptKeys));
    if (grokKeys.length   > 0) checks.push(checkBulkKeys('grok',   grokKeys));
    
    // Check exclusive prompts key
    if (promptsKey) {
      checks.push((async () => {
        try {
          const res = await fetch(resolveApiUrl('/api/check'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'gemini', keys: [promptsKey] }),
          });
          if (res.ok) {
            const data = await res.json();
            const best = data.statuses?.[0] || 'offline';
            const reason = data.debug?.[0] || '';
            setStatus(prev => ({ 
              ...prev, 
              prompts_key: best,
              details: { ...prev.details, prompts_error: reason }
            }));
          }
        } catch (e) {
          setStatus(prev => ({ ...prev, prompts_key: 'offline' }));
        }
      })());
    }

    // Check YouTube key
    if (youtubeKey) {
      checks.push((async () => {
        try {
          const res = await fetch(resolveApiUrl('/api/check'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'youtube', keys: [youtubeKey] }),
          });
          if (res.ok) {
            const data = await res.json();
            const best = data.statuses?.[0] || 'offline';
            const reason = data.debug?.[0] || '';
            setStatus(prev => ({ 
              ...prev, 
              youtube: best,
              details: { ...prev.details, youtube_error: reason }
            }));
          }
        } catch (e) {
          setStatus(prev => ({ ...prev, youtube: 'offline' }));
        }
      })());
    }

    await Promise.allSettled(checks);
  }, [checkBulkKeys]);

  // ── MASTER: server → configs → keys ───────────────────────────────
  const checkConnectivity = useCallback(async () => {
    try {
      await checkServer();
      const freshConfigs = await loadConfigs();
      if (freshConfigs) await checkAllApiKeys(freshConfigs);
    } catch (e) {
      console.error('[SystemStatus] Connectivity check failed:', e);
    } finally {
      setIsInitialized(true);
    }
  }, [checkServer, loadConfigs, checkAllApiKeys]);

  // ── updateConfig: save to Supabase — uses emailRef (always current) ─
  const updateConfig = useCallback(async (newConfig) => {
    // Triple-fallback to always get the email, regardless of render timing:
    const email = emailRef.current || user?.email || getEmailFromStorage();
    if (!email) {
      console.warn('[updateConfig] Nenhum email autenticado — config não salva.');
      return false;
    }
    // Keep ref in sync if it was empty
    if (!emailRef.current) emailRef.current = email;
    try {
      const res = await fetch(resolveApiUrl('/api/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...newConfig }),
      });
      if (res.ok) {
        const merged = { ...configsRef.current, ...newConfig };
        setConfigs(merged);
        configsRef.current = merged;
        try { localStorage.setItem('guru_configs_cache', JSON.stringify(merged)); } catch {}
        window.dispatchEvent(new Event('guru_config_updated'));
        await checkAllApiKeys(merged);
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('[updateConfig] Erro HTTP:', res.status, errData);
      }
    } catch (err) {
      console.error('[updateConfig] Erro ao salvar:', err);
    }
    return false;
  }, [user, checkAllApiKeys]); // user added so triple-fallback is reactive

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

  // ── Key rotation listeners ─────────────────────────────────────────
  useEffect(() => {
    const handleRotation = (e) => {
      const { provider, index } = e.detail;
      setActiveIndices(prev => ({ ...prev, [provider]: index }));
      showToast(`🔄 Rodando chave ${provider}: #${index + 1}`, 'success');
    };
    const handleFallback = (e) => showToast(`⚡ ${e.detail.message}`, 'warning');
    window.addEventListener('guru_key_rotated', handleRotation);
    window.addEventListener('guru_fallback_triggered', handleFallback);
    return () => {
      window.removeEventListener('guru_key_rotated', handleRotation);
      window.removeEventListener('guru_fallback_triggered', handleFallback);
    };
  }, [showToast]);

  // ── Auto background rotation every 25s ────────────────────────────
  useEffect(() => {
    if (!isInitialized) return;
    const checkAndRotate = async () => {
      const c = configsRef.current;
      const providers = [
        { name: 'gemini', keys: (c.gemini_key || '').split(',').map(k => k.trim()).filter(Boolean) },
        { name: 'openai', keys: (c.gpt_key    || '').split(',').map(k => k.trim()).filter(Boolean) },
        { name: 'grok',   keys: (c.grok_key   || '').split(',').map(k => k.trim()).filter(Boolean) },
      ];
      for (const { name, keys } of providers) {
        if (keys.length === 0) continue;
        const statuses = await checkBulkKeys(name, keys);
        const currentIdx = activeIndices[name] || 0;
        if (statuses[currentIdx] && statuses[currentIdx] !== 'online') {
          const nextValid = statuses.findIndex(s => s === 'online');
          if (nextValid !== -1 && nextValid !== currentIdx) {
            setManualActiveIndex(name, nextValid);
          }
        }
      }
    };
    const interval = setInterval(checkAndRotate, 25000);
    const timeout  = setTimeout(checkAndRotate, 5000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [isInitialized, checkBulkKeys, setManualActiveIndex, activeIndices]);

  // ── Reload configs when user logs in / switches account ───────────
  const prevEmailRef = useRef('');
  useEffect(() => {
    const email = user?.email || '';
    if (email && email !== prevEmailRef.current) {
      prevEmailRef.current = email;
      emailRef.current = email;
      checkConnectivity();
    } else if (!email && prevEmailRef.current) {
      prevEmailRef.current = '';
      emailRef.current = '';
      setConfigs(DEFAULTS);
      configsRef.current = DEFAULTS;
      try { localStorage.removeItem('guru_configs_cache'); } catch {}
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial boot ───────────────────────────────────────────────────
  useEffect(() => {
    // Fail-Safe: Destrava a UI em no máximo 6 segundos, ignorando lentidão de rede
    const failSafe = setTimeout(() => {
      setIsInitialized(prev => {
        if (!prev) console.warn('[SystemStatus] Fail-safe ativado: forçando inicialização após timeout.');
        return true;
      });
    }, 6000);

    const boot = async () => {
      try {
        // On first load: if user already in localStorage, load their configs
        if (emailRef.current) {
          await checkConnectivity();
        } else {
          await checkServer();
          setIsInitialized(true);
        }
      } finally {
        clearTimeout(failSafe);
      }
    };
    boot();
    const interval = setInterval(checkServer, 30000);
    return () => {
      clearInterval(interval);
      clearTimeout(failSafe);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SystemStatusContext.Provider value={{
      status, configs, checkConnectivity, updateConfig,
      isInitialized, activeIndices, rotateKey, setManualActiveIndex,
      toast, showToast, keyStatuses, checkBulkKeys, lastLatency, isHealthy,
    }}>
      {children}
    </SystemStatusContext.Provider>
  );
};

export const useSystemStatus = () => useContext(SystemStatusContext);
