import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { resolveApiUrl } from '../utils/apiUtils';

const SystemStatusContext = createContext();

export const SystemStatusProvider = ({ children }) => {
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
  const [keyStatuses, setKeyStatuses] = useState({
    gemini: [],
    openai: [],
    grok: []
  });
  const [configs, setConfigs] = useState({
    gemini_key: '',
    grok_key: '',
    gpt_key: '',
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
  });

  const [activeIndices, setActiveIndices] = useState({
    gemini: 0,
    openai: 0,
    grok: 0
  });
 
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
 
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);
  }, []);

  const checkConnectivity = useCallback(async (options = {}) => {
    const { force = false } = options;
    let attempts = 0;
    const maxAttempts = force ? 3 : 10;
    let isConnected = false;
    const url = resolveApiUrl(`/api/check${force ? '?force=true' : ''}`);

    // 1. Check Backend Connectivity & Details
    while (attempts < maxAttempts && !isConnected) {
        attempts++;
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setStatus(prev => ({
                    ...prev,
                    rendering: 'online',
                    ffmpeg: data.ffmpeg !== 'Not found' ? 'online' : 'offline',
                    ffprobe: data.ffprobe !== 'Not found' ? 'online' : 'offline',
                    gemini: data.ai?.gemini || 'offline',
                    openai: data.ai?.openai || 'offline',
                    grok: data.ai?.grok || 'offline',
                    anthropic: data.ai?.anthropic || 'offline',
                    deepseek: data.ai?.deepseek || 'offline',
                    elevenlabs: data.ai?.elevenlabs || 'offline',
                    leonardo: data.ai?.leonardo || 'offline',
                    youtube: data.ai?.youtube === 'quota' ? 'quota' : (data.ai?.youtube === true ? 'online' : 'offline'),
                    smtp: data.smtp ? 'online' : 'offline',
                    details: { 
                      ...prev.details, 
                      ffmpeg: data.ffmpeg, 
                      error: data.error || '',
                      youtube_error: data.ai?.youtube_error
                    }
                }));
                isConnected = true;
            }
        } catch (err) {
            console.warn(`Tentativa de conexão ${attempts}/${maxAttempts} falhou. Aguardando...`);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    if (!isConnected) {
        setStatus(prev => ({ ...prev, rendering: 'offline', ffmpeg: 'offline', details: { ...prev.details, error: 'Servidor desafinado ou demorando muito' } }));
    }

    // 2. Load Configs from Backend
    try {
      const res = await fetch(resolveApiUrl('/api/config'));
      if (res.ok) {
        const configData = await res.json();
        setConfigs(configData);
        // Sync active indices from config
        setActiveIndices({
          gemini: configData.gemini_active_idx || 0,
          openai: configData.gpt_active_idx || 0,
          grok: configData.grok_active_idx || 0
        });
        // Sync to localStorage
        Object.entries(configData).forEach(([k, v]) => {
           if (v !== undefined && v !== null) localStorage.setItem(`guru_${k}`, v);
        });
      }
    } catch (err) {
        console.error("Error loading config from backend:", err);
    }

    setIsInitialized(true);
  }, []);

  const updateConfig = useCallback(async (newConfig) => {
    try {
      const res = await fetch(resolveApiUrl('/api/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        setConfigs(prev => ({ ...prev, ...newConfig }));
        Object.entries(newConfig).forEach(([key, val]) => {
           localStorage.setItem(`guru_${key}`, val);
        });
        // Notify aiUtils to bust the model cache
        window.dispatchEvent(new Event('guru_config_updated'));
        await checkConnectivity({ force: true });
        // Specific feedback for Gemini if it just went online
        setStatus(prev => {
          if (prev.gemini === 'online') {
            showToast("Gemini Conectado e Ativo!", "success");
          }
          return prev;
        });
        return true;
      }
    } catch (err) {
      console.error("Erro ao salvar configuração:", err);
    }
    return false;
  }, [checkConnectivity, showToast]);

  const rotateKey = useCallback((provider) => {
    setActiveIndices(prev => {
        const keyProp = provider === 'openai' ? 'gpt_key' : `${provider}_key`;
        const idxProp = provider === 'openai' ? 'gpt_active_idx' : `${provider}_active_idx`;
        const keys = (configs[keyProp] || '').split(',').filter(k => k.trim());
        const nextIndex = keys.length > 0 ? (prev[provider] + 1) % keys.length : 0;
        
        // Update both local and remote if it's a persistent selection change
        updateConfig({ [idxProp]: nextIndex });
        return { ...prev, [provider]: nextIndex };
    });
  }, [configs, updateConfig]);

  const setManualActiveIndex = useCallback((provider, index) => {
    setActiveIndices(prev => ({ ...prev, [provider]: index }));
    
    // Persist to backend
    const idxProp = provider === 'openai' ? 'gpt_active_idx' : `${provider}_active_idx`;
    updateConfig({ [idxProp]: index });

    // Notify the AI engine
    window.dispatchEvent(new CustomEvent('guru_manual_key_select', { detail: { provider, index } }));
  }, [updateConfig]);
  
  const checkBulkKeys = useCallback(async (provider, keys) => {
    try {
      const res = await fetch(resolveApiUrl('/api/check/bulk'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, keys })
      });
      if (res.ok) {
        const data = await res.json();
        setKeyStatuses(prev => ({
          ...prev,
          [provider]: data.statuses
        }));
        return data.statuses;
      }
    } catch (err) {
      console.error(`Error checking bulk keys for ${provider}:`, err);
    }
    return [];
  }, []);

  useEffect(() => {
    const handleRotation = (e) => {
      const { provider, index } = e.detail;
      setActiveIndices(prev => ({ ...prev, [provider]: index }));
      showToast(`🔄 Rodando chave ${provider}: #${index + 1}`, 'success');
    };
 
    const handleFallback = (e) => {
      const { message } = e.detail;
      showToast(`⚡ ${message}`, 'warning');
    };
 
    window.addEventListener('guru_key_rotated', handleRotation);
    window.addEventListener('guru_fallback_triggered', handleFallback);
    return () => {
      window.removeEventListener('guru_key_rotated', handleRotation);
      window.removeEventListener('guru_fallback_triggered', handleFallback);
    };
  }, [showToast]);

  // Implementação da Verificação Contínua e Rotação Autônoma a cada 25s
  useEffect(() => {
    if (!isInitialized) return;

    const checkAndRotateBackground = async () => {
      // Background check for Gemini
      const geminiKeys = (configs.gemini_key || '').split(',').map(k => k.trim()).filter(Boolean);
      if (geminiKeys.length > 0) {
         const statuses = await checkBulkKeys('gemini', geminiKeys);
         const currentIdx = activeIndices.gemini || 0;
         if (statuses[currentIdx] && !statuses[currentIdx].startsWith('online')) {
             const nextValidIdx = statuses.findIndex(s => s.startsWith('online'));
             if (nextValidIdx !== -1 && nextValidIdx !== currentIdx) {
                 setManualActiveIndex('gemini', nextValidIdx);
                 console.log(`[Diagnóstico de Fundo] Chave Gemini ${currentIdx} esgotada. Rotacionando para chave ${nextValidIdx}.`);
             }
         }
      }

      // Background check for OpenAI
      const gptKeys = (configs.gpt_key || '').split(',').map(k => k.trim()).filter(Boolean);
      if (gptKeys.length > 0) {
         const statuses = await checkBulkKeys('openai', gptKeys);
         const currentIdx = activeIndices.openai || 0;
         if (statuses[currentIdx] && !statuses[currentIdx].startsWith('online')) {
             const nextValidIdx = statuses.findIndex(s => s.startsWith('online'));
             if (nextValidIdx !== -1 && nextValidIdx !== currentIdx) {
                 setManualActiveIndex('openai', nextValidIdx);
             }
         }
      }

      // Background check for Grok
      const grokKeys = (configs.grok_key || '').split(',').map(k => k.trim()).filter(Boolean);
      if (grokKeys.length > 0) {
         const statuses = await checkBulkKeys('grok', grokKeys);
         const currentIdx = activeIndices.grok || 0;
         if (statuses[currentIdx] && !statuses[currentIdx].startsWith('online')) {
             const nextValidIdx = statuses.findIndex(s => s.startsWith('online'));
             if (nextValidIdx !== -1 && nextValidIdx !== currentIdx) {
                 setManualActiveIndex('grok', nextValidIdx);
             }
         }
      }
    };

    const autonomousInterval = setInterval(checkAndRotateBackground, 25000); // 25 seconds
    // Initial run slightly delayed
    const timeout = setTimeout(checkAndRotateBackground, 5000);

    return () => {
      clearInterval(autonomousInterval);
      clearTimeout(timeout);
    };
  }, [isInitialized, configs, activeIndices, checkBulkKeys, setManualActiveIndex]);

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(async () => {
        try {
            const res = await fetch(resolveApiUrl('/api/check'));
            if (res.ok) {
                const data = await res.json();
                setStatus(prev => ({ ...prev, rendering: 'online', ffmpeg: data.ffmpeg !== 'Not found' ? 'online' : 'offline' }));
            }
        } catch (e) {}
    }, 30000);
    return () => clearInterval(interval);
  }, [checkConnectivity]);

  return (
    <SystemStatusContext.Provider value={{ status, configs, checkConnectivity, updateConfig, isInitialized, activeIndices, rotateKey, setManualActiveIndex, toast, showToast, keyStatuses, checkBulkKeys }}>
      {children}
    </SystemStatusContext.Provider>
  );
};

export const useSystemStatus = () => useContext(SystemStatusContext);
