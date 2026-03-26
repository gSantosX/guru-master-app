import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Download, Play, Trash2, Archive } from 'lucide-react';
import { resolveApiUrl } from '../utils/apiUtils';

export const CompletedTab = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const loadProjects = () => {
       const saved = JSON.parse(localStorage.getItem('guru_completed_renders') || '[]');
       setProjects(saved);
    };
    loadProjects();
    
    window.addEventListener('guru_completed_updated', loadProjects);
    return () => window.removeEventListener('guru_completed_updated', loadProjects);
  }, []);

  const saveProjects = (newProjects) => {
    setProjects(newProjects);
    localStorage.setItem('guru_completed_renders', JSON.stringify(newProjects));
  };

  const handleDelete = (id) => {
    saveProjects(projects.filter(p => p.id !== id));
  };

  const handleDownload = async (id) => {
    try {
      const response = await fetch(resolveApiUrl(`/api/download/${id}`));
      if (!response.ok) {
        let errorMsg = 'Arquivo não encontrado no servidor.';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
          if (errorData.requested_id) {
            console.error("DEBUG Download:", errorData);
          }
        } catch (e) {}
        alert(`Erro ao baixar: ${errorMsg}`);
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Tentar pegar o nome do arquivo do cabeçalho ou usar um padrão
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `video_pronto_${new Date().getTime()}.mp4`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        fileName = contentDisposition.split('filename=')[1].split(';')[0].replace(/"/g, '');
      }
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Erro no download:", err);
      alert("Erro de conexão com o servidor de download.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full md:h-full flex flex-col overflow-y-auto md:overflow-hidden custom-scrollbar">
      <header className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 md:gap-0 shrink-0">
        <div>
          <h2 className="text-2xl md:text-4xl font-bold text-glow-pink text-white flex items-center gap-2 md:gap-3">
            <CheckCircle className="text-neon-pink w-8 h-8 md:w-10 md:h-10 shrink-0" />
            Projetos Concluídos
          </h2>
          <p className="text-sm md:text-base text-gray-400 mt-2">Máximo de 6 projetos finalizados armazenados localmente.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-bold text-white">{projects.length} / 6</span> Armazenados
        </div>
      </header>

      <div className="flex-1">
        {projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 glass-card">
            <Archive className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Nenhum Projeto Concluído</h3>
            <p>Seus vídeos finalizados aparecerão aqui prontos para transmissão.</p>
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
                  transition={{ duration: 0.2 }}
                  key={project.id}
                  className="glass-card flex flex-col overflow-hidden h-64 group"
                >
                  <div className="h-32 bg-dark-lighter relative overflow-hidden flex items-center justify-center border-b border-white/5">
                    {/* Mock thumbnail */}
                    <div className="absolute inset-0 bg-gradient-to-t from-dark to-transparent z-0 opacity-50" />
                    <Play className="w-12 h-12 text-white/40 group-hover:text-neon-pink transition-colors z-10 cursor-pointer hover:scale-110" />
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <h3 className="text-white font-bold text-sm line-clamp-1 group-hover:text-neon-pink transition-colors">{project.name}</h3>
                         <p className="text-xs text-gray-500 mt-1">{project.date}</p>
                       </div>
                    </div>
                    
                    <div className="mt-auto flex gap-2">
                      <button 
                         onClick={() => handleDownload(project.id)}
                         className="flex-1 py-2 bg-gradient-to-r from-neon-pink/20 to-neon-purple/20 hover:from-neon-pink/40 hover:to-neon-purple/40 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all"
                      >
                         <Download className="w-4 h-4" /> Baixar
                      </button>
                      <button 
                         onClick={() => handleDelete(project.id)}
                         className="p-2 bg-dark-lighter border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                         title="Excluir Projeto"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
