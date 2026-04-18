import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { resolveApiUrl } from '../utils/apiUtils';

const SystemStatusContext = createContext();

export const SystemStatusProvider = ({ children }) => {
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');

  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState({
    rendering: isElectron ? 'checking...' : 'hidden',
    ffmpeg: isElectron ? 'checking...' : 'hidden',
    ffprobe: isElectron ? 'checking...' : 'hidden',
    gemini: 'checking...',
    openai: 'checking...',
    grok: 'checking...',
    anthropic: 'checking...',
    deepseek: 'checking...',
    elevenlabs: 'checking...',
    leonardo: 'checking...',
    smtp: isElectron ? 'checking...' : 'hidden',
    youtube: 'checking...',
    autoFlow: 'offline',
    details: { ffmpeg: '', error: '', youtube_error: '' }
  });
  const [configs, setConfigs] = useState({
    gemini_key: localStorage.getItem('guru_gemini_key') || '',
    grok_key: localStorage.getItem('guru_grok_key') || '',
    gpt_key: localStorage.getItem('guru_gpt_key') || '',
    anthropic_key: localStorage.getItem('guru_anthropic_key') || '',
    deepseek_key: localStorage.getItem('guru_deepseek_key') || '',
    elevenlabs_key: localStorage.getItem('guru_elevenlabs_key') || '',
    leonardo_key: localStorage.getItem('guru_leonardo_key') || '',
    youtube_key: localStorage.getItem('guru_youtube_key') || '',
    google_client_id: localStorage.getItem('guru_google_client_id') || '',
    smtp_user: localStorage.getItem('guru_smtp_user') || '',
    smtp_password: localStorage.getItem('guru_smtp_password') || '',
    active_ai: localStorage.getItem('guru_active_ai') || 'Gemini',
    gemini_model: localStorage.getItem('guru_gemini_model') || 'Gemini 3.1 Flash Lite (500 req/dia — MAIS ECONÔMICO)'
  });

  const checkConnectivity = useCallback(async () => {
    let attempts = 0;
    const maxAttempts = 10;
    let isConnected = false;

    if (isElectron) {
      while (attempts < maxAttempts && !isConnected) {
          attempts++;
          try {
              const res = await fetch(resolveApiUrl('/api/check'));
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
    } else {
       // Web Mode: No engine connectivity needed
       isConnected = true;
    }

    // 2. Load Configs
    let currentConfigs = null;
    
    if (isElectron) {
      try {
        const res = await fetch(resolveApiUrl('/api/config'));
        if (res.ok) {
          const configData = await res.json();
          setConfigs(configData);
          currentConfigs = configData;
          // Sync to localStorage
          Object.entries(configData).forEach(([k, v]) => {
            if (v) localStorage.setItem(`guru_${k}`, v);
          });
        }
      } catch (err) {
         // Fallback to localStorage if backend is down
         currentConfigs = configs;
      }
    } else {
       // Web Mode: Always use localStorage
       currentConfigs = configs;
    }

    // 3. Check AI APIs Independently
    if (currentConfigs) {
        const checkApi = async (name, key, url, headers = {}) => {
            if (!key || key.includes('YOUR_') || key === "" || key.length < 5) return 'offline';
            try {
                const res = await fetch(resolveApiUrl(url), { headers });
                if (res.ok) return 'online';
                if (res.status === 429) return 'quota';
                return 'offline';
            } catch (e) {
                return 'offline';
            }
        };

        const [geminiStatus, openaiStatus, grokStatus] = await Promise.all([
            checkApi('Gemini', currentConfigs.gemini_key, `/api/gemini/v1beta/models?key=${currentConfigs.gemini_key}`),
            checkApi('GPT', currentConfigs.gpt_key, "/api/openai/v1/models", { "Authorization": `Bearer ${currentConfigs.gpt_key}` }),
            checkApi('Grok', currentConfigs.grok_key, "/api/grok/v1/models", { "Authorization": `Bearer ${currentConfigs.grok_key}` })
        ]);

        setStatus(prev => ({
            ...prev,
            gemini: geminiStatus,
            openai: openaiStatus,
            grok: grokStatus
        }));
    }

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    checkConnectivity();
    if (!isElectron) return; // Skip polling on Web Mode

    const interval = setInterval(async () => {
        try {
            const res = await fetch(resolveApiUrl('/api/check'));
            if (res.ok) {
                const data = await res.json();
                setStatus(prev => ({
                    ...prev,
                    rendering: 'online',
                    ffmpeg: data.ffmpeg !== 'Not found' ? 'online' : 'offline'
                }));
            }
            
            // Pulse for Auto Flow extension
            const whiskRes = await fetch(resolveApiUrl('/api/whisk/heartbeat'));
            if (whiskRes.ok) {
                const whiskData = await whiskRes.json();
                setStatus(prev => ({ ...prev, autoFlow: whiskData.active ? 'online' : 'offline' }));
            }
        } catch (e) {}
    }, 30000);

    return () => clearInterval(interval);
  }, [checkConnectivity]);

  const updateConfig = async (newConfig) => {
    // 1. Local Update (Always)
    setConfigs(prev => ({ ...prev, ...newConfig }));
    Object.entries(newConfig).forEach(([key, val]) => {
        localStorage.setItem(`guru_${key}`, val);
    });

    // 2. Backend Update (Only in Electron)
    if (isElectron) {
      try {
        const res = await fetch(resolveApiUrl('/api/config'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig)
        });
        if (res.ok) {
          await checkConnectivity();
          return true;
        }
      } catch (err) {
        console.error("Erro ao salvar configuração no backend:", err);
      }
    } else {
       // In Web Mode, just re-check connectivity to update status indicators
       await checkConnectivity();
       return true;
    }
    return false;
  };

  return (
    <SystemStatusContext.Provider value={{ status, configs, checkConnectivity, updateConfig, isInitialized }}>
      {children}
    </SystemStatusContext.Provider>
  );
};

export const useSystemStatus = () => useContext(SystemStatusContext);
