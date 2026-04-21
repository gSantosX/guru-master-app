import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { Zap, Cpu, Shield, AlertTriangle, Check } from 'lucide-react';

// Lazy loading das abas migradas do aplicativo local
const ScriptTab = React.lazy(() => import('../tabs/ScriptTab').then(m => ({ default: m.ScriptTab })));
const ReadyScriptsTab = React.lazy(() => import('../tabs/ReadyScriptsTab').then(m => ({ default: m.ReadyScriptsTab })));
const ImagePromptsTab = React.lazy(() => import('../tabs/ImagePromptsTab').then(m => ({ default: m.ImagePromptsTab })));
const VideoCoverTab = React.lazy(() => import('../tabs/VideoCoverTab').then(m => ({ default: m.VideoCoverTab })));
const VideoTab = React.lazy(() => import('../tabs/VideoTab').then(m => ({ default: m.VideoTab })));
const ProgressTab = React.lazy(() => import('../tabs/ProgressTab').then(m => ({ default: m.ProgressTab })));
const CompletedTab = React.lazy(() => import('../tabs/CompletedTab').then(m => ({ default: m.CompletedTab })));
const SettingsTab = React.lazy(() => import('../tabs/SettingsTab').then(m => ({ default: m.SettingsTab })));
const ProfileTab = React.lazy(() => import('../tabs/ProfileTab').then(m => ({ default: m.ProfileTab })));
const WhiskTab = React.lazy(() => import('../tabs/WhiskTab').then(m => ({ default: m.WhiskTab })));
const ChannelMonitoringTab = React.lazy(() => import('../tabs/ChannelMonitoringTab').then(m => ({ default: m.ChannelMonitoringTab })));
const ChannelModelerTab = React.lazy(() => import('../tabs/ChannelModelerTab').then(m => ({ default: m.ChannelModelerTab })));
const ChannelMiningTab = React.lazy(() => import('../tabs/ChannelMiningTab').then(m => ({ default: m.ChannelMiningTab })));
const NicheIdentifierTab = React.lazy(() => import('../tabs/NicheIdentifierTab').then(m => ({ default: m.NicheIdentifierTab })));
const AdminTab = React.lazy(() => import('../tabs/AdminTab').then(m => ({ default: m.AdminTab })));
const DashboardTab = React.lazy(() => import('../tabs/DashboardTab').then(m => ({ default: m.DashboardTab })));
const HelpTab = React.lazy(() => import('../tabs/HelpTab').then(m => ({ default: m.HelpTab })));

const tabComponents = {
  'dashboard': DashboardTab,
  'create-script': ScriptTab,
  'ready-scripts': ReadyScriptsTab,
  'capa-video': VideoCoverTab,
  'image-prompts': ImagePromptsTab,
  'generate-video': VideoTab,
  'progress': ProgressTab,
  'completed': CompletedTab,
  'profile': ProfileTab,
  'whisk': WhiskTab,
  'channel-monitoring': ChannelMonitoringTab,
  'channel-mining': ChannelMiningTab,
  'niche-identifier': NicheIdentifierTab,
  'channel-modeler': ChannelModelerTab,
  'admin': AdminTab,
  'help': HelpTab,
  'settings': SettingsTab
};

export const GuruMasterApp = () => {
  const { user, logout } = useAuth();
  const { isInitialized, toast } = useSystemStatus();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme] = useState(localStorage.getItem('guru_theme') || 'neon');
  const [reduceMotion] = useState(localStorage.getItem('guru_reduce_motion') === 'true');
  const [fontSize] = useState(Number(localStorage.getItem('guru_app_font_size')) || 16);

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
    <div className={`flex h-screen w-full bg-[#020203] overflow-hidden font-sans theme-${theme} ${reduceMotion ? 'reduce-motion' : ''} flex-row`}>
      <div className="premium-grain" />
      
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 relative z-10 overflow-hidden bg-transparent">
        <AnimatePresence>
          {toast.visible && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className={`fixed top-6 left-1/2 -translate-x-1/2 z-[110] backdrop-blur-xl border rounded-2xl px-6 py-3 flex items-center gap-3 shadow-2xl transition-colors
                ${toast.type === 'success' ? 'bg-green-500/80 border-green-500/50 text-white' : 
                  toast.type === 'warning' ? 'bg-yellow-600/80 border-yellow-500/50 text-white' : 
                  'bg-neon-cyan/80 border-neon-cyan/50 text-dark'}
              `}
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                {toast.type === 'success' ? <Check className="w-4 h-4" /> : 
                 toast.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : 
                 <Zap className="w-4 h-4" />}
              </div>
              <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 p-6 md:p-10 lg:p-12 overflow-y-auto custom-scrollbar"
          >
            <Suspense fallback={
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest animate-pulse">Carregando Módulo...</span>
                </div>
              </div>
            }>
               {React.createElement(tabComponents[activeTab] || ScriptTab, { 
                 setActiveTab, 
                 isActive: true 
               })}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
