import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { Zap, Cpu, Shield, AlertTriangle, Check, Menu, X } from 'lucide-react';
import { lazyWithRetry } from '../utils/apiUtils';
import { useCloudStorage } from '../hooks/useCloudStorage';

// Lazy loading das abas migradas do aplicativo local usando retry resiliente
const ScriptTab = lazyWithRetry(() => import('../tabs/ScriptTab').then(m => ({ default: m.ScriptTab })));
const ReadyScriptsTab = lazyWithRetry(() => import('../tabs/ReadyScriptsTab').then(m => ({ default: m.ReadyScriptsTab })));
const ImagePromptsTab = lazyWithRetry(() => import('../tabs/ImagePromptsTab').then(m => ({ default: m.ImagePromptsTab })));
const SeoTab = lazyWithRetry(() => import('../tabs/SeoTab').then(m => ({ default: m.SeoTab })));
const VideoCoverTab = lazyWithRetry(() => import('../tabs/VideoCoverTab').then(m => ({ default: m.VideoCoverTab })));
const VideoTab = lazyWithRetry(() => import('../tabs/VideoTab').then(m => ({ default: m.VideoTab })));
const ProgressTab = lazyWithRetry(() => import('../tabs/ProgressTab').then(m => ({ default: m.ProgressTab })));
const CompletedTab = lazyWithRetry(() => import('../tabs/CompletedTab').then(m => ({ default: m.CompletedTab })));
const SettingsTab = lazyWithRetry(() => import('../tabs/SettingsTab').then(m => ({ default: m.SettingsTab })));
const ProfileTab = lazyWithRetry(() => import('../tabs/ProfileTab').then(m => ({ default: m.ProfileTab })));
const WhiskTab = lazyWithRetry(() => import('../tabs/WhiskTab').then(m => ({ default: m.WhiskTab })));
const ChannelMonitoringTab = lazyWithRetry(() => import('../tabs/ChannelMonitoringTab').then(m => ({ default: m.ChannelMonitoringTab })));
const ChannelModelerTab = lazyWithRetry(() => import('../tabs/ChannelModelerTab').then(m => ({ default: m.ChannelModelerTab })));
const ChannelMiningTab = lazyWithRetry(() => import('../tabs/ChannelMiningTab').then(m => ({ default: m.ChannelMiningTab })));
const NicheIdentifierTab = lazyWithRetry(() => import('../tabs/NicheIdentifierTab').then(m => ({ default: m.NicheIdentifierTab })));
const AdminTab = lazyWithRetry(() => import('../tabs/AdminTab').then(m => ({ default: m.AdminTab })));
const DashboardTab = lazyWithRetry(() => import('../tabs/DashboardTab').then(m => ({ default: m.DashboardTab })));
const HelpTab = lazyWithRetry(() => import('../tabs/HelpTab').then(m => ({ default: m.HelpTab })));

// Lista ordenada das abas — a ordem define a prioridade de carregamento
const tabComponents = [
  { id: 'dashboard',           Component: DashboardTab },
  { id: 'create-script',       Component: ScriptTab },
  { id: 'ready-scripts',       Component: ReadyScriptsTab },
  { id: 'image-prompts',       Component: ImagePromptsTab },
  { id: 'seo-upload',          Component: SeoTab },
  { id: 'capa-video',          Component: VideoCoverTab },
  { id: 'generate-video',      Component: VideoTab },
  { id: 'progress',            Component: ProgressTab },
  { id: 'completed',           Component: CompletedTab },
  { id: 'channel-monitoring',  Component: ChannelMonitoringTab },
  { id: 'channel-mining',      Component: ChannelMiningTab },
  { id: 'niche-identifier',    Component: NicheIdentifierTab },
  { id: 'channel-modeler',     Component: ChannelModelerTab },
  { id: 'whisk',               Component: WhiskTab },
  { id: 'profile',             Component: ProfileTab },
  { id: 'settings',            Component: SettingsTab },
  { id: 'admin',               Component: AdminTab },
  { id: 'help',                Component: HelpTab },
];

