import React, { useState, useEffect } from 'react';
import { Settings, Key, Palette, HardDrive, Shield, CheckCircle, Cpu, AlertCircle, Info, Zap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';

export const SettingsTab = () => {
  const { status, configs, checkConnectivity, updateConfig } = useSystemStatus();
  
  const [geminiKey, setGeminiKey] = useState(configs.gemini_key);
  const [grokKey, setGrokKey] = useState(configs.grok_key);
  const [gptKey, setGptKey] = useState(configs.gpt_key);
  const [activeAi, setActiveAi] = useState(configs.active_ai);
  const [ffmpegPath, setFfmpegPath] = useState(configs.ffmpeg_path || 'ffmpeg');
  
  const [isSaved, setIsSaved] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('guru_theme') || 'neon');
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('guru_reduce_motion') === 'true');
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    setGeminiKey(configs.gemini_key);
    setGrokKey(configs.grok_key);
    setGptKey(configs.gpt_key);
    setActiveAi(configs.active_ai);
    setFfmpegPath(configs.ffmpeg_path || 'ffmpeg');
  }, [configs]);

  const handleSaveKeys = async () => {
    const success = await updateConfig({
      gemini_key: geminiKey,
      grok_key: grokKey,
      gpt_key: gptKey,
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

  const handleClearCache = () => {
    if (confirm("ATENÇÃO PERIGO: Isso excluirá TODOS os seus roteiros salvos e o histórico de projetos concluídos. Deseja continuar?")) {
      localStorage.removeItem('guru_scripts');
      localStorage.removeItem('guru_active_renders');
      localStorage.removeItem('guru_completed_renders');
      alert("Armazenamento e histórico limpos com sucesso!");
      window.dispatchEvent(new Event('guru_completed_updated'));
    }
  };

  const StatusItem = ({ label, status, icon: Icon, error }) => (
    <div className="p-3 bg-dark/40 rounded-xl border border-white/5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${status === 'online' ? 'text-green-400' : status === 'checking...' ? 'text-yellow-400 animate-pulse' : 'text-red-400'}`} />
          <span className="text-sm text-gray-300">{label}</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
          status === 'online' ? 'bg-green-500/20 text-green-400' : 
          status === 'checking...' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {status}
        </span>
      </div>
      {error && <p className="text-[10px] text-red-400/80 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-full flex flex-col overflow-y-auto custom-scrollbar pb-20">
      <header className="mb-6 md:mb-8 shrink-0">
        <h2 className="text-2xl md:text-4xl font-bold text-gray-200 flex items-center gap-2 md:gap-3">
          <Settings className="text-gray-400 w-8 h-8 md:w-10 md:h-10" />
          Configurações do Sistema
        </h2>
        <p className="text-sm md:text-base text-gray-400 mt-2">Configure motores de IA, cotas de armazenamento e aparência do sistema.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 flex-1">
        
        {/* Left Column */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Key className="text-neon-cyan w-5 h-5" /> Configurações de API
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Motor de IA Ativo</label>
                <div className="flex gap-2">
                  {['Gemini', 'GPT', 'Grok'].map(ai => (
                    <button
                      key={ai}
                      onClick={() => setActiveAi(ai)}
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
                <label className="text-sm font-medium text-gray-300 block mb-1">Chave API do Grok</label>
                <input 
                  type="password" 
                  value={grokKey}
                  onChange={(e) => setGrokKey(e.target.value)}
                  placeholder="xai-..."
                  className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">Chave Gemini Pro Vision</label>
                <input 
                  type="password" 
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">Chave API do GPT (OpenAI)</label>
                <input 
                  type="password" 
                  value={gptKey}
                  onChange={(e) => setGptKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-sm font-mono"
                />
              </div>
              <button 
                onClick={handleSaveKeys}
                className="w-full py-2 flex justify-center items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-medium transition-colors"
              >
                {isSaved ? <><CheckCircle className="w-4 h-4 text-green-400" /> Salvo com Sucesso</> : "Atualizar Chaves"}
              </button>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <HardDrive className="text-neon-purple w-5 h-5" /> Armazenamento (Local)
            </h3>
            
             <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">Espaço Usado</span>
                    <span className="text-neon-purple font-bold">4.2 GB / 20 GB</span>
                  </div>
                  <div className="w-full bg-dark bg-opacity-50 rounded-full h-2 overflow-hidden border border-white/5">
                    <div className="bg-neon-purple h-2 rounded-full shadow-[0_0_10px_#9d00ff]" style={{ width: '21%' }}></div>
                  </div>
               </div>
               
               <p className="text-xs text-gray-500">O armazenamento local contém dados de projetos temporários, legendas em cache e renderizações finais antes da exportação.</p>
               
               <button onClick={handleClearCache} className="text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors w-full shadow-lg">
                 Limpar Cache e Histórico de Projetos
               </button>
             </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Palette className="text-neon-pink w-5 h-5" /> Interface
            </h3>
            
            <div className="space-y-4">
               <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Modo de Tema</label>
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => handleThemeChange('neon')}
                     className={`py-3 text-xs font-medium rounded-xl transition-colors ${theme === 'neon' ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.2)]' : 'bg-dark/50 border border-white/10 text-gray-400 hover:bg-white/5'}`}
                   >Neon Tech</button>
                   <button 
                     onClick={() => handleThemeChange('minimal')}
                     className={`py-3 text-xs font-medium rounded-xl transition-colors ${theme === 'minimal' ? 'bg-white/10 border border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'bg-dark/50 border border-white/10 text-gray-400 hover:bg-white/5'}`}
                   >Esc. Minimalista</button>
                   <button 
                     onClick={() => handleThemeChange('light')}
                     className={`py-3 text-xs font-medium rounded-xl transition-colors ${theme === 'light' ? 'bg-blue-500/10 border border-blue-500 text-blue-400' : 'bg-dark/50 border border-white/10 text-gray-400 hover:bg-white/5'}`}
                   >Tema Claro</button>
                   <button 
                     onClick={() => handleThemeChange('soft')}
                     className={`py-3 text-xs font-medium rounded-xl transition-colors ${theme === 'soft' ? 'bg-purple-400/20 border border-purple-400 text-purple-300' : 'bg-dark/50 border border-white/10 text-gray-400 hover:bg-white/5'}`}
                   >Tema Suave</button>
                </div>
               </div>
               
               <div className="pt-2">
                 <div className="flex items-center justify-between p-3 bg-dark/50 rounded-xl">
                    <div>
                       <span className="text-sm text-gray-300 font-medium block">Reduzir Movimento</span>
                       <span className="text-xs text-gray-500">Desativar animações pesadas de hover</span>
                    </div>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none">
                       <input type="checkbox" onChange={handleMotionChange} checked={reduceMotion} id="motion" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark appearance-none cursor-pointer peer" />
                       <label htmlFor="motion" className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-700 cursor-pointer peer-checked:bg-neon-pink transition-colors"></label>
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
                      <h3 className="text-white font-bold">Status do Sistema</h3>
                      <p className="text-xs text-gray-500 font-mono">Diagnóstico em Tempo Real</p>
                  </div>
               </div>
               <button 
                 onClick={handleReconnect}
                 disabled={isReconnecting}
                 className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all ${isReconnecting ? 'rotate-180 opacity-50' : ''}`}
                 title="Reconectar e Testar Sistema"
               >
                 <RefreshCw className={`w-4 h-4 text-neon-cyan ${isReconnecting ? 'animate-spin' : ''}`} />
               </button>
            </div>

            <div className="space-y-3">
               <StatusItem 
                 label="Motor de Renderização" 
                 status={status.rendering} 
                 icon={Zap} 
                 error={status.rendering === 'offline' ? status.details.error : null}
               />
               
               <StatusItem 
                 label="FFmpeg da Máquina" 
                 status={status.ffmpeg} 
                 icon={Info} 
                 error={status.ffmpeg === 'offline' ? 'FFmpeg não encontrado ou erro de execução' : null}
               />

               <StatusItem 
                 label={`Conexão API (${configs.active_ai})`} 
                 status={status.api} 
                 icon={Shield} 
                 error={status.api === 'offline' ? 'Chave inválida ou erro de conexão' : null}
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
              <Shield className="text-gray-400 w-5 h-5" /> Sobre o Sistema
            </h3>
            <p className="text-sm text-gray-400 mb-4">GURU MASTER AI Pipeline v1.0.0</p>
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
