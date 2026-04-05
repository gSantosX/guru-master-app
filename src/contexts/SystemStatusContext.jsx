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
    active_ai: 'Gemini'
  });

  const checkConnectivity = useCallback(async () => {
    let attempts = 0;
    const maxAttempts = 10;
    let isConnected = false;

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
                    gemini: data.ai?.gemini ? 'online' : 'offline',
                    openai: data.ai?.openai ? 'online' : 'offline',
                    grok: data.ai?.grok ? 'online' : 'offline',
                    anthropic: data.ai?.anthropic ? 'online' : 'offline',
                    deepseek: data.ai?.deepseek ? 'online' : 'offline',
                    elevenlabs: data.ai?.elevenlabs ? 'online' : 'offline',
                    leonardo: data.ai?.leonardo ? 'online' : 'offline',
                    youtube: data.ai?.youtube ? 'online' : 'offline',
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
    let currentConfigs = null;
    try {
      const res = await fetch(resolveApiUrl('/api/config'));
      if (res.ok) {
        const configData = await res.json();
        setConfigs(configData);
        currentConfigs = configData;
        // Sync to localStorage
        if (configData.google_client_id) localStorage.setItem('guru_google_client_id', configData.google_client_id);
        if (configData.youtube_key) localStorage.setItem('guru_youtube_key', configData.youtube_key);
        if (configData.gemini_key) localStorage.setItem('guru_gemini_key', configData.gemini_key);
        if (configData.grok_key) localStorage.setItem('guru_grok_key', configData.grok_key);
        if (configData.gpt_key) localStorage.setItem('guru_gpt_key', configData.gpt_key);
        if (configData.active_ai) localStorage.setItem('guru_active_ai', configData.active_ai);
      }
    } catch (err) {
       // If backend is down, use localStorage as fallback
       currentConfigs = {
         gemini_key: localStorage.getItem('guru_gemini_key') || '',
         grok_key: localStorage.getItem('guru_grok_key') || '',
         gpt_key: localStorage.getItem('guru_gpt_key') || '',
         youtube_key: localStorage.getItem('guru_youtube_key') || '',
         google_client_id: localStorage.getItem('guru_google_client_id') || '',
         active_ai: localStorage.getItem('guru_active_ai') || 'Gemini'
       };
       setConfigs(currentConfigs);
    }

    // 3. Check AI APIs Independently
    if (currentConfigs) {
        const checkApi = async (name, key, url, headers = {}) => {
            if (!key || key.includes('YOUR_') || key === "" || key.length < 5) return 'offline';
            try {
                const res = await fetch(resolveApiUrl(url), { headers });
                return res.ok ? 'online' : 'offline';
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
    // Iniciar pollock periódico para manter o status atualizado
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
    }, 10000);

    return () => clearInterval(interval);
  }, [checkConnectivity]);

  const updateConfig = async (newConfig) => {
    try {
      const res = await fetch(resolveApiUrl('/api/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        setConfigs(prev => ({ ...prev, ...newConfig }));
        // Sincronizar localmente também por precaução
        Object.entries(newConfig).forEach(([key, val]) => {
           if (key.includes('key')) localStorage.setItem(`guru_${key}`, val);
           else localStorage.setItem(`guru_${key}`, val);
        });
        await checkConnectivity();
        return true;
      }
    } catch (err) {
      console.error("Erro ao salvar configuração:", err);
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
