import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Settings, Layout, Download, FileText, AlertTriangle, CheckCircle, Trash2, Zap, Image as ImageIcon } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { resolveApiUrl } from '../utils/apiUtils';
import { t } from '../utils/i18n';

export const WhiskTab = ({ isActive }) => {
  const [activeSubTab, setActiveSubTab] = useState('control'); // 'control', 'settings'
  const [prompts, setPrompts] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [imageCount, setImageCount] = useState(1);
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
      case 'done': return <CheckCircle className="w-4 h-4 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" />;
      case 'processing': return <LoadingSpinner size="xs" message="" />;
      default: return <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="w-4 h-4 border border-white/20 rounded-full flex items-center justify-center text-[10px] text-gray-600">⌛</motion.div>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-neon-cyan to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,243,255,0.3)] overflow-hidden border border-white/10">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-widest uppercase">
              {t('whisk.title')}
            </h2>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">{t('whisk.subtitle')}</p>
          </div>
        </div>
      </header>

      {/* Tabs Layout & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex gap-2">
          {[
            { id: 'control', label: t('whisk.tab_control'), icon: Layout },
            { id: 'settings', label: t('whisk.tab_settings'), icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all border
                ${activeSubTab === tab.id 
                  ? 'bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan shadow-[0_0_15px_rgba(0,243,255,0.1)]' 
                  : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleStart}
            disabled={isRunning || !prompts}
            className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-3 rounded-xl font-black text-sm transition-all relative overflow-hidden group
              ${isRunning || !prompts 
                ? 'bg-gray-800 text-gray-600 grayscale cursor-not-allowed opacity-50' 
                : 'bg-gradient-to-r from-neon-cyan to-blue-600 text-white shadow-[0_0_30px_rgba(0,243,255,0.25)] hover:scale-[1.05] active:scale-[0.95]'
              }
            `}
          >
            <Play className={`w-4 h-4 ${!isRunning && prompts ? 'fill-current animate-pulse' : 'fill-current'}`} /> 
            {t('whisk.btn_start')}
            {!isRunning && prompts && (
               <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-[10px] animate-bounce">PRONTO</span>
            )}
          </button>
          
          <button 
            onClick={handleStop}
            disabled={!isRunning}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-sm border transition-all
              ${!isRunning 
                ? 'bg-transparent border-white/5 text-gray-800 pointer-events-none opacity-0' 
                : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
              }
            `}
          >
            <Square className="w-4 h-4 fill-current" /> {t('whisk.btn_stop')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar glass-card p-6 min-h-0">
        <AnimatePresence mode="wait">
          {activeSubTab === 'control' && (
            <motion.div
              key="control"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                   <FileText className="w-4 h-4 text-neon-cyan" /> {t('whisk.prompt_list')}
                </h3>
                <div className="flex gap-3">
                   <select className="bg-dark/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-neon-cyan/50">
                      <option>{t('whisk.starting_mode')}</option>
                   </select>
                   <label className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs text-white font-bold cursor-pointer flex items-center gap-2 transition-colors">
                      <Download className="w-3 h-3" /> {t('whisk.import_file')}
                      <input type="file" className="hidden" onChange={handleFileUpload} />
                   </label>
                </div>
              </div>


              <textarea
                value={prompts}
                onChange={(e) => setPrompts(e.target.value)}
                placeholder={t('whisk.prompt_placeholder')}
                className="w-full h-48 bg-dark/40 border border-white/10 rounded-2xl p-4 text-gray-300 focus:outline-none focus:border-neon-cyan/40 resize-none font-mono text-sm leading-relaxed"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">{t('whisk.aspect_ratio')}</label>
                  <select 
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full bg-dark/50 border border-white/10 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-neon-cyan/50"
                  >
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                    <option value="1:1">1:1</option>
                    <option value="4:3">4:3</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">{t('whisk.image_count')}</label>
                  <select 
                    value={imageCount}
                    onChange={(e) => setImageCount(Number(e.target.value))}
                    className="w-full bg-dark/50 border border-white/10 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-neon-cyan/50"
                  >
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block invisible">Extra</label>
                  <button className="w-full bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl text-xs font-black text-gray-400 flex items-center justify-center gap-2">
                    <ImageIcon className="w-4 h-4 text-neon-purple" /> {t('whisk.reference_images')} <span className="px-2 py-0.5 bg-dark rounded-md text-[10px]">0</span>
                  </button>
                </div>
              </div>


              <div className="mt-8 p-4 bg-dark/50 border border-white/5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    {isRunning ? <LoadingSpinner size="xs" message="" /> : <div className="w-2 h-2 rounded-full bg-gray-600" />}
                    <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">{status}</span>
                  </div>
                  <div className="flex items-center gap-2 border-l border-white/10 pl-6">
                    <div className={`w-2 h-2 rounded-full ${extensionActive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${extensionActive ? 'text-green-500' : 'text-red-500'}`}>
                       EXTENSÃO: {extensionActive ? 'CONECTADA' : 'DESCONECTADA'}
                    </span>
                  </div>
                </div>
                {isRunning && (
                  <div className="text-[10px] font-mono text-neon-cyan">
                     QUEUE: {whiskStatus.queue_count} PROMPTS REMAINING
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeSubTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="border-b border-white/10 pb-4">
                 <h3 className="text-xl font-black text-white">{t('whisk.folder_config')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">{t('whisk.folder_path')}</label>
                    <div className="flex gap-2">
                       <div className="flex-1 p-3 bg-dark/50 border border-white/10 rounded-xl text-gray-400 font-mono text-xs break-all flex items-center">
                          {whiskStatus.path}
                       </div>
                       <button 
                         onClick={handleSelectFolder}
                         className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-black text-xs uppercase transition-all flex items-center gap-2 group"
                       >
                         <Layout className="w-4 h-4 text-neon-cyan group-hover:scale-110 transition-transform" />
                         Alterar
                       </button>
                    </div>
                 </div>

                 <div className="flex flex-col justify-end gap-4 flex-1">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 h-[50px]">
                       <div>
                          <p className="text-sm font-black text-white">{t('whisk.check_folder')}</p>
                          <p className="text-[10px] text-gray-500">{t('whisk.check_folder_hint')}</p>
                       </div>
                       <button 
                         onClick={() => setCheckFolderOnStart(!checkFolderOnStart)}
                         className={`w-12 h-6 rounded-full transition-all relative ${checkFolderOnStart ? 'bg-neon-purple shadow-[0_0_10px_#bf40ff]' : 'bg-gray-700'}`}
                       >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${checkFolderOnStart ? 'left-7' : 'left-1'}`} />
                       </button>
                    </div>
                 </div>
              </div>

              {!whiskStatus.is_empty && (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl">
                   <div className="flex items-center gap-4 mb-4">
                      <AlertTriangle className="text-red-500 w-8 h-8" />
                      <div>
                         <p className="text-white font-black">{t('whisk.folder_exists_error')}</p>
                         <p className="text-red-400/70 text-xs">Existem {whiskStatus.file_count} arquivos na pasta.</p>
                      </div>
                   </div>
                   <button 
                     onClick={handleClearFolder}
                     className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2"
                   >
                      <Trash2 className="w-4 h-4" /> {t('whisk.clear_folder')}
                   </button>
                </div>
              )}

              {whiskStatus.is_empty && (
                <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-4 text-green-400 font-bold">
                   <CheckCircle className="w-6 h-6" />
                   {t('whisk.status_ready')} - Pasta de downloads vazia e pronta.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Visual Queue Table */}
      {promptQueue.length > 0 && (
        <div className="mt-8 shrink-0 flex flex-col min-h-0">
           {/* Progress Bar Header */}
           <div className="mb-6 space-y-2">
              <div className="flex justify-between items-end px-1">
                 <span className="text-[10px] font-black text-neon-purple uppercase tracking-[0.2em]">{status}</span>
                 <div className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                    {promptQueue.filter(p => p.status === 'done').length} / {promptQueue.length} {t('whisk.ready').toUpperCase()}
                 </div>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                 <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(promptQueue.filter(p => p.status === 'done').length / promptQueue.length) * 100}%` }}
                    className="h-full bg-gradient-to-r from-neon-purple via-neon-cyan to-blue-500 rounded-full shadow-[0_0_10px_rgba(191,64,255,0.5)]"
                 />
              </div>
           </div>

           <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                 <Layout className="w-3 h-3" /> Fila Visual
              </h3>
              <div className="flex gap-4 text-[10px] font-bold">
                 <span className="flex items-center gap-1 text-green-500/60 font-black uppercase tracking-tighter"><CheckCircle className="w-3 h-3" /> {t('whisk.ready')}</span>
                 <span className="flex items-center gap-1 text-neon-cyan/60 font-black uppercase tracking-tighter"><LoadingSpinner size="xs" /> {t('whisk.status_running')}</span>
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar bg-dark/30 border border-white/5 rounded-2xl shadow-inner max-h-64">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-dark/80 backdrop-blur-md border-b border-white/5 z-10">
                    <tr>
                       <th className="p-4 text-[10px] font-black text-neon-cyan uppercase tracking-tighter w-12 text-center">#</th>
                       <th className="p-4 text-[10px] font-black text-neon-cyan uppercase tracking-tighter">Prompt</th>
                       <th className="p-4 text-[10px] font-black text-neon-cyan uppercase tracking-tighter w-20 text-center">IMG 1</th>
                       <th className="p-4 text-[10px] font-black text-neon-cyan uppercase tracking-tighter w-12 text-center">TT</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/[0.02]">
                    {promptQueue.map((p, idx) => (
                       <tr key={p.id} className={`group hover:bg-white/[0.02] transition-colors ${p.status === 'processing' ? 'bg-neon-cyan/10' : ''}`}>
                          <td className="p-4 text-xs font-mono text-gray-600 text-center">{idx + 1}</td>
                          <td className="p-4 text-xs text-gray-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[350px]">
                             <div className="line-clamp-1 group-hover:line-clamp-none transition-all duration-300">
                                {p.text}
                             </div>
                          </td>
                          <td className="p-4 text-center">
                             <div className={`w-12 h-8 mx-auto rounded-lg border border-dashed flex items-center justify-center transition-all
                                ${p.status === 'done' ? 'bg-green-500/10 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-dark/50 border-white/10'}
                             `}>
                                {p.status === 'done' ? (
                                   <ImageIcon className="w-4 h-4 text-green-500" />
                                ) : (
                                   <span className="text-[10px] text-gray-700 font-mono">...</span>
                                )}
                             </div>
                          </td>
                          <td className="p-4 text-center">
                             <div className="flex justify-center">
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
    </div>
  );
};
