// Vercel Force Build - Author Fix
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
const ScriptTab = React.lazy(() => import('./tabs/ScriptTab').then(m => ({ default: m.ScriptTab })));
const ReadyScriptsTab = React.lazy(() => import('./tabs/ReadyScriptsTab').then(m => ({ default: m.ReadyScriptsTab })));
const ImagePromptsTab = React.lazy(() => import('./tabs/ImagePromptsTab').then(m => ({ default: m.ImagePromptsTab })));
const VideoCoverTab = React.lazy(() => import('./tabs/VideoCoverTab').then(m => ({ default: m.VideoCoverTab })));
const VideoTab = React.lazy(() => import('./tabs/VideoTab').then(m => ({ default: m.VideoTab })));
const ProgressTab = React.lazy(() => import('./tabs/ProgressTab').then(m => ({ default: m.ProgressTab })));
const CompletedTab = React.lazy(() => import('./tabs/CompletedTab').then(m => ({ default: m.CompletedTab })));
const SettingsTab = React.lazy(() => import('./tabs/SettingsTab').then(m => ({ default: m.SettingsTab })));
const ProfileTab = React.lazy(() => import('./tabs/ProfileTab').then(m => ({ default: m.ProfileTab })));
const WhiskTab = React.lazy(() => import('./tabs/WhiskTab').then(m => ({ default: m.WhiskTab })));
const ChannelMonitoringTab = React.lazy(() => import('./tabs/ChannelMonitoringTab').then(m => ({ default: m.ChannelMonitoringTab })));
const ChannelModelerTab = React.lazy(() => import('./tabs/ChannelModelerTab').then(m => ({ default: m.ChannelModelerTab })));
const ChannelMiningTab = React.lazy(() => import('./tabs/ChannelMiningTab').then(m => ({ default: m.ChannelMiningTab })));
const NicheIdentifierTab = React.lazy(() => import('./tabs/NicheIdentifierTab').then(m => ({ default: m.NicheIdentifierTab })));
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { SystemStatusProvider, useSystemStatus } from './contexts/SystemStatusContext';
import { Cpu, Zap, Shield, Wand2, AlertTriangle, Check, Menu, X } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { PersistenceProvider } from './contexts/PersistenceContext';
import { Login } from './components/Login';
import InteractiveBackground from './components/InteractiveBackground';

const AdminTab = React.lazy(() => import('./tabs/AdminTab').then(m => ({ default: m.AdminTab })));
const ResetPassword = React.lazy(() => import('./components/ResetPassword').then(m => ({ default: m.ResetPassword })));

const tabComponents = {
  'dashboard': ScriptTab, // Map dashboard to ScriptTab for now or a dedicated DashboardTab
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
  'settings': SettingsTab
};

