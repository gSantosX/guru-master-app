import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Zap, Tag, LogIn, LogOut, HelpCircle } from 'lucide-react';

export const FloatingNav = ({ onLoginClick, isAuthenticated, onLogout }) => {
  const [active, setActive] = useState('inicio');
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);

  // Scroll container tracking for active section
  useEffect(() => {
    const container = document.getElementById('sales-scroll-container');
    if (!container) return;

    const handleScroll = () => {
      const y = container.scrollTop;
      setLastY(y);

      // Update active section based on scroll position
      const sections = ['pricing', 'features', 'faq'];
      let current = 'inicio';
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.5) current = id;
        }
      }
      setActive(current);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [lastY]);

  const scrollTo = (id) => {
    const container = document.getElementById('sales-scroll-container');
    const el = document.getElementById(id);
    if (el && container) {
      const top = el.offsetTop - 100;
      container.scrollTo({ top, behavior: 'smooth' });
    } else if (id === 'top' && container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navItems = [
    { id: 'top', label: 'Início', icon: Home, scroll: true },
    { id: 'features', label: 'Recursos', icon: Zap, scroll: true },
    { id: 'pricing', label: 'Planos', icon: Tag, scroll: true },
    { id: 'faq', label: 'FAQ', icon: HelpCircle, scroll: true },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0, x: '-50%' }}
        animate={{ y: 0, opacity: 1, x: '-50%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-4 md:top-6 left-1/2 z-[300] w-[95%] sm:w-auto"
      >
        <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl px-2 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* Logo Section */}
          <div className="flex items-center gap-2 px-2 md:px-3 md:mr-2 border-r border-white/10 shrink-0">
             <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 p-[1px]">
                <img src="/logo.jpg" alt="Guru Master" className="w-full h-full rounded-lg object-cover" />
             </div>
             <span className="text-[10px] md:text-sm font-black text-white uppercase tracking-tighter hidden sm:block">Guru Master</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-center sm:justify-start overflow-x-auto no-scrollbar">
            {navItems.map(({ id, label, icon: Icon, scroll }) => {
              const isActive = active === id || (id === 'top' && active === 'inicio');
              return (
                <button
                  key={id}
                  onClick={() => scroll ? scrollTo(id) : null}
                  className={`flex flex-col items-center gap-1 px-3 md:px-5 py-2 rounded-xl transition-all group shrink-0 ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110 ${isActive ? 'drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]' : ''}`} />
                  <span className="text-[9px] md:text-[11px] font-bold tracking-wide hidden md:block">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Divider & Auth */}
          <div className="flex items-center gap-1 sm:gap-2 border-l border-white/10 pl-1 md:pl-2 ml-1">
            {isAuthenticated ? (
              <button
                onClick={onLogout}
                className="flex flex-col items-center gap-1 px-3 md:px-5 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all group shrink-0"
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110" />
                <span className="text-[9px] md:text-[11px] font-bold tracking-wide hidden md:block">Sair</span>
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex flex-col items-center gap-1 px-3 md:px-5 py-2 rounded-xl bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 hover:text-cyan-300 border border-cyan-500/20 transition-all group shrink-0"
              >
                <LogIn className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110" />
                <span className="text-[9px] md:text-[11px] font-bold tracking-wide hidden md:block">Acessar</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
