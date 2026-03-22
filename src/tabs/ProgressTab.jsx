import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, XCircle, Loader2 } from 'lucide-react';

export const ProgressTab = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const loadSaved = () => {
       const saved = JSON.parse(localStorage.getItem('guru_active_renders') || '[]');
       setProjects(saved);
    };
    loadSaved();
    
    window.addEventListener('guru_active_updated', loadSaved);
    return () => window.removeEventListener('guru_active_updated', loadSaved);
  }, []);

  const saveProjects = (newProjects) => {
    setProjects(newProjects);
    localStorage.setItem('guru_active_renders', JSON.stringify(newProjects));
  };

  // Real FFMPEG progress tracking
  useEffect(() => {
    if (projects.length === 0) return;
    
    const interval = setInterval(async () => {
      let changed = false;
      const updatedPromises = projects.map(async (p) => {
        if (p.progress >= 100) return p;
        
        try {
           const res = await fetch(`http://localhost:5000/api/status/${p.id}`);
           if (res.ok) {
              const data = await res.json();
              if (data.progress !== p.progress || data.status !== p.status) {
                 changed = true;
                 return { ...p, progress: data.progress, status: data.status, result_file: data.result_file };
              }
           }
        } catch (err) {
           console.error("Falha ao checar status do job", p.id, err);
        }
        return p;
      });
      
      const updated = await Promise.all(updatedPromises);
        
      if (changed) {
         setProjects(() => {
           const stillActive = updated.filter(p => p.progress < 100);
           const newlyCompleted = updated.filter(p => p.progress >= 100);
           
           if (newlyCompleted.length > 0) {
              const completedDb = JSON.parse(localStorage.getItem('guru_completed_renders') || '[]');
              const newCompleted = [...newlyCompleted.map(p => ({
                 id: p.id,
                 name: p.name,
                 date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
              })), ...completedDb].slice(0, 6);
              localStorage.setItem('guru_completed_renders', JSON.stringify(newCompleted));
              window.dispatchEvent(new Event('guru_completed_updated'));
           }
           
           localStorage.setItem('guru_active_renders', JSON.stringify(stillActive));
           return stillActive;
         });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [projects]);

  const handleCancel = (id) => {
    const updated = projects.filter(p => p.id !== id);
    saveProjects(updated);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full md:h-full flex flex-col overflow-y-auto md:overflow-hidden">
      <header className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 md:gap-0 shrink-0">
        <div>
          <h2 className="text-2xl md:text-4xl font-bold text-glow-cyan text-white flex items-center gap-2 md:gap-3">
            <Activity className="text-neon-cyan w-8 h-8 md:w-10 md:h-10 shrink-0" />
            Projetos em Progresso
          </h2>
          <p className="text-sm md:text-base text-gray-400 mt-2">Máximo de 6 renderizações ativas monitoradas em tempo real.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-bold text-white">{projects.length} / 6</span> Slots Ativos
        </div>
      </header>

      <div className="flex-1">
        {projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 glass-card">
            <Loader2 className="w-16 h-16 text-gray-600 mb-4 animate-spin-slow" />
            <h3 className="text-xl font-medium text-white mb-2">Fila Vazia</h3>
            <p className="max-w-md text-center">Nenhum projeto está renderizando no momento. Vá para Gerar Vídeo para iniciar um novo pipeline.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-10">
            <AnimatePresence>
              {projects.map((project) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  key={project.id}
                  className="glass-card p-6 flex flex-col relative overflow-hidden h-48"
                >
                  {/* Background Progress Fill */}
                  <div 
                    className={`absolute bottom-0 left-0 h-1 bg-${project.color} transition-all duration-1000 ease-linear shadow-[0_0_10px_currentColor]`}
                    style={{ width: `${project.progress}%` }}
                  />
                  
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-bold text-white line-clamp-1 pr-4" title={project.name}>{project.name}</h3>
                    <button 
                      onClick={() => handleCancel(project.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                      title="Cancelar Renderização"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="mt-auto">
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-sm font-medium text-gray-400 flex items-center gap-2">
                         <Loader2 className="w-4 h-4 animate-spin" /> {project.status}
                       </span>
                       <span className={`text-sm font-bold text-${project.color}`}>{project.progress}%</span>
                    </div>
                    
                    {/* Bar */}
                    <div className="w-full bg-dark/80 rounded-full h-3 overflow-hidden border border-white/10 shadow-inner mt-1 relative">
                      <div 
                        className={`bg-${project.color} h-3 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_15px_currentColor] relative overflow-hidden`}
                        style={{ width: `${project.progress}%` }}
                      >
                         <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, 6 - projects.length) }).map((_, i) => (
               <div key={`empty-${i}`} className="glass-panel border-dashed border-2 flex items-center justify-center h-48 rounded-2xl opacity-50">
                  <span className="text-gray-500 font-medium">Slot Vazio</span>
               </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
