import React, { useState } from 'react';
import { PenTool, FileText, Image as ImageIcon, Video, Activity, CheckCircle, Settings, RefreshCw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { id: 'create-script', label: 'Criar Roteiro', icon: PenTool, color: 'text-neon-cyan', shadow: 'shadow-neon-cyan' },
  { id: 'ready-scripts', label: 'Roteiros Prontos', icon: FileText, color: 'text-neon-cyan', shadow: 'shadow-neon-cyan' },
  { id: 'capa-video', label: 'Capa de Vídeo', icon: ImageIcon, color: 'text-neon-purple', shadow: 'shadow-neon-purple' },
  { id: 'image-prompts', label: 'Prompts de Imagem', icon: ImageIcon, color: 'text-neon-pink', shadow: 'shadow-neon-pink' },
  { id: 'generate-video', label: 'Gerar Vídeo', icon: Video, color: 'text-neon-purple', shadow: 'shadow-neon-purple' },
  { id: 'progress', label: 'Em Progresso', icon: Activity, color: 'text-neon-cyan', shadow: 'shadow-neon-cyan' },
  { id: 'completed', label: 'Concluídos', icon: CheckCircle, color: 'text-neon-pink', shadow: 'shadow-neon-pink' },
  { id: 'settings', label: 'Configurações', icon: Settings, color: 'text-gray-400', shadow: '' },
];

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/system/update', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.message);
        if (data.status === 'updated') {
           // Opcional: Recarregar a página se necessário, mas o aviso de reiniciar é melhor
        }
      } else {
        alert("Erro na atualização: " + (data.message || "Falha desconhecida"));
      }
    } catch (error) {
       console.error("Update error:", error);
       alert("Erro ao conectar com o serviço de atualização. Verifique se o backend está rodando.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="w-full md:w-64 h-auto md:h-full glass-panel flex flex-col md:flex-col p-2 md:p-4 flex-shrink-0 z-10 border-b md:border-b-0 border-white/10">
      <div className="hidden md:flex items-center gap-3 mb-10 px-2 mt-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center shadow-neon-purple">
          <Video className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-wider text-glow-cyan text-white">GURU MASTER</h1>
      </div>

      <nav className="flex-1 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 items-center md:items-stretch custom-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-auto md:w-full flex-shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all duration-300 relative group
                ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? item.color : 'group-hover:' + item.color} transition-colors duration-300`} />
              <span className="font-medium whitespace-nowrap text-sm md:text-base">{item.label}</span>
              
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className={`absolute left-0 w-1 h-8 bg-current rounded-r-full ${item.color} ${item.shadow}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="hidden md:block mt-auto px-4 py-4 border-t border-white/10">
        <button 
          onClick={handleUpdate}
          disabled={isUpdating}
          className="w-full flex items-center justify-center gap-2 py-3 mb-4 bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 hover:from-neon-cyan/30 hover:to-neon-purple/30 text-white rounded-xl transition-all border border-neon-cyan/30 hover:border-neon-cyan/60 text-sm font-bold shadow-[0_0_15px_rgba(0,243,255,0.15)] hover:shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:scale-[1.02]"
        >
          {isUpdating ? <Loader2 className="w-5 h-5 animate-spin text-neon-cyan" /> : <RefreshCw className="w-5 h-5 text-neon-cyan" />}
          {isUpdating ? 'Buscando...' : 'Atualizar Aplicativo'}
        </button>
        <p className="text-xs text-gray-500 font-medium text-center">Versão Atual: 1.0.0</p>
      </div>
    </div>
  );
};