export const GuruMasterApp = () => {
  const { user, logout } = useAuth();
  const { isInitialized, toast } = useSystemStatus();
  const [activeTab, setActiveTab] = useState('dashboard');
  // Rastreia quais abas já foram visitadas (para lazy-mount: monta só na 1ª visita)
  const [mountedTabs, setMountedTabs] = useState(new Set(['dashboard']));
  
  const [appSettings] = useCloudStorage('app_settings', {
    theme: localStorage.getItem('guru_theme') || 'neon',
    reduceMotion: localStorage.getItem('guru_reduce_motion') === 'true',
    appFontSize: Number(localStorage.getItem('guru_app_font_size')) || 16
  });
  const theme = appSettings.theme;
  const reduceMotion = appSettings.reduceMotion;
  const fontSize = appSettings.appFontSize;
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fecha o menu mobile quando a aba muda
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  useEffect(() => {
    const applyThemeToRoot = () => {
      const currentTheme = localStorage.getItem('guru_theme') || 'neon';
      document.documentElement.className = `theme-${currentTheme}`;
    };
    applyThemeToRoot();
  }, [theme]);

  // Monta a aba no primeiro acesso, mas nunca a desmonta depois
  useEffect(() => {
    setMountedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 z-[400] bg-[#020203] flex flex-col items-center justify-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-neon-purple via-neon-cyan to-blue-600 shadow-[0_0_40px_rgba(34,211,238,0.3)] flex items-center justify-center overflow-hidden border-2 border-white/10">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
          </div>
        </div>
        <div className="flex gap-6 text-[8px] font-mono text-gray-600 uppercase tracking-[0.3em] font-black">
          <span className="flex items-center gap-2"><Zap className="w-3 h-3 text-neon-cyan" /> Core</span>
          <span className="flex items-center gap-2"><Cpu className="w-3 h-3 text-neon-purple" /> Neural</span>
          <span className="flex items-center gap-2"><Shield className="w-3 h-3 text-neon-pink" /> Secure</span>
        </div>
        <motion.p 
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-12 text-neon-cyan text-[10px] font-bold uppercase tracking-[0.3em]"
        >
          Sincronizando Guru Master Cloud...
        </motion.p>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full bg-[#020203] overflow-hidden font-sans theme-${theme} ${reduceMotion ? 'reduce-motion' : ''} flex-col md:flex-row`}>
      <div className="premium-grain" />

      {/* Mobile Header (Only visible on small screens) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-black/60 backdrop-blur-md border-b border-white/5 relative z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-black text-white text-lg tracking-tighter uppercase italic">Guru Master</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all shadow-lg active:scale-95"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      {/* Overlay para fechar o menu ao clicar fora */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[45]" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <main className="flex-1 relative z-10 overflow-hidden bg-transparent flex flex-col min-w-0">
        {/* Toast notification */}
        <AnimatePresence>
          {toast.visible && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className={`fixed top-6 left-1/2 -translate-x-1/2 z-[110] backdrop-blur-xl border rounded-2xl px-6 py-3 flex items-center gap-3 shadow-2xl transition-colors
                ${toast.type === 'success' ? 'bg-green-500/80 border-green-500/50 text-white' : 
                  toast.type === 'warning' ? 'bg-yellow-600/80 border-yellow-500/50 text-white' : 
                  toast.type === 'error' ? 'bg-red-600/80 border-red-500/50 text-white' :
                  'bg-neon-cyan/80 border-neon-cyan/50 text-dark'}
              `}
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                {toast.type === 'success' ? <Check className="w-4 h-4" /> : 
                 toast.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : 
                 toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                 <Zap className="w-4 h-4" />}
              </div>
              <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/*
          KEEP-ALIVE TAB RENDERING:
          Todas as abas ficam montadas após a 1ª visita.
          A troca de aba usa apenas CSS (opacity + pointer-events) — nenhum processo é interrompido.
        */}
        {tabComponents.map(({ id, Component }) => {
          const isActive = id === activeTab;
          const isMounted = mountedTabs.has(id);

          // Ainda não foi visitada — não renderiza nada (economiza memória)
          if (!isMounted) return null;

          return (
            <div
              key={id}
              aria-hidden={!isActive}
              style={{
                position: 'absolute',
                inset: 0,
                overflowY: 'auto',
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
                transition: 'opacity 0.3s ease',
                zIndex: isActive ? 10 : 1,
              }}
              className="custom-scrollbar p-4 md:p-8"
            >
              <Suspense fallback={
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest animate-pulse">Carregando Módulo...</span>
                  </div>
                </div>
              }>
                <Component
                  setActiveTab={setActiveTab}
                  isActive={isActive}
                />
              </Suspense>
            </div>
          );
        })}
      </main>
    </div>
  );
};

