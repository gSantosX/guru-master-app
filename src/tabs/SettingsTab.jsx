import React, { useState, useEffect } from 'react';
import { Settings, Key, Palette, HardDrive, Shield, CheckCircle, Cpu, AlertCircle, Info, Zap, RefreshCw, Layout, Plus, Minus, Youtube } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { t } from '../utils/i18n';

export const SettingsTab = () => {
  const { status, configs, checkConnectivity, updateConfig } = useSystemStatus();
  
  const [geminiKey, setGeminiKey] = useState(configs.gemini_key);
  const [grokKey, setGrokKey] = useState(configs.grok_key);
  const [gptKey, setGptKey] = useState(configs.gpt_key);
  const [youtubeKey, setYoutubeKey] = useState(configs.youtube_key || '');
  const [activeAi, setActiveAi] = useState(configs.active_ai);
  const [ffmpegPath, setFfmpegPath] = useState(configs.ffmpeg_path || 'ffmpeg');
  
  const [isSaved, setIsSaved] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('guru_theme') || 'neon');
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('guru_reduce_motion') === 'true');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [appZoom, setAppZoom] = useState(Number(localStorage.getItem('guru_app_zoom')) || 1);
  const [appFontSize, setAppFontSize] = useState(Number(localStorage.getItem('guru_app_font_size')) || 16);
  const [storageInfo, setStorageInfo] = useState({ cache_size: 0, total_space: 21474836480, free_space: 0 }); // Default 20GB mock total 

  useEffect(() => {
    setGeminiKey(configs.gemini_key);
    setGrokKey(configs.grok_key);
    setGptKey(configs.gpt_key);
    setYoutubeKey(configs.youtube_key || '');
    setActiveAi(configs.active_ai);
    setFfmpegPath(configs.ffmpeg_path || 'ffmpeg');
    fetchStorageInfo();
  }, [configs]);

  const fetchStorageInfo = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/storage/info');
      const data = await res.json();
      if (!data.error) setStorageInfo(data);
    } catch (e) {
      console.error("Error fetching storage info:", e);
    }
  };

  const formatBytes = (bytes, decimals = 1) => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 2) return '0.1 MB'; // Minimum display
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleSaveKeys = async () => {
    const success = await updateConfig({
      gemini_key: geminiKey,
      grok_key: grokKey,
      gpt_key: gptKey,
      youtube_key: youtubeKey,
      active_ai: activeAi,
      ffmpeg_path: ffmpegPath
    });
    
    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    await checkConnectivity();
    setTimeout(() => setIsReconnecting(false), 800);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('guru_theme', newTheme);
    window.dispatchEvent(new Event('guru_theme_change'));
  };

  const handleMotionChange = (e) => {
    const isChecked = e.target.checked;
    setReduceMotion(isChecked);
    localStorage.setItem('guru_reduce_motion', isChecked);
    window.dispatchEvent(new Event('guru_motion_change'));
  };

  const handleClearCache = async () => {
    if (confirm(t('settings.clear_warning'))) {
      try {
        // Clear Backend
        await fetch('http://localhost:5000/api/storage/clear', { method: 'POST' });
        
        // Clear LocalStorage (Projects only)
        localStorage.removeItem('guru_scripts');
        localStorage.removeItem('guru_active_renders');
        localStorage.removeItem('guru_completed_renders');
        
        // Refresh
        await fetchStorageInfo();
        alert(t('settings.clear_success'));
        window.dispatchEvent(new Event('guru_completed_updated'));
        window.dispatchEvent(new Event('guru_scripts_updated'));
      } catch (e) {
        alert("Erro ao limpar cache remoto. Verifique a conexão com o servidor.");
      }
    }
  };

  const StatusItem = ({ label, status, icon: Icon, error }) => (
    <div className="p-3 bg-dark/40 rounded-xl border border-white/5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${status === 'online' ? 'text-green-400' : status === 'checking...' ? 'text-yellow-400 animate-pulse' : 'text-red-400'}`} />
          <span className="text-sm text-gray-300">{label}</span>
        </div>
        <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-black tracking-widest uppercase shadow-sm ${
          status === 'online' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
          status === 'checking...' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-4' :
          'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {status === 'online' ? 'LIGADO' : status === 'checking...' ? 'TESTANDO' : 'DESLIGADO'}
        </span>
      </div>
      {error && <p className="text-[10px] text-red-400/80 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col overflow-y-auto custom-scrollbar pb-20">
      <header className="mb-6 md:mb-8 shrink-0">
        <h2 className="text-2xl md:text-4xl font-bold text-gray-200 flex items-center gap-2 md:gap-3">
          <Settings className="text-gray-400 w-8 h-8 md:w-10 md:h-10" />
          {t('settings.title')}
        </h2>
        <p className="text-sm md:text-base text-gray-400 mt-2">{t('settings.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 flex-1">
        
        {/* Left Column */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Key className="text-neon-cyan w-5 h-5" /> {t('settings.api_config')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">{t('settings.ai_engine')}</label>
                <div className="flex gap-2">
                  {['Gemini', 'GPT', 'Grok'].map(ai => (
                    <button
                      key={ai}
                      onClick={async () => {
                        setActiveAi(ai);
                        const success = await updateConfig({ active_ai: ai });
                        if (success) {
                           localStorage.setItem('guru_active_ai', ai);
                        }
                      }}
                      className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors border
                        ${activeAi === ai 
                          ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                          : 'bg-dark/50 text-gray-400 border-white/10 hover:border-white/30'
                        }`}
                    >
                      {ai}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="pt-2">
                <label className="text-sm font-medium text-gray-300 block mb-1">{t('settings.grok_key')}</label>
                <input 
                  type="password" 
                  value={grokKey}
                  onChange={(e) => setGrokKey(e.target.value)}
                  placeholder="xai-..."
                  className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">{t('settings.gemini_key')}</label>
                <input 
                  type="password" 
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">{t('settings.gpt_key')}</label>
                <input 
                  type="password" 
                  value={gptKey}
                  onChange={(e) => setGptKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">{t('settings.youtube_key')}</label>
                <input 
                  type="password" 
                  value={youtubeKey}
                  onChange={(e) => setYoutubeKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-sm font-mono"
                />
              </div>
              <button 
                onClick={handleSaveKeys}
                className="w-full py-2 flex justify-center items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-colors"
              >
                {isSaved ? <><CheckCircle className="w-4 h-4 text-green-400" /> {t('settings.saved_success')}</> : t('settings.save_keys')}
              </button>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <HardDrive className="text-neon-purple w-5 h-5" /> {t('settings.storage_title')}
            </h3>
            
             <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{t('settings.storage_used')}</span>
                    <span className="text-neon-purple font-bold">
                       {formatBytes(storageInfo.cache_size)} / {formatBytes(storageInfo.total_space)}
                    </span>
                  </div>
                  <div className="w-full bg-dark bg-opacity-50 rounded-full h-2 overflow-hidden border border-white/5">
                    <div 
                      className="bg-neon-purple h-2 rounded-full shadow-[0_0_10px_#9d00ff] transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (storageInfo.cache_size / storageInfo.total_space) * 100 + 0.5)}%` }}
                    ></div>
                  </div>
               </div>
               
               <p className="text-xs text-gray-500">O armazenamento local contém dados de projetos temporários, legendas em cache e renderizações finais antes da exportação.</p>
               
               <button onClick={handleClearCache} className="text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors w-full shadow-lg">
                 {t('settings.clear_cache')}
               </button>
             </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Palette className="text-neon-pink w-5 h-5" /> {t('settings.interface_title')}
            </h3>
            
            <div className="space-y-4">
               <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">{t('settings.theme_mode')}</label>
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => handleThemeChange('neon')}
                     className={`py-3 text-xs font-medium rounded-xl transition-colors ${theme === 'neon' ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.2)]' : 'bg-dark/50 border border-white/10 text-gray-400 hover:bg-white/5'}`}
                   >{t('settings.theme_neon')}</button>
                   <button 
                     onClick={() => handleThemeChange('minimal')}
                     className={`py-3 text-xs font-medium rounded-xl transition-colors ${theme === 'minimal' ? 'bg-white/10 border border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'bg-dark/50 border border-white/10 text-gray-400 hover:bg-white/5'}`}
                   >{t('settings.theme_minimal')}</button>
                   <button 
                     onClick={() => handleThemeChange('light')}
                     className={`py-3 text-xs font-medium rounded-xl transition-colors ${theme === 'light' ? 'bg-blue-500/10 border border-blue-500 text-blue-400' : 'bg-dark/50 border border-white/10 text-gray-400 hover:bg-white/5'}`}
                   >{t('settings.theme_light')}</button>
                   <button 
                     onClick={() => handleThemeChange('soft')}
                     className={`py-3 text-xs font-medium rounded-xl transition-colors ${theme === 'soft' ? 'bg-purple-400/20 border border-purple-400 text-purple-300' : 'bg-dark/50 border border-white/10 text-gray-400 hover:bg-white/5'}`}
                   >{t('settings.theme_soft')}</button>
                </div>
               </div>
               
               <div className="pt-2">
                 <div className="flex items-center justify-between p-3 bg-dark/50 rounded-xl border border-white/5 shadow-inner">
                    <div className="flex-1 pr-4">
                       <span className="text-sm text-gray-200 font-bold block mb-0.5">{t('settings.effects_label')}</span>
                       <span className="text-[10px] text-gray-500 font-medium">{t('settings.effects_desc')}</span>
                    </div>
                    <div className="relative inline-block w-12 h-6 select-none">
                       <input 
                         type="checkbox" 
                         id="motion" 
                         checked={!reduceMotion} 
                         onChange={(e) => handleMotionChange({ target: { checked: !e.target.checked } })}
                         className="opacity-0 absolute w-full h-full cursor-pointer z-10"
                       />
                       <div className={`block w-full h-full rounded-full transition-all duration-300 ${!reduceMotion ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-gray-700'}`}></div>
                       <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${!reduceMotion ? 'translate-x-6' : 'translate-x-0 shadow-md'}`}></div>
                    </div>
                 </div>
               </div>

               {/* Zoom & Font Size Section */}
               <div className="pt-4 space-y-4">
                 <div className="p-4 bg-dark/50 rounded-xl border border-white/5 shadow-inner space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                       <Layout className="w-4 h-4 text-neon-cyan" />
                       <span className="text-xs font-bold text-white uppercase tracking-wider">{t('settings.accessibility_title')}</span>
                    </div>
                    
                    {/* App Zoom Controls */}
                    <div>
                       <div className="flex justify-between items-center mb-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('settings.app_zoom')}</label>
                          <span className="text-[10px] font-mono text-neon-cyan px-2 py-0.5 rounded bg-neon-cyan/10 border border-neon-cyan/20">
                             {Math.round(appZoom * 100)}%
                          </span>
                       </div>
                       <div className="flex items-center gap-2">
                          <button 
                             onClick={() => {
                                const newVal = Math.max(0.5, appZoom - 0.1);
                                setAppZoom(newVal);
                                localStorage.setItem('guru_app_zoom', newVal);
                                window.dispatchEvent(new Event('guru_zoom_change'));
                             }}
                             className="flex-1 flex justify-center py-2 bg-dark hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                             title={t('settings.zoom_out')}
                          >
                             <Minus className="w-4 h-4" />
                          </button>
                          <button 
                             onClick={() => {
                                const newVal = Math.min(1.5, appZoom + 0.1);
                                setAppZoom(newVal);
                                localStorage.setItem('guru_app_zoom', newVal);
                                window.dispatchEvent(new Event('guru_zoom_change'));
                             }}
                             className="flex-1 flex justify-center py-2 bg-dark hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                             title={t('settings.zoom_in')}
                          >
                             <Plus className="w-4 h-4" />
                          </button>
                       </div>
                    </div>

                    {/* Font Size Controls */}
                    <div>
                       <div className="flex justify-between items-center mb-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('settings.font_size')}</label>
                          <span className="text-[10px] font-mono text-neon-purple px-2 py-0.5 rounded bg-neon-purple/10 border border-neon-purple/20">
                             {appFontSize}px
                          </span>
                       </div>
                       <div className="flex items-center gap-2">
                          <button 
                             onClick={() => {
                                const newVal = Math.max(12, appFontSize - 1);
                                setAppFontSize(newVal);
                                localStorage.setItem('guru_app_font_size', newVal);
                                window.dispatchEvent(new Event('guru_font_size_change'));
                             }}
                             className="flex-1 flex justify-center py-2 bg-dark hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                             title={t('settings.font_dec')}
                          >
                             <Minus className="w-4 h-4" />
                          </button>
                          <button 
                             onClick={() => {
                                const newVal = Math.min(24, appFontSize + 1);
                                setAppFontSize(newVal);
                                localStorage.setItem('guru_app_font_size', newVal);
                                window.dispatchEvent(new Event('guru_font_size_change'));
                             }}
                             className="flex-1 flex justify-center py-2 bg-dark hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                             title={t('settings.font_inc')}
                          >
                             <Plus className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                 </div>
               </div>
            </div>
          </div>
          
          <div className="glass-card p-6 border-neon-cyan/20">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-neon-cyan/10 rounded-lg">
                      <Cpu className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <div>
                      <h3 className="text-white font-bold">{t('sidebar.system_status')}</h3>
                      <p className="text-xs text-gray-500 font-mono">{t('settings.realtime_diagnosis')}</p>
                  </div>
               </div>
               <button 
                 onClick={handleReconnect}
                 disabled={isReconnecting}
                 className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all ${isReconnecting ? 'rotate-180 opacity-50' : ''}`}
                 title={t('sidebar.reconnect')}
               >
                 <RefreshCw className={`w-4 h-4 text-neon-cyan ${isReconnecting ? 'animate-spin' : ''}`} />
               </button>
            </div>

            <div className="space-y-3">
               <StatusItem 
                 label={t('settings.render_motor')} 
                 status={status.rendering} 
                 icon={Zap} 
                 error={status.rendering === 'offline' ? status.details.error : null}
               />
               
               <StatusItem 
                 label={t('settings.ffmpeg_status')} 
                 status={status.ffmpeg} 
                 icon={Info} 
                 error={status.ffmpeg === 'offline' ? 'FFmpeg não encontrado ou erro de execução' : null}
               />

               <StatusItem 
                 label={t('settings.gemini_connection')} 
                 status={status.gemini} 
                 icon={Shield} 
                 error={status.gemini === 'offline' && geminiKey ? 'Chave inválida ou erro de conexão' : null}
               />

               <StatusItem 
                 label={t('settings.openai_connection')} 
                 status={status.openai} 
                 icon={Shield} 
                 error={status.openai === 'offline' && gptKey ? 'Cota excedida ou chave inválida' : null}
               />

               <StatusItem 
                 label={t('settings.grok_connection')} 
                 status={status.grok} 
                 icon={Shield} 
                 error={status.grok === 'offline' && grokKey ? 'Erro de chave ou conexão' : null}
               />

               <StatusItem 
                 label={t('settings.youtube_connection')} 
                 status={status.youtube} 
                 icon={Youtube} 
                 error={status.youtube === 'offline' && youtubeKey ? (status.details.youtube_error || 'Chave de API do YouTube inválida') : null}
               />

               {status.details.ffmpeg && status.ffmpeg === 'online' && (
                 <p className="text-[10px] text-gray-500 font-mono mt-2 truncate">
                   Versão: {status.details.ffmpeg.split(' ')[2]}
                 </p>
               )}
            </div>
          </div>
          
          <div className="glass-card p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Shield className="text-gray-400 w-5 h-5" /> {t('settings.about_title')}
            </h3>
            <p className="text-sm text-gray-400 mb-4">{t('settings.about_desc')} v2.1.1</p>
            <div className="text-xs text-gray-500 space-y-1">
               <p>Frontend: React, TailwindCSS, Framer Node</p>
               <p>Backend Engine: Local Python Workers</p>
               <p>Render Core: FFmpeg x64</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
