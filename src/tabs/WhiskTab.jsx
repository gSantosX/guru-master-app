import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Settings, Layout, Download, FileText, AlertTriangle, CheckCircle, Trash2, Zap, Image as ImageIcon, Hourglass } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { resolveApiUrl } from '../utils/apiUtils';
import { t } from '../utils/i18n';

export const WhiskTab = ({ isActive }) => {
  const [activeSubTab, setActiveSubTab] = useState('control'); // 'control', 'settings'
  const [prompts, setPrompts] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [imageCount, setImageCount] = useState(1);
  const [promptInterval, setPromptInterval] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState(t('whisk.status_ready'));
  const [whiskStatus, setWhiskStatus] = useState({ path: '', file_count: 0, is_empty: true, queue_count: 0 });
  const [autoDownload, setAutoDownload] = useState(true);
  const [checkFolderOnStart, setCheckFolderOnStart] = useState(true);
  const [promptQueue, setPromptQueue] = useState([]);
  const [initialFileCount, setInitialFileCount] = useState(0);
  const [initialQueueCount, setInitialQueueCount] = useState(0);
  const [extensionActive, setExtensionActive] = useState(false);

  useEffect(() => {
    if (isActive) {
      fetchWhiskStatus();
      fetchWhiskSettings();
      
      // Check for transferred prompts from ScriptTab
      const transferred = localStorage.getItem('guru_whisk_transfer');
      if (transferred) {
        setPrompts(transferred);
        localStorage.removeItem('guru_whisk_transfer');
        setActiveSubTab('control');
      }
    }
  }, [isActive]);

  // Sync prompts textarea with visual queue
  useEffect(() => {
    if (!isRunning) {
      const list = prompts.split('\n')
        .map(p => p.trim())
        .filter(p => p !== '')
        .map((text, idx) => ({ id: idx, text, status: 'pending' }));
      setPromptQueue(list);
    }
  }, [prompts, isRunning]);

  // Status Polling Effect
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        fetchWhiskStatus();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Extension Heartbeat Check
  useEffect(() => {
    const checkHeartbeat = async () => {
      try {
        const res = await fetch(resolveApiUrl('/api/whisk/heartbeat'));
        const data = await res.json();
        setExtensionActive(data.active);
      } catch (e) {}
    };
    const interval = setInterval(checkHeartbeat, 5000);
    checkHeartbeat();
    return () => clearInterval(interval);
  }, []);

  // Update logic for single prompt statuses
  useEffect(() => {
    if (!isRunning) return;

    const processedCount = initialQueueCount - whiskStatus.queue_count;
    const doneCount = whiskStatus.file_count - initialFileCount;

    setPromptQueue(prev => prev.map((p, idx) => {
      if (idx < doneCount) return { ...p, status: 'done' };
      if (idx === processedCount - 1 && processedCount > doneCount) return { ...p, status: 'processing' };
      return { ...p, status: 'pending' };
    }));

    if (whiskStatus.queue_count === 0 && doneCount >= promptQueue.length && promptQueue.length > 0) {
      setIsRunning(false);
      setStatus(t('whisk.status_ready'));
    }
  }, [whiskStatus, isRunning]);

  const fetchWhiskStatus = async () => {
    try {
      const res = await fetch(resolveApiUrl('/api/whisk/status'));
      const data = await res.json();
      setWhiskStatus(data);
      return data;
    } catch (e) {
      console.error("Error fetching whisk status:", e);
    }
  };

  const fetchWhiskSettings = async () => {
    try {
      const res = await fetch(resolveApiUrl('/api/whisk/settings'));
      const data = await res.json();
      setAspectRatio(data.aspect_ratio);
      setImageCount(data.image_count);
      setPromptInterval(data.prompt_interval ?? 5);
      setAutoDownload(data.auto_download);
      setCheckFolderOnStart(data.check_folder_on_start ?? true);
    } catch (e) {
      console.error("Error fetching whisk settings:", e);
    }
  };

  const handleStart = async () => {
    if (!prompts.trim()) return;
    
    // Check if folder is empty if enabled
    if (checkFolderOnStart && !whiskStatus.is_empty) {
      if (!confirm(t('whisk.folder_exists_error'))) return;
      await handleClearFolder();
    }

    const promptList = prompts.split('\n')
      .map(p => p.trim())
      .filter(p => p !== '');
    
    if (promptList.length === 0) return;
    
    try {
      await fetch(resolveApiUrl('/api/whisk/prompts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: promptList })
      });

      await fetch(resolveApiUrl('/api/whisk/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aspect_ratio: aspectRatio,
          image_count: imageCount,
          prompt_interval: promptInterval,
          auto_download: autoDownload,
          check_folder_on_start: checkFolderOnStart
        })
      });
      
      // Open the website automatically
      fetch(resolveApiUrl('/api/whisk/open'), { method: 'POST' }).catch(() => {});

      const currentStatus = await fetchWhiskStatus();
      setInitialFileCount(currentStatus.file_count);
      setInitialQueueCount(promptList.length);
      setIsRunning(true);
      setStatus(t('whisk.status_running'));
    } catch (e) {
      alert("Erro ao iniciar automação.");
    }
  };

  const handleStop = async () => {
    try {
      await fetch(resolveApiUrl('/api/whisk/prompts'), { method: 'DELETE' });
      setIsRunning(false);
      setStatus(t('whisk.status_ready'));
      fetchWhiskStatus();
    } catch (e) {
      console.error("Error stopping whisk:", e);
    }
  };

  const handleClearFolder = async () => {
    try {
      const res = await fetch(resolveApiUrl('/api/whisk/clear'), { method: 'POST' });
      if (res.ok) {
        alert(t('whisk.folder_cleared'));
        fetchWhiskStatus();
      }
    } catch (e) {
      alert("Erro ao limpar pasta.");
    }
  };

  const handleSelectFolder = async () => {
    try {
      const res = await fetch(resolveApiUrl('/api/whisk/select-folder'), { method: 'POST' });
      const data = await res.json();
      if (data.path) {
        setWhiskStatus(prev => ({ ...prev, path: data.path }));
        fetchWhiskStatus(); // Refresh status to check if it's empty etc.
      }
    } catch (e) {
      console.error("Error selecting folder:", e);
      alert("Erro ao selecionar pasta.");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPrompts(e.target.result);
    reader.readAsText(file);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done': 
        return <Hourglass className="w-4 h-4 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />;
      case 'processing': 
        return (
          <motion.div
            animate={{ rotate: 180 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="flex items-center justify-center"
          >
            <Hourglass className="w-4 h-4 text-neon-cyan drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]" />
          </motion.div>
        );
      default: 
        return <Hourglass className="w-4 h-4 text-gray-700 opacity-40" />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[1600px] mx-auto gap-8 font-sans overflow-hidden px-4 md:px-0 pt-4 md:pt-6">
      {/* Premium Header */}
      <header className="flex flex-col justify-between items-start gap-4 shrink-0">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3 tracking-tight uppercase italic">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-cyan via-blue-600 to-white p-[1px] shadow-[0_0_15px_rgba(0,243,255,0.3)] shrink-0">
              <div className="w-full h-full bg-dark rounded-full flex items-center justify-center overflow-hidden">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
              </div>
            </div>
            {t('whisk.title')}
          </h2>
          <p className="text-gray-500 mt-2 font-black text-[10px] uppercase tracking-[0.2em] border-l-2 border-neon-cyan pl-3 ml-1">
            {t('whisk.subtitle')}
          </p>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 w-full">
        <div className="flex w-full md:w-auto bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-md">
          {[
            { id: 'control', label: t('whisk.tab_control'), icon: Layout },
            { id: 'settings', label: t('whisk.tab_settings'), icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all
                ${activeSubTab === tab.id 
                  ? 'bg-gradient-to-br from-neon-cyan/20 to-blue-600/20 text-neon-cyan shadow-inner border border-neon-cyan/30' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeSubTab === tab.id ? 'animate-pulse' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            disabled={isRunning || !prompts}
            className={`w-full sm:w-auto flex items-center justify-center gap-3 px-6 md:px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all
              ${isRunning || !prompts 
                ? 'bg-gray-800/50 text-gray-600 border border-white/5' 
                : 'bg-gradient-to-r from-neon-cyan to-blue-600 text-white shadow-[0_0_20px_rgba(0,243,255,0.2)]'
              }
            `}
          >
            {isRunning ? (
              <LoadingSpinner size="xs" message="" />
            ) : (
              <Play className={`w-4 h-4 fill-current ${prompts ? 'animate-pulse' : ''}`} /> 
            )}
            {t('whisk.btn_start')}
          </motion.button>
          
          {isRunning && (
            <motion.button 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={handleStop}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> {t('whisk.btn_stop')}
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar glass-card p-4 md:p-8 lg:p-10 min-h-0 relative border-white/10 w-full max-w-full">
        <div className="absolute top-0 right-0 p-1 opacity-5 pointer-events-none">
           <Zap className="w-24 h-24 md:w-32 md:h-32 text-neon-cyan" />
        </div>
        <AnimatePresence mode="wait">
          {activeSubTab === 'control' && (
            <motion.div
              key="control"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h3 className="text-[10px] md:text-xs font-black text-neon-cyan uppercase tracking-[0.3em] flex items-center gap-3 shrink-0">
                     <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_#00f3ff]" />
                     {t('whisk.prompt_list')}
                  </h3>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-4 w-full sm:w-auto">
                     <select className="flex-1 sm:flex-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-gray-400 focus:outline-none focus:border-neon-cyan/50 hover:bg-white/10 transition-all cursor-pointer">
                        <option>{t('whisk.starting_mode')}</option>
                     </select>
                     <label className="flex-1 sm:flex-none justify-center bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/10 px-5 py-2 rounded-xl text-[10px] text-white font-black uppercase tracking-widest cursor-pointer flex items-center gap-2 transition-all shadow-sm">
                        <Download className="w-3 h-3 text-neon-cyan shrink-0" /> <span className="truncate">{t('whisk.import_file')}</span>
                        <input type="file" className="hidden" onChange={handleFileUpload} />
                     </label>
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-cyan/20 to-blue-600/20 rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                  <textarea
                    value={prompts}
                    onChange={(e) => setPrompts(e.target.value)}
                    placeholder={t('whisk.prompt_placeholder')}
                    className="relative w-full h-40 md:h-64 bg-dark/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 md:p-6 text-gray-200 focus:outline-none focus:border-neon-cyan/40 resize-none font-mono text-xs md:text-sm leading-relaxed custom-scrollbar shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                {[
                  { label: t('whisk.aspect_ratio'), value: aspectRatio, setter: setAspectRatio, options: ['16:9', '9:16', '1:1', '4:3'] },
                  { label: t('whisk.image_count'), value: imageCount, setter: (v) => setImageCount(Number(v)), options: [1, 2, 3, 4] },
                  { label: "Delay (Segundos)", value: promptInterval, setter: (v) => setPromptInterval(Number(v)), options: [5, 10, 15, 20, 30] }
                ].map((field, i) => (
                  <div key={i} className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">{field.label}</label>
                    <div className="relative group">
                      <select 
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-black text-white hover:bg-white/10 focus:outline-none focus:border-neon-cyan/50 transition-all appearance-none cursor-pointer"
                      >
                        {field.options.map(opt => <option key={opt} value={opt} className="bg-dark text-white">{opt}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                         <Zap className="w-3 h-3 text-neon-cyan" />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 invisible">Extra</label>
                  <motion.button 
                    whileHover={{ y: -2 }}
                    className="w-full h-[54px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-gray-400 flex items-center justify-center gap-3 transition-all tracking-widest shadow-sm"
                  >
                    <ImageIcon className="w-4 h-4 text-neon-purple shadow-[0_0_10px_rgba(191,64,255,0.4)]" /> 
                    {t('whisk.reference_images')} 
                    <span className="px-2.5 py-1 bg-neon-purple/20 text-neon-purple rounded-lg border border-neon-purple/20 font-mono">0</span>
                  </motion.button>
                </div>
              </div>

              {/* Enhanced Status Indicator */}
              <div className={`mt-12 p-6 rounded-3xl border transition-all duration-500 overflow-hidden relative
                ${extensionActive 
                  ? 'bg-green-500/5 border-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.05)]' 
                  : 'bg-red-500/5 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.05)]'
                }
              `}>
                <div className="absolute top-0 right-0 p-2 opacity-10">
                   {extensionActive ? <CheckCircle className="w-16 h-16" /> : <AlertTriangle className="w-16 h-16" />}
                </div>
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${isRunning ? 'animate-ping' : ''} ${isRunning ? 'bg-neon-cyan' : 'bg-gray-600'}`} />
                      <span className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em]">{status}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 border-l border-white/10 pl-8">
                      <motion.div 
                        animate={extensionActive ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 3 }}
                        className={`w-3 h-3 rounded-full ${extensionActive ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'}`} 
                      />
                      <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${extensionActive ? 'text-green-500' : 'text-red-500'}`}>
                         {extensionActive ? 'Conectado com o Whisk' : 'Aguardando Extensão'}
                      </span>
                    </div>
                  </div>

                  {isRunning && (
                    <div className="flex items-center gap-3 px-6 py-2 bg-neon-cyan/10 border border-neon-cyan/20 rounded-full">
                       <Zap className="w-3 h-3 text-neon-cyan animate-pulse" />
                       <span className="text-[10px] font-black text-neon-cyan uppercase tracking-widest leading-none">
                          {whiskStatus.queue_count} {t('whisk.prompt_list').split(' ')[0]} Pendentes
                       </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Queue Table Movie Inside Control Tab */}
              {promptQueue.length > 0 && (
                <div className="mt-10 shrink-0 flex flex-col min-h-0 bg-dark/20 p-8 rounded-[40px] border border-white/5 backdrop-blur-3xl">
                   {/* Progress Bar Header */}
                   <div className="mb-10 space-y-4">
                      <div className="flex justify-between items-end px-2">
                         <div className="space-y-1">
                            <span className="text-[10px] font-black text-neon-purple uppercase tracking-[0.4em] block">{status}</span>
                            <h4 className="text-xl font-black text-white uppercase tracking-tight">Status da Automação</h4>
                         </div>
                         <div className="text-right">
                            <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Total Concluído</div>
                            <div className="text-2xl font-black text-white tabular-nums flex items-center gap-2 justify-end">
                               {promptQueue.filter(p => p.status === 'done').length} <span className="text-white/20 text-sm">/</span> {promptQueue.length}
                               <span className="text-xs bg-white/10 px-2 py-1 rounded text-neon-cyan ml-2 border border-white/5">
                                  {promptQueue.length > 0 ? Math.round((promptQueue.filter(p => p.status === 'done').length / promptQueue.length) * 100) : 0}%
                               </span>
                            </div>
                         </div>
                      </div>
                      <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px] shadow-inner relative">
                         <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(promptQueue.filter(p => p.status === 'done').length / (promptQueue.length || 1)) * 100}%` }}
                            className="h-full bg-gradient-to-r from-neon-purple via-neon-cyan to-blue-500 rounded-full shadow-[0_0_20px_rgba(0,243,255,0.4)] relative z-10"
                         />
                         {/* Decorative background grid inside bar */}
                         <div className="absolute inset-0 opacity-10 flex border-r border-white/20 pointer-events-none">
                            {[...Array(10)].map((_, i) => <div key={i} className="flex-1 border-l border-white/20" />)}
                         </div>
                      </div>
                   </div>

                   <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-3">
                         <Layout className="w-3.5 h-3.5 text-neon-cyan" /> {t('whisk.tab_tools').split(' ')[0]} da Fila Visual
                      </h3>
                      <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
                         <span className="flex items-center gap-2 text-green-500/80"><CheckCircle className="w-3.5 h-3.5" /> {t('whisk.ready')}</span>
                         <span className="flex items-center gap-2 text-neon-cyan/80"><div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-ping" /> {t('whisk.status_running')}</span>
                      </div>
                   </div>
                   
                   <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-dark/40 border border-white/10 rounded-3xl shadow-2xl max-h-72 w-full max-w-full block">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                         <thead className="sticky top-0 bg-dark/90 backdrop-blur-xl border-b border-white/10 z-10">
                            <tr>
                               <th className="p-6 text-[10px] font-black text-neon-cyan/60 uppercase tracking-widest w-16 text-center">ID</th>
                               <th className="p-6 text-[10px] font-black text-neon-cyan/60 uppercase tracking-widest">Conteúdo do Prompt</th>
                               <th className="p-6 text-[10px] font-black text-neon-cyan/60 uppercase tracking-widest w-24 text-center">Preview</th>
                               <th className="p-6 text-[10px] font-black text-neon-cyan/60 uppercase tracking-widest w-20 text-center">Status</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-white/[0.03]">
                            {promptQueue.map((p, idx) => (
                               <tr key={p.id} className={`group transition-all duration-300 ${p.status === 'processing' ? 'bg-neon-cyan/5' : 'hover:bg-white/[0.02]'}`}>
                                  <td className="p-6 text-xs font-mono text-gray-600 text-center">{String(idx + 1).padStart(2, '0')}</td>
                                  <td className="p-6">
                                     <div className={`text-xs transition-colors duration-300 line-clamp-1 group-hover:line-clamp-none leading-relaxed ${p.status === 'done' ? 'text-gray-500 italic' : 'text-gray-300 font-bold'}`}>
                                        {p.text}
                                     </div>
                                  </td>
                                  <td className="p-6">
                                     <div className={`w-14 h-9 mx-auto rounded-xl border border-dashed flex items-center justify-center transition-all duration-500
                                        ${p.status === 'done' ? 'bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-dark/50 border-white/10'}
                                     `}>
                                        {p.status === 'done' ? (
                                           <ImageIcon className="w-4 h-4 text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                                        ) : (
                                           <Zap className="w-3 h-3 text-gray-800" />
                                        )}
                                     </div>
                                  </td>
                                  <td className="p-6 text-center">
                                     <div className="flex justify-center transform group-hover:scale-110 transition-transform">
                                        {getStatusIcon(p.status)}
                                     </div>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-2">
                 <div className="w-1.5 h-8 bg-neon-purple rounded-full shadow-[0_0_15px_#bf40ff] hidden sm:block" />
                 <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">{t('whisk.folder_config')}</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Folder Path Card */}
                 <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6 hover:bg-white/[0.07] transition-colors group">
                    <div className="flex items-center gap-4">
                       <div className="w-8 h-8 rounded-xl bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/20 shrink-0">
                          <Download className="w-4 h-4 text-neon-cyan" />
                       </div>
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('whisk.folder_path')}</label>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="p-4 bg-dark/60 border border-white/5 rounded-xl text-gray-400 font-mono text-[10px] break-all leading-normal shadow-inner italic">
                          {whiskStatus.path || 'Nenhuma pasta selecionada...'}
                       </div>
                       <motion.button 
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                         onClick={handleSelectFolder}
                         className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-black text-[10px] uppercase tracking-widest transition-all group/btn"
                       >
                         <Layout className="w-4 h-4 text-neon-cyan" />
                         {whiskStatus.path ? 'Alterar Localização' : 'Selecionar Pasta de Captura'}
                       </motion.button>
                    </div>
                 </div>

                 {/* Toggles Card */}
                 <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between gap-4 hover:bg-white/[0.07] transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-xl bg-neon-purple/10 flex items-center justify-center border border-neon-purple/20 shrink-0">
                             <Zap className="w-4 h-4 text-neon-purple" />
                          </div>
                          <div>
                             <p className="text-xs font-black text-white uppercase tracking-tighter">{t('whisk.check_folder')}</p>
                             <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{t('whisk.check_folder_hint')}</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => setCheckFolderOnStart(!checkFolderOnStart)}
                         className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${checkFolderOnStart ? 'bg-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.4)]' : 'bg-white/10 ring-1 ring-white/5'}`}
                       >
                          <motion.div 
                            animate={{ x: checkFolderOnStart ? 26 : 4 }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg" 
                          />
                       </button>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between gap-4 hover:bg-white/[0.07] transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-xl bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/20 shrink-0">
                             <CheckCircle className="w-4 h-4 text-neon-cyan" />
                          </div>
                          <div>
                             <p className="text-xs font-black text-white uppercase tracking-tighter">Auto Download</p>
                             <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Baixar imagens automaticamente</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => setAutoDownload(!autoDownload)}
                         className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${autoDownload ? 'bg-neon-purple shadow-[0_0_10px_#bf40ff44]' : 'bg-white/10 ring-1 ring-white/5'}`}
                       >
                          <motion.div 
                            animate={{ x: autoDownload ? 26 : 4 }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg" 
                          />
                       </button>
                    </div>
                 </div>
              </div>

              {/* Status Section */}
              <div className="mt-4">
                {!whiskStatus.is_empty ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 md:p-10 bg-red-500/5 border border-red-500/20 rounded-[32px] md:rounded-[40px] relative overflow-hidden group"
                  >
                     <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[0_0_15px_#ef4444]" />
                     <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 relative">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                           <AlertTriangle className="text-red-500 w-8 h-8 md:w-10 md:h-10 animate-bounce" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                           <p className="text-xl md:text-2xl font-black text-white tracking-tight mb-1">{t('whisk.folder_exists_error')}</p>
                           <p className="text-red-400/60 text-xs md:text-sm font-bold uppercase tracking-[0.2em] flex items-center justify-center md:justify-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-red-500" />
                              Contém {whiskStatus.file_count} arquivos residuais
                           </p>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleClearFolder}
                          className="w-full md:w-auto px-10 py-4 md:py-5 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_10px_30px_rgba(239,68,68,0.3)] flex items-center justify-center gap-3 shrink-0"
                        >
                           <Trash2 className="w-4 h-4" /> {t('whisk.clear_folder')}
                        </motion.button>
                     </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 bg-green-500/5 border border-green-500/20 rounded-3xl flex flex-col md:flex-row items-center text-center md:text-left gap-6 relative overflow-hidden"
                  >
                     <div className="absolute top-0 left-0 w-full h-1 md:w-1 md:h-full bg-green-500 shadow-[0_0_15px_#22c55e]" />
                     <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shrink-0">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                     </div>
                     <div>
                        <p className="text-xl font-black text-white tracking-tight mb-1">{t('whisk.status_ready')}</p>
                        <p className="text-green-400/60 text-[9px] font-black uppercase tracking-[0.2em]">Pasta de downloads limpa e sincronizada</p>
                     </div>
                  </motion.div>
                )}
              </div>

              {/* Browse Folder Hint */}
              <div className="flex items-center gap-4 p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl opacity-60 hover:opacity-100 transition-opacity">
                 <Settings className="w-5 h-5 text-blue-400" />
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                    {t('whisk.folder_hint')}
                 </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
