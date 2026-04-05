import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Settings, Layout, Download, FileText, AlertTriangle, CheckCircle, Trash2, Zap, Image as ImageIcon, Hourglass } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { resolveApiUrl } from '../utils/apiUtils';
import { t } from '../utils/i18n';
import { useSystemStatus } from '../contexts/SystemStatusContext';

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
  const { status: globalStatus } = useSystemStatus();
  const [generationMode, setGenerationMode] = useState('video'); // 'video' or 'image'

  useEffect(() => {
    if (isActive) {
      fetchWhiskStatus();
      fetchWhiskSettings();
      
      // Check for transferred prompts from ScriptTab
      const transferred = localStorage.getItem('guru_flow_transfer');
      if (transferred) {
        setPrompts(transferred);
        localStorage.removeItem('guru_flow_transfer');
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

  const extensionActive = globalStatus.autoFlow === 'online';

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
      setGenerationMode(data.current_mode || 'video');
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
        body: JSON.stringify({ prompts: promptList, mode: generationMode })
      });

      await fetch(resolveApiUrl('/api/whisk/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aspect_ratio: aspectRatio,
          image_count: imageCount,
          prompt_interval: promptInterval,
          auto_download: autoDownload,
          check_folder_on_start: checkFolderOnStart,
          mode: generationMode
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
    <div className="flex flex-col h-full w-full max-w-[1500px] mx-auto gap-4 font-sans overflow-hidden px-4 md:px-0 pt-4 md:pt-4">
      {/* Compact Header */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-cyan via-blue-600 to-white p-[1px] shadow-[0_0_10px_rgba(0,243,255,0.2)] shrink-0">
            <div className="w-full h-full bg-dark rounded-full flex items-center justify-center overflow-hidden border border-white/10">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
            </div>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-widest uppercase italic leading-none">{t('whisk.title')}</h2>
            <p className="text-gray-600 font-bold text-[8px] uppercase tracking-[0.2em] mt-1 pl-3 border-l border-neon-cyan/50">{t('whisk.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-md">
          {[
            { id: 'control', label: 'Painel', icon: Layout },
            { id: 'settings', label: 'Ajustes', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all
                ${activeSubTab === tab.id 
                  ? 'bg-gradient-to-br from-neon-cyan/20 to-blue-600/20 text-neon-cyan border border-neon-cyan/30' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeSubTab === tab.id ? 'animate-pulse' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar glass-card p-4 md:p-6 lg:p-8 min-h-0 relative border-white/5 w-full max-w-full">
        <div className="absolute top-0 right-0 p-1 opacity-5 pointer-events-none">
           <Zap className="w-20 h-20 md:w-24 md:h-24 text-neon-cyan" />
        </div>
        <AnimatePresence mode="wait">
          {activeSubTab === 'control' && (
            <motion.div
              key="control"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[9px] md:text-[10px] font-black text-neon-cyan uppercase tracking-[0.3em] flex items-center gap-2 shrink-0">
                       <div className="w-1 h-1 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_#00f3ff]" />
                       {t('whisk.prompt_list')}
                    </h3>
                  </div>
                  
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                      <button 
                        onClick={() => setGenerationMode('video')}
                        className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${generationMode === 'video' ? 'bg-neon-cyan text-dark' : 'text-gray-500 hover:text-white'}`}
                      >
                        Vídeo
                      </button>
                      <button 
                        onClick={() => setGenerationMode('image')}
                        className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${generationMode === 'image' ? 'bg-neon-pink text-white shadow-[0_0_10px_rgba(255,0,128,0.3)]' : 'text-gray-500 hover:text-white'}`}
                      >
                        Imagem
                      </button>
                    </div>

                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleStart}
                      disabled={isRunning || !prompts}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all
                        ${isRunning || !prompts 
                          ? 'bg-gray-800/40 text-gray-600 border border-white/5' 
                          : generationMode === 'image' 
                            ? 'bg-gradient-to-r from-neon-pink to-purple-600 text-white shadow-lg shadow-neon-pink/10'
                            : 'bg-gradient-to-r from-neon-cyan to-blue-600 text-white shadow-lg'
                        }
                      `}
                    >
                      {isRunning ? <LoadingSpinner size="xs" message="" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                      {generationMode === 'image' ? 'Gerar Imagens' : 'Gerar Vídeos'}
                    </motion.button>
                    
                    {isRunning && (
                      <button onClick={handleStop} className="px-5 py-2.5 rounded-xl font-black text-[9px] uppercase bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-2">
                        <Square className="w-3 h-3 fill-current" /> PARAR
                      </button>
                    )}
                  </div>

              <div className="space-y-4">
                <div className="relative group">
                  <textarea
                    value={prompts}
                    onChange={(e) => setPrompts(e.target.value)}
                    placeholder={t('whisk.prompt_placeholder')}
                    className="relative w-full h-32 md:h-44 bg-dark/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 md:p-5 text-gray-300 focus:outline-none focus:border-neon-cyan/40 resize-none font-mono text-[11px] md:text-xs leading-relaxed custom-scrollbar shadow-inner"
                  />
                  <div className="absolute top-4 right-4 group-hover:opacity-100 opacity-30 transition-opacity">
                     <label className="bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded-lg cursor-pointer flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-neon-cyan" />
                        <input type="file" className="hidden" onChange={handleFileUpload} />
                     </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                {[
                  { label: "Proporção", value: aspectRatio, setter: setAspectRatio, options: ['16:9', '9:16', '1:1', '4:3'], icon: Layout },
                  { label: "Qtd. Imagens", value: imageCount, setter: (v) => setImageCount(Number(v)), options: [1, 2, 3, 4], icon: FileText },
                  { label: "Delay (Seg)", value: promptInterval, setter: (v) => setPromptInterval(Number(v)), options: [5, 10, 15, 20, 30], icon: Hourglass }
                ].map((field, i) => (
                  <div key={i} className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">{field.label}</label>
                    <div className="relative group">
                      <select 
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        className="w-full h-11 bg-white/5 border border-white/5 rounded-xl px-4 py-0 text-xs font-black text-white hover:bg-white/10 focus:outline-none cursor-pointer appearance-none"
                      >
                        {field.options.map(opt => <option key={opt} value={opt} className="bg-dark text-white">{opt}</option>)}
                      </select>
                      <field.icon className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-neon-cyan opacity-40 pointer-events-none" />
                    </div>
                  </div>
                ))}

                <button className="h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-bold uppercase text-gray-400 flex items-center justify-center gap-2 transition-all tracking-widest px-4 group">
                  <ImageIcon className="w-4 h-4 text-neon-purple group-hover:scale-110 transition-transform" /> 
                  Ref. <span className="bg-neon-purple/20 text-neon-purple px-1.5 rounded-md font-mono text-[8px] border border-neon-purple/30">0</span>
                </button>
              </div>

              {/* Compact Extension Check */}
              <div className={`p-4 rounded-xl border transition-all flex items-center justify-between ${extensionActive ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isRunning ? 'animate-ping' : ''} ${isRunning ? 'bg-neon-cyan shadow-[0_0_8px_#00f3ff]' : 'bg-gray-600'}`} />
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{status}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 border-l border-white/10 pl-6">
                    <div className={`w-2 h-2 rounded-full ${extensionActive ? 'bg-green-500' : 'bg-red-500 active-glow'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${extensionActive ? 'text-green-500' : 'text-red-500'}`}>
                       {extensionActive ? 'AUTO FLOW: CONECTADO' : 'AUTO FLOW: DESCONECTADO'}
                    </span>
                  </div>
                </div>

                {isRunning && (
                  <div className="px-4 py-1.5 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg flex items-center gap-2">
                     <Zap className="w-3 h-3 text-neon-cyan" />
                     <span className="text-[9px] font-black text-neon-cyan uppercase tracking-widest">{whiskStatus.queue_count} Pendentes</span>
                  </div>
                )}
              </div>

              {/* Progress Detail */}
              {promptQueue.length > 0 && (
                <div className="bg-dark/40 border border-white/5 rounded-2xl p-4 md:p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <Layout className="w-3.5 h-3.5 text-neon-cyan" /> Fila Visual
                    </h4>
                    <span className="text-[10px] font-mono text-gray-500">
                      {promptQueue.filter(p => p.status === 'done').length} / {promptQueue.length} Done
                    </span>
                  </div>
                  
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan"
                      initial={{ width: 0 }}
                      animate={{ width: `${(promptQueue.filter(p => p.status === 'done').length / promptQueue.length) * 100}%` }}
                    />
                  </div>

                  <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1">
                    {promptQueue.map((p, idx) => (
                      <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg border ${p.status === 'processing' ? 'bg-neon-cyan/5 border-neon-cyan/20' : 'border-transparent hover:bg-white/[0.03]'}`}>
                         <div className="flex items-center gap-3">
                           <span className="text-[9px] font-mono text-gray-600">{(idx + 1).toString().padStart(2, '0')}</span>
                           <span className={`text-[10px] truncate max-w-[200px] md:max-w-md ${p.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{p.text}</span>
                         </div>
                         <div className="shrink-0">{getStatusIcon(p.status)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeSubTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                       <Layout className="w-4 h-4 text-neon-cyan" />
                       <label className="text-[10px] font-black text-gray-400">PASTA DEdownloads</label>
                    </div>
                    <div className="p-3 bg-dark/60 rounded-xl text-gray-500 font-mono text-[9px] truncate italic border border-white/5">
                        {whiskStatus.path || 'Padrão do Sistema'}
                    </div>
                    <button onClick={handleSelectFolder} className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase text-white transition-all border border-white/5">Alterar Pasta</button>
                  </div>

                  <div className="flex flex-col gap-4">
                    {[
                      { label: "Verificar Pasta ao Iniciar", active: checkFolderOnStart, setter: setCheckFolderOnStart },
                      { label: "Auto Download de Imagens", active: autoDownload, setter: setAutoDownload }
                    ].map((opt, i) => (
                      <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                         <span className="text-[10px] font-black text-gray-400 uppercase">{opt.label}</span>
                         <button onClick={() => opt.setter(!opt.active)} className={`w-9 h-5 rounded-full relative transition-all ${opt.active ? 'bg-neon-cyan' : 'bg-white/10'}`}>
                           <motion.div animate={{ x: opt.active ? 18 : 2 }} className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-inner" />
                         </button>
                      </div>
                    ))}
                  </div>
              </div>

              {!whiskStatus.is_empty && (
                <div className="p-5 bg-red-400/5 border border-red-500/20 rounded-2xl flex items-center justify-between gap-4">
                   <div className="flex items-center gap-4">
                      <AlertTriangle className="text-red-500 w-6 h-6 animate-pulse" />
                      <div>
                        <p className="text-xs font-black text-white">CONTEÚDO DETECTADO</p>
                        <p className="text-[9px] text-red-400/60 uppercase">Contém {whiskStatus.file_count} arquivos na pasta</p>
                      </div>
                   </div>
                   <button onClick={handleClearFolder} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-[9px] uppercase rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center gap-2">
                     <Trash2 className="w-3.5 h-3.5" /> LIMPAR PASTA
                   </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
