import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SystemStatusContext = createContext();

export const SystemStatusProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState({
    rendering: 'checking...',
    ffmpeg: 'checking...',
    api: 'checking...',
    details: { ffmpeg: '', error: '' }
  });
  const [configs, setConfigs] = useState({
    gemini_key: '',
    grok_key: '',
    gpt_key: '',
    active_ai: 'Gemini'
  });

  const checkConnectivity = useCallback(async () => {
    // 1. Check Backend & FFmpeg
    try {
      const res = await fetch('/api/system/check');
      if (res.ok) {
        const data = await res.json();
        setStatus(prev => ({
          ...prev,
          rendering: 'online',
          ffmpeg: data.ffmpeg !== 'Not found' ? 'online' : 'offline',
          details: { ...prev.details, ffmpeg: data.ffmpeg, error: data.error || '' }
        }));
      } else {
        setStatus(prev => ({ ...prev, rendering: 'offline', ffmpeg: 'offline', details: { ...prev.details, error: 'Servidor Offline' } }));
      }
    } catch (err) {
      setStatus(prev => ({ ...prev, rendering: 'offline', ffmpeg: 'offline', details: { ...prev.details, error: 'Falha na conexão com o motor' } }));
    }

    // 2. Load Configs from Backend
    let currentConfigs = configs;
    try {
      const res = await fetch('/api/system/config');
      if (res.ok) {
        const configData = await res.json();
        setConfigs(configData);
        currentConfigs = configData;
        // Sync to localStorage
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
         active_ai: localStorage.getItem('guru_active_ai') || 'Gemini'
       };
       setConfigs(currentConfigs);
    }

    // 3. Check AI API Connection (Simple check for the active one)
    const activeAi = currentConfigs.active_ai;
    const key = currentConfigs[`${activeAi.toLowerCase()}_key`];
    
    if (!key || key.includes('YOUR_') || key === "") {
      setStatus(prev => ({ ...prev, api: 'offline' }));
    } else {
      try {
        if (activeAi === 'Gemini') {
          // Use the proxy
          const testRes = await fetch(`/api/gemini/v1beta/models?key=${key}`);
          setStatus(prev => ({ ...prev, api: testRes.ok ? 'online' : 'offline' }));
        } else {
          setStatus(prev => ({ ...prev, api: 'online' }));
        }
      } catch (e) {
        setStatus(prev => ({ ...prev, api: 'offline' }));
      }
    }
    setIsInitialized(true);
  }, [configs]);

  useEffect(() => {
    checkConnectivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateConfig = async (newConfig) => {
    try {
      const res = await fetch('/api/system/config', {
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
