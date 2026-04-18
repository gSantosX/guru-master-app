import React, { useState } from 'react';
import { Settings, Key, Save, RefreshCw, CheckCircle2, AlertCircle, Cpu, Zap, Youtube, Globe, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';

export const SettingsPanel = () => {
  const { configs, updateConfig, status, checkConnectivity } = useSystemStatus();
  const [formData, setFormData] = useState({ ...configs });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSaveMessage({ text: '', type: '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await updateConfig(formData);
    setIsSaving(false);
    
    if (success) {
      setSaveMessage({ text: 'Configurações Salvas e Sincronizadas!', type: 'success' });
      setTimeout(() => setSaveMessage({ text: '', type: '' }), 3000);
    } else {
      setSaveMessage({ text: 'Erro ao salvar. Tente novamente.', type: 'error' });
    }
  };

  const ApiStatusBadge = ({ service }) => {
    const s = status[service.toLowerCase()];
    if (s === 'hidden') return null;
    
    return (
      <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border backdrop-blur-md
        ${s === 'online' ? 'bg-neon-cyan/10 border-neon-cyan/20 text-neon-cyan' : 
          s === 'quota' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 
          'bg-red-500/10 border-red-500/20 text-red-400'}
      `}>
        <div className={`w-1 h-1 rounded-full ${s === 'online' ? 'bg-neon-cyan' : s === 'quota' ? 'bg-orange-400' : 'bg-red-400'} animate-pulse`} />
        {s || 'offline'}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
            <Settings className="w-6 h-6 text-neon-cyan" />
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Centro de Comando & API</h2>
        </div>
        <p className="text-gray-400 font-medium">Configure suas chaves de inteligência para ativar o poder total do Guru Master Web.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-8 pb-20">
        {/* AI ENGINE CONFIG */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 blur-[80px] -z-10 group-hover:bg-neon-cyan/10 transition-all" />
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <Cpu className="w-5 h-5 text-neon-cyan" />
               <h3 className="text-sm font-black text-white uppercase tracking-widest">Motores de Inteligência</h3>
            </div>
            <button 
              type="button" 
              onClick={() => checkConnectivity()} 
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              title="Recarregar Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Gemini */}
            <div className="space-y-4">
               <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3 text-neon-cyan" /> Google Gemini Key
                     </label>
                     <ApiStatusBadge service="gemini" />
                  </div>
                  <div className="relative">
                     <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                     <input 
                       type="password" 
                       name="gemini_key" 
                       value={formData.gemini_key} 
                       onChange={handleChange}
                       placeholder="AIzaSy..." 
                       className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:border-neon-cyan transition-all"
                     />
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Seletor de Modelo Gemini</label>
                  <div className="relative">
                     <select 
                       name="gemini_model" 
                       value={formData.gemini_model} 
                       onChange={handleChange}
                       className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-4 text-xs font-bold text-white outline-none focus:border-neon-cyan transition-all appearance-none"
                     >
                        <option value="Gemini 3.1 Flash Lite (500 req/dia — MAIS ECONÔMICO)">⚡ Gemini 3.1 Flash Lite (500 req/dia — MAIS ECONÔMICO)</option>
                        <option value="Gemini 2.5 Flash (20 req/dia — PADRÃO RECOMENDADO)">🚀 Gemini 2.5 Flash (20 req/dia — PADRÃO RECOMENDADO)</option>
                        <option value="Gemini 2.5 Flash Lite (20 req/dia)">💡 Gemini 2.5 Flash Lite (20 req/dia)</option>
                     </select>
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                        <Settings className="w-4 h-4" />
                     </div>
                  </div>
               </div>
               
               <p className="px-1 text-[9px] text-gray-600 font-bold uppercase">Google Gemini — Gratuito ✅</p>
            </div>

            {/* OpenAI */}
            <div className="space-y-3">
               <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                     <Globe className="w-3 h-3 text-green-400" /> OpenAI GPT Key
                  </label>
                  <ApiStatusBadge service="openai" />
               </div>
               <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input 
                    type="password" 
                    name="gpt_key" 
                    value={formData.gpt_key} 
                    onChange={handleChange}
                    placeholder="sk-..." 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:border-green-400/50 transition-all"
                  />
               </div>
               <p className="px-1 text-[9px] text-gray-600 font-bold uppercase">Fallback para modelos o1-mini e gpt-4o</p>
            </div>

            {/* Grok */}
            <div className="space-y-3">
               <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                     <ShieldCheck className="w-3 h-3 text-neon-purple" /> xAI Grok Key
                  </label>
                  <ApiStatusBadge service="grok" />
               </div>
               <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input 
                    type="password" 
                    name="grok_key" 
                    value={formData.grok_key} 
                    onChange={handleChange}
                    placeholder="xai-..." 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:border-neon-purple transition-all"
                  />
               </div>
            </div>

            {/* AI Ativa */}
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Inteligência Padrão (Ativa)</label>
               <select 
                 name="active_ai" 
                 value={formData.active_ai} 
                 onChange={handleChange}
                 className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-4 text-sm text-white outline-none focus:border-neon-cyan transition-all appearance-none"
               >
                  <option value="Gemini">Google Gemini (Flash/Pro)</option>
                  <option value="OpenAI">OpenAI (o1/4o)</option>
                  <option value="Grok">xAI Grok (Beta)</option>
               </select>
            </div>
          </div>
        </div>

        {/* YOUTUBE MAPPING */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-8">
             <Youtube className="w-5 h-5 text-red-500" />
             <h3 className="text-sm font-black text-white uppercase tracking-widest">Mapeamento de Canais</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
               <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">YouTube Data API Key</label>
                  <ApiStatusBadge service="youtube" />
               </div>
               <input 
                 type="password" 
                 name="youtube_key" 
                 value={formData.youtube_key} 
                 onChange={handleChange}
                 className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-4 text-sm text-white outline-none focus:border-red-500/50 transition-all"
               />
               <p className="px-1 text-[9px] text-gray-600 font-bold uppercase">Necessário para Pesquisa de Nichos e Mineração</p>
            </div>
          </div>
        </div>

        {/* SAVE AREA */}
        <div className="flex items-center justify-between gap-6 pt-4">
           <AnimatePresence mode="wait">
             {saveMessage.text && (
               <motion.div 
                 initial={{ opacity: 0, x: -20 }} 
                 animate={{ opacity: 1, x: 0 }} 
                 exit={{ opacity: 0, x: 20 }}
                 className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${saveMessage.type === 'success' ? 'text-neon-cyan' : 'text-red-400'}`}
               >
                 {saveMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                 {saveMessage.text}
               </motion.div>
             )}
           </AnimatePresence>

           <button 
             type="submit" 
             disabled={isSaving}
             className="ml-auto flex items-center gap-3 bg-neon-cyan text-black px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-neon-cyan hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
           >
             {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
             Salvar Configurações
           </button>
        </div>
      </form>
    </motion.div>
  );
};
