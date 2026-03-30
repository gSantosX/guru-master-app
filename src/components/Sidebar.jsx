import React, { useState, useEffect } from 'react';
import { PenTool, FileText, Image as ImageIcon, Video, Activity, CheckCircle, Settings, RefreshCw, User, Zap, Youtube, Clock } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { motion } from 'framer-motion';
import { resolveApiUrl } from '../utils/apiUtils';
import { t } from '../utils/i18n';

const getNavItems = () => [
  { id: 'channel-monitoring', label: t('sidebar.channel_monitoring'), icon: Youtube, color: 'text-neon-cyan', shadow: 'shadow-neon-cyan' },
  { id: 'create-script', label: t('sidebar.create_script'), icon: PenTool, color: 'text-neon-cyan', shadow: 'shadow-neon-cyan' },
  { id: 'ready-scripts', label: t('sidebar.ready_scripts'), icon: FileText, color: 'text-neon-cyan', shadow: 'shadow-neon-cyan' },
  { id: 'image-prompts', label: t('sidebar.image_prompts'), icon: ImageIcon, color: 'text-neon-pink', shadow: 'shadow-neon-pink' },
  { id: 'whisk', label: t('sidebar.whisk'), icon: Zap, color: 'text-neon-cyan', shadow: 'shadow-neon-cyan' },
  { id: 'generate-video', label: t('sidebar.generate_video'), icon: Video, color: 'text-neon-purple', shadow: 'shadow-neon-purple' },
  { id: 'progress', label: t('sidebar.progress'), icon: Clock, color: 'text-neon-cyan', shadow: 'shadow-neon-cyan' },
  { id: 'completed', label: t('sidebar.completed'), icon: CheckCircle, color: 'text-neon-pink', shadow: 'shadow-neon-pink' },
  { id: 'capa-video', label: t('sidebar.capa_video'), icon: ImageIcon, color: 'text-neon-purple', shadow: 'shadow-neon-purple' },
  { id: 'profile', label: t('sidebar.profile'), icon: User, color: 'text-neon-cyan', shadow: 'shadow-neon-cyan' },
  { id: 'channel-mining', label: t('sidebar.channel_mining'), icon: Youtube, color: 'text-neon-cyan', shadow: 'shadow-neon-cyan' },
  { id: 'channel-modeler', label: t('sidebar.modelador_canais'), icon: Youtube, color: 'text-neon-cyan', shadow: 'shadow-neon-cyan' },
  { id: 'settings', label: t('sidebar.settings'), icon: Settings, color: 'text-gray-400', shadow: '' },
];

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: localStorage.getItem('guru_user_name') || 'Usuário Guru',
    avatar: localStorage.getItem('guru_user_avatar') || null
  });

  useEffect(() => {
    const handleProfileChange = () => {
      setUserProfile({
        name: localStorage.getItem('guru_user_name') || 'Usuário Guru',
        avatar: localStorage.getItem('guru_user_avatar') || null
      });
    };
    window.addEventListener('guru_profile_change', handleProfileChange);
    return () => window.removeEventListener('guru_profile_change', handleProfileChange);
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(resolveApiUrl('/api/update'), { method: 'POST' });
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
    <div className="w-full md:w-64 h-auto md:h-full glass-panel flex flex-col md:flex-col p-2 md:p-4 flex-shrink-0 z-10 border-b md:border-b-0 border-white/10 md:rounded-xl shadow-2xl">
      <div className="hidden md:flex flex-col items-center justify-center mb-12 px-2 mt-8 space-y-4">
        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-neon-purple via-neon-cyan to-blue-600 shadow-[0_0_50px_rgba(0,243,255,0.45),inset_0_0_25px_rgba(255,255,255,0.25)] transform transition-transform hover:scale-110 duration-500 overflow-hidden border-[3px] border-white/10 relative group">
          <div className="absolute inset-0 bg-neon-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"></div>
          <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-full shadow-2xl relative z-10" />
        </div>
        <div className="w-16 h-1 bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent rounded-full opacity-50 shadow-[0_0_10px_rgba(0,243,255,0.2)]"></div>
      </div>

      <nav className="flex-1 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 items-center md:items-stretch custom-scrollbar">
        {getNavItems().map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-auto md:w-full flex-shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2 md:py-2.5 rounded-xl transition-all duration-300 relative group overflow-hidden
                ${isActive ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <div className={`transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                <Icon className={`w-4 h-4 ${isActive ? item.color : 'text-gray-500 group-hover:' + item.color} transition-colors duration-300`} />
              </div>
              <span className={`font-bold whitespace-nowrap text-sm md:text-[14px] tracking-tight transition-all duration-300 ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                {item.label}
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className={`absolute left-0 w-1 h-5 bg-current rounded-r-full ${item.color} ${item.shadow} shadow-[0_0_15px_currentColor]`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              <div className={`absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
            </button>
          );
        })}
      </nav>

      <div className="hidden md:block mt-auto px-3 py-3 border-t border-white/5 bg-black/20">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`w-full flex items-center gap-2.5 p-2.5 mb-3 rounded-xl border transition-all group relative overflow-hidden
            ${activeTab === 'profile' 
              ? 'bg-neon-cyan/10 border-neon-cyan/20 shadow-[0_0_15px_rgba(0,243,255,0.05)]' 
              : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/5'
            }
          `}
        >
          <div className="w-9 h-9 rounded-full border border-white/10 overflow-hidden bg-dark flex items-center justify-center shrink-0 shadow-lg group-hover:border-neon-cyan/50 transition-all duration-500">
            {userProfile.avatar ? (
              <img src={userProfile.avatar} alt="User" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div className="flex-1 text-left overflow-hidden">
            <p className="text-xs font-black text-white truncate group-hover:text-neon-cyan transition-colors">{userProfile.name}</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{t('sidebar.pro_member')}</p>
          </div>
          <div className="absolute right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-1 rounded-full bg-neon-cyan shadow-[0_0_8px_#00f3ff]" />
          </div>
        </button>

        <button 
          onClick={handleUpdate}
          disabled={isUpdating}
          className="w-full flex items-center justify-center gap-2 py-3 mb-2 bg-dark-lighter border border-white/5 hover:bg-white/5 text-gray-500 hover:text-white rounded-lg transition-all text-[9px] font-black uppercase tracking-widest"
        >
          {isUpdating ? <LoadingSpinner size="xs" message="" /> : <RefreshCw className="w-3 h-3" />}
          {isUpdating ? t('sidebar.wait') : t('sidebar.check_update')}
        </button>
        <p className="text-[8px] text-gray-700 font-black text-center uppercase tracking-[0.2em]">{t('sidebar.version')}</p>
      </div>
    </div>
  );
};
