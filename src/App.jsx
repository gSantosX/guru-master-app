import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ScriptTab } from './tabs/ScriptTab';
import { ReadyScriptsTab } from './tabs/ReadyScriptsTab';
import { ImagePromptsTab } from './tabs/ImagePromptsTab';
import { VideoTab } from './tabs/VideoTab';
import { ProgressTab } from './tabs/ProgressTab';
import { CompletedTab } from './tabs/CompletedTab';
import { SettingsTab } from './tabs/SettingsTab';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { useSystemStatus } from './contexts/SystemStatusContext';
import { Cpu, Zap, Shield, Wand2 } from 'lucide-react';

const tabComponents = {
  'create-script': ScriptTab,
  'ready-scripts': ReadyScriptsTab,
  'image-prompts': ImagePromptsTab,
  'generate-video': VideoTab,
  'progress': ProgressTab,
  'completed': CompletedTab,
  'settings': SettingsTab
};

function App() {
  const { isInitialized, status } = useSystemStatus();
  const [activeTab, setActiveTab] = useState('create-script');
  const [theme, setTheme] = useState(localStorage.getItem('guru_theme') || 'neon');
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('guru_reduce_motion') === 'true');

  useEffect(() => {
    const handleTheme = () => setTheme(localStorage.getItem('guru_theme') || 'neon');
    const handleMotion = () => setReduceMotion(localStorage.getItem('guru_reduce_motion') === 'true');
    window.addEventListener('guru_theme_change', handleTheme);
    window.addEventListener('guru_motion_change', handleMotion);
    return () => {
      window.removeEventListener('guru_theme_change', handleTheme);
      window.removeEventListener('guru_motion_change', handleMotion);
    };
  }, []);

  const ActiveComponent = tabComponents[activeTab];

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <div className={`flex flex-col md:flex-row h-screen w-full bg-dark overflow-hidden font-sans theme-${theme}`}>
        
        <AnimatePresence>
          {!isInitialized && (
            <motion.div 
              key="splash"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 z-[100] bg-dark flex flex-col items-center justify-center"
            >
              <div className="relative mb-8">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-32 h-32 border-2 border-neon-cyan/20 border-t-neon-cyan rounded-full"
                />
                <Wand2 className="w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-neon-cyan drop-shadow-[0_0_15px_rgba(0,243,255,1)]" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-widest mb-4">GURU MASTER <span className="text-neon-cyan">AI</span></h1>
              <div className="flex gap-6 text-xs font-mono text-gray-500 uppercase tracking-widest">
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
        </AnimatePresence>

        {/* Dynamic Animated Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neon-cyan/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-neon-purple/5 rounded-full blur-[150px]" />
        </div>

        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 relative z-10 overflow-hidden bg-transparent">
          {Object.entries(tabComponents).map(([key, Component]) => {
            const isActive = activeTab === key;
            return (
              <motion.div
                key={key}
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0,
                  scale: isActive ? 1 : 0.98,
                  filter: isActive ? "blur(0px)" : "blur(4px)",
                  zIndex: isActive ? 10 : 0
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={`absolute inset-0 overflow-y-auto custom-scrollbar ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
              >
                <Component />
              </motion.div>
            );
          })}
        </main>
      </div>
    </MotionConfig>
  );
}

export default App;