function AppContent() {
  const { isInitialized, toast } = useSystemStatus();
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('create-script');
  const [theme, setTheme] = useState(localStorage.getItem('guru_theme') || 'neon');
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('guru_reduce_motion') === 'true');
  const [fontSize, setFontSize] = useState(Number(localStorage.getItem('guru_app_font_size')) || 16);
  const [language, setLanguage] = useState(localStorage.getItem('guru_app_lang') || 'Português (BR)');
  const [updateStatus, setUpdateStatus] = useState({ available: false, progress: 0, downloaded: false, version: '' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onUpdateAvailable((version) => {
        setUpdateStatus(prev => ({ ...prev, available: true, version }));
      });
      window.electronAPI.onUpdateProgress((percent) => {
        setUpdateStatus(prev => ({ ...prev, progress: percent }));
      });
      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateStatus(prev => ({ ...prev, available: false, downloaded: true }));
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  useEffect(() => {
    const applyThemeToRoot = () => {
      const currentTheme = localStorage.getItem('guru_theme') || 'neon';
      document.documentElement.className = `theme-${currentTheme}`;
    };

    applyThemeToRoot();

    const handleTheme = () => {
      setTheme(localStorage.getItem('guru_theme') || 'neon');
      applyThemeToRoot();
    };
    const handleMotion = () => setReduceMotion(localStorage.getItem('guru_reduce_motion') === 'true');
    const handleFontSize = () => setFontSize(Number(localStorage.getItem('guru_app_font_size')) || 16);
    const handleLanguage = () => setLanguage(localStorage.getItem('guru_app_lang') || 'Português (BR)');

    window.addEventListener('guru_theme_change', handleTheme);
    window.addEventListener('guru_motion_change', handleMotion);
    window.addEventListener('guru_font_size_change', handleFontSize);
    window.addEventListener('guru_language_change', handleLanguage);

    return () => {
      window.removeEventListener('guru_theme_change', handleTheme);
      window.removeEventListener('guru_motion_change', handleMotion);
      window.removeEventListener('guru_font_size_change', handleFontSize);
      window.removeEventListener('guru_language_change', handleLanguage);
    };
  }, []);

  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (loading) return null;

  const isResettingPassword = currentHash.startsWith('#reset-password');

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <div 
        className={`flex h-screen w-full bg-dark overflow-hidden font-sans theme-${theme} ${reduceMotion ? 'reduce-motion' : ''} flex-col md:flex-row`}
      >
        
        <AnimatePresence>
          {!isInitialized && (
            <motion.div 
              key="splash"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 z-[400] bg-dark flex flex-col items-center justify-center"
            >
              <div className="relative mb-8">
                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-neon-purple via-neon-cyan to-blue-600 shadow-[0_0_40px_rgba(0,243,255,0.3)] flex items-center justify-center overflow-hidden border-2 border-white/20">
                  <img src="logo.jpg" alt="Guru Master Logo" className="w-full h-full object-cover rounded-full" />
                </div>
              </div>
              <div className="flex gap-6 text-[10px] font-mono text-gray-500 uppercase tracking-[0.3em] font-black">
                <span className="flex items-center gap-2"><Zap className="w-3 h-3 text-neon-cyan" /> Engine</span>
                <span className="flex items-center gap-2"><Cpu className="w-3 h-3 text-neon-purple" /> Render</span>
                <span className="flex items-center gap-2"><Shield className="w-3 h-3 text-neon-pink" /> Security</span>
              </div>
              <motion.p 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mt-12 text-neon-cyan text-sm font-bold uppercase tracking-[0.3em]"
              >
                Iniciando Guru Master AI...
              </motion.p>
            </motion.div>
          )}

          {!isAuthenticated && isInitialized && (
            isResettingPassword ? (
               <React.Suspense fallback={null}>
                  <ResetPassword onClose={() => window.location.hash = ''} />
               </React.Suspense>
            ) : (
               <Login isAppContext={true} /> 
            )
          )}
        </AnimatePresence>

        {/* Elite Interactive Background System */}
        <InteractiveBackground />

        {isAuthenticated && (
          <>
            <div className="premium-grain" />

            {/* Mobile Header (Only visible on small screens) */}
            <div className="md:hidden flex items-center justify-between p-4 bg-black/60 backdrop-blur-md border-b border-white/5 relative z-[60]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  <img src="logo.jpg" alt="Logo" className="w-full h-full object-cover" />
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
              {/* Notificação de Atualização Elite */}
              <AnimatePresence>
                {updateStatus.available && (
                  <motion.div 
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-dark/80 backdrop-blur-xl border border-neon-cyan/30 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-[0_0_30px_rgba(0,243,255,0.15)]"
                  >
                    <div className="w-10 h-10 rounded-full bg-neon-cyan/10 flex items-center justify-center animate-pulse">
                      <Zap className="w-5 h-5 text-neon-cyan" />
                    </div>
                    <div>
                      <h4 className="text-white text-xs font-black uppercase tracking-widest">Melhorando o App...</h4>
                      <p className="text-gray-400 text-[10px] mt-0.5">Baixando versão {updateStatus.version}: {Math.round(updateStatus.progress)}%</p>
                    </div>
                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden ml-4">
                      <motion.div 
                        className="h-full bg-neon-cyan shadow-[0_0_10px_#00f3ff]"
                        initial={{ width: 0 }}
                        animate={{ width: `${updateStatus.progress}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toast Notification System */}
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
                  <React.Suspense fallback={<div className="flex h-full items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" /></div>}>
                     {React.createElement(tabComponents[activeTab], { 
                       setActiveTab, 
                       isActive: true 
                     })}
                  </React.Suspense>
                </motion.div>
              </AnimatePresence>
            </main>
          </>
        )}
      </div>
    </MotionConfig>
  );
}

function App() {
  return (
    <GlobalErrorBoundary>
      <SystemStatusProvider>
        <AuthProvider>
          <PersistenceProvider>
            <AppContent />
          </PersistenceProvider>
        </AuthProvider>
      </SystemStatusProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
