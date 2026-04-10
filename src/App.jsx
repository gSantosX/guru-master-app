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
import { Cpu, Zap, Shield, Wand2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { PersistenceProvider } from './contexts/PersistenceContext';
import { Login } from './components/Login';
import InteractiveBackground from './components/InteractiveBackground';

const tabComponents = {
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
  'settings': SettingsTab
};

function AppContent() {
  const { isInitialized } = useSystemStatus();
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('create-script');
  const [theme, setTheme] = useState(localStorage.getItem('guru_theme') || 'neon');
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('guru_reduce_motion') === 'true');
  const [zoom, setZoom] = useState(Number(localStorage.getItem('guru_app_zoom')) || 1);
  const [fontSize, setFontSize] = useState(Number(localStorage.getItem('guru_app_font_size')) || 16);
  const [language, setLanguage] = useState(localStorage.getItem('guru_app_lang') || 'Português (BR)');

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
    const handleZoom = () => setZoom(Number(localStorage.getItem('guru_app_zoom')) || 1);
    const handleFontSize = () => setFontSize(Number(localStorage.getItem('guru_app_font_size')) || 16);
    const handleLanguage = () => setLanguage(localStorage.getItem('guru_app_lang') || 'Português (BR)');

    window.addEventListener('guru_theme_change', handleTheme);
    window.addEventListener('guru_motion_change', handleMotion);
    window.addEventListener('guru_zoom_change', handleZoom);
    window.addEventListener('guru_font_size_change', handleFontSize);
    window.addEventListener('guru_language_change', handleLanguage);

    return () => {
      window.removeEventListener('guru_theme_change', handleTheme);
      window.removeEventListener('guru_motion_change', handleMotion);
      window.removeEventListener('guru_zoom_change', handleZoom);
      window.removeEventListener('guru_font_size_change', handleFontSize);
      window.removeEventListener('guru_language_change', handleLanguage);
    };
  }, []);

  if (loading) return null;

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <div 
        className={`flex flex-col md:flex-row h-screen w-full bg-dark overflow-hidden font-sans theme-${theme} ${reduceMotion ? 'reduce-motion' : ''}`}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          width: `${100 / zoom}%`,
          height: `${100 / zoom}vh`,
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        
        <AnimatePresence>
          {!isInitialized && (
            <motion.div 
              key="splash"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 z-[100] bg-dark flex flex-col items-center justify-center"
            >
              <div className="relative mb-8">
                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-neon-purple via-neon-cyan to-blue-600 shadow-[0_0_40px_rgba(0,243,255,0.3)] flex items-center justify-center overflow-hidden border-2 border-white/20">
                  <img src="/logo.jpg" alt="Guru Master Logo" className="w-full h-full object-cover rounded-full" />
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
                Iniciando Sistemas Local...
              </motion.p>
            </motion.div>
          )}

          {!isAuthenticated && isInitialized && (
            <Login />
          )}
        </AnimatePresence>

        {/* Elite Interactive Background System */}
        <InteractiveBackground />

        {isAuthenticated && (
          <>
            <div className="premium-grain" />
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <main className="flex-1 relative z-10 overflow-hidden bg-transparent">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 p-6 md:p-10 lg:p-12 overflow-y-auto custom-scrollbar"
                >
                  <React.Suspense fallback={<div className="flex items-center justify-center h-full w-full"><div className="w-8 h-8 rounded-full border-b-2 border-neon-cyan animate-spin"></div></div>}>
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
