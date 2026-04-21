import React from 'react';
import { motion } from 'framer-motion';
import { 
  Layout, 
  Zap, 
  PenTool, 
  Image as ImageIcon, 
  Youtube, 
  Clock, 
  TrendingUp, 
  Activity, 
  Shield, 
  Infinity,
  ArrowRight,
  Sparkles,
  Search,
  Key
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { t } from '../utils/i18n';

export const DashboardTab = ({ setActiveTab }) => {
  const { user } = useAuth();
  const { status, configs, lastLatency, isHealthy, checkConnectivity } = useSystemStatus();
  
  const getDaysRemaining = () => {
    if (!user) return null;
    if (user.is_lifetime) return 'vitalicio';
    if (!user.expires_at) return null;
    const diffTime = new Date(user.expires_at) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysLeft = getDaysRemaining();
  const userName = user?.name?.split(' ')[0] || 'Usuário';

  const shortcuts = [
    { id: 'create-script',     label: t('sidebar.create_script'),     desc: t('dashboard.scripts_desc'),    icon: PenTool,   color: 'text-neon-cyan',   bg: 'bg-neon-cyan/10' },
    // { id: 'whisk',             label: t('sidebar.whisk'),             desc: t('dashboard.whisk_desc'),      icon: Zap,       color: 'text-neon-purple', bg: 'bg-neon-purple/10' },
    { id: 'capa-video',        label: t('sidebar.capa_video'),        desc: t('dashboard.capas_desc'),      icon: ImageIcon, color: 'text-neon-pink',   bg: 'bg-neon-pink/10' },
    { id: 'channel-monitoring',label: t('sidebar.channel_monitoring'),desc: t('dashboard.monitoring_desc'), icon: Youtube,   color: 'text-blue-400',    bg: 'bg-blue-400/10' },
    { id: 'channel-mining',    label: t('sidebar.channel_mining'),    desc: 'Encontre nichos promissores e canais em alta.', icon: Search,   color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 'niche-identifier',  label: 'Identificador de Nichos',      desc: 'Analise e valide ideias de conteúdo.',         icon: Activity, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  ];

  const activeAiKey = configs.active_ai?.toLowerCase() === 'openai' ? 'openai' : (configs.active_ai?.toLowerCase() || 'gemini');
  const engineOnline = status[activeAiKey] === 'online';

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col overflow-y-auto custom-scrollbar pb-20">
      <header className="mb-10 shrink-0">
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex items-center gap-4 mb-2"
        >
          <div className="p-3 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20">
            <Layout className="text-neon-cyan w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
              {t('dashboard.title')}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-8 h-1 bg-neon-cyan rounded-full"></span>
              <p className="text-xs md:text-sm text-gray-500 font-bold uppercase tracking-[0.2em]">
                {t('dashboard.subtitle')}
              </p>
            </div>
          </div>
        </motion.div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Welcome & Status Section */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles className="w-32 h-32 text-white" />
            </div>
            
            <div className="relative z-10">
              <h3 className="text-2xl md:text-4xl font-bold text-white mb-2">
                {t('dashboard.welcome')} <span className="text-neon-cyan underline decoration-white/20 underline-offset-8 decoration-4">{userName}!</span>
              </h3>
              <p className="text-gray-400 text-sm md:text-base max-w-xl leading-relaxed">
                Todas as ferramentas do ecossistema Guru Master estão prontas para elevar seu conteúdo. 
                O que vamos criar hoje?
              </p>
              
              <div className="mt-8 flex flex-wrap gap-4">
                <button 
                  onClick={() => setActiveTab('create-script')}
                  className="px-6 py-3 bg-neon-cyan text-dark font-black rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,243,255,0.3)] flex items-center gap-2"
                >
                  <PenTool className="w-4 h-4" /> Novo Projeto
                </button>
                <button 
                  onClick={() => setActiveTab('niche-identifier')}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <Search className="w-4 h-4" /> Explorar Nichos
                </button>
              </div>
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-transparent to-neon-purple/5 pointer-events-none" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="glass-card p-6 border-l-4 border-l-neon-purple translate-glow rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-neon-purple/20 rounded-lg">
                      <Clock className="w-5 h-5 text-neon-purple" />
                   </div>
                   <h4 className="text-white font-bold text-sm uppercase tracking-wider">Histórico Recente</h4>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 font-bold truncate">Nenhum projeto recente...</span>
                      <span className="text-[9px] text-gray-600">---</span>
                   </div>
                </div>
             </div>

             <div className="glass-card p-6 border-l-4 border-l-emerald-400 translate-glow rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-emerald-400/20 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                   </div>
                   <h4 className="text-white font-bold text-sm uppercase tracking-wider">Metas e Progresso</h4>
                </div>
                <div className="space-y-4">
                   <div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-bold">
                         <span>Capacidade Digital</span>
                         <span>85%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                         <div className="bg-emerald-400 h-full w-[85%] shadow-[0_0_10px_#34d399]" />
                      </div>
                   </div>
                   <p className="text-[9px] text-gray-500 italic">"Consistência é a chave do sucesso no YouTube."</p>
                </div>
             </div>
          </div>
        </div>

        {/* Plan & Sidebar Section */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.2 }}
             className="glass-card p-6 border border-white/10 relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
                 <Shield className="w-full h-full text-neon-cyan" />
              </div>
              
              <h4 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Shield className="w-4 h-4 text-neon-cyan" /> {t('dashboard.plan_status')}
              </h4>

              <div className="mb-6">
                <p className="text-xs text-gray-500 mb-1 font-bold">Assinatura Ativa</p>
                <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-black text-white">PRO MEMBER</span>
                   <span className="text-[10px] text-neon-cyan font-bold p-1 bg-neon-cyan/10 rounded border border-neon-cyan/20 animate-pulse">ACTIVE</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-dark/50 border border-white/5 mb-6">
                {daysLeft === 'vitalicio' ? (
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/20 rounded-lg">
                         <Infinity className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div>
                         <p className="text-white font-black text-sm">{t('dashboard.unlimited')}</p>
                         <p className="text-[10px] text-gray-500">Acesso eterno liberado.</p>
                      </div>
                   </div>
                ) : (
                   <div>
                      <div className="flex items-baseline gap-2 mb-2">
                         <span className="text-4xl font-black text-white">{daysLeft}</span>
                         <span className="text-xs text-gray-400 font-bold uppercase">{t('dashboard.remaining_days')}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 mb-2">
                         <div 
                           className={`h-full rounded-full transition-all duration-1000 ${daysLeft <= 5 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-neon-cyan shadow-[0_0_10px_#00f3ff]'}`}
                           style={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }}
                         />
                      </div>
                      <p className="text-[9px] text-gray-500 text-right font-mono uppercase">Expira em: {user?.expires_at ? new Date(user.expires_at).toLocaleDateString() : 'N/A'}</p>
                   </div>
                )}
              </div>

              <button 
                onClick={() => setActiveTab('settings')}
                className="w-full py-2.5 rounded-lg border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                Gerenciar Assinatura
              </button>
           </motion.div>

           {/* Status do Sistema — resumo simples */}
           <div 
             className={`glass-card p-6 bg-gradient-to-br transition-all duration-500 border-[1px] ${isHealthy ? 'from-neon-cyan/10 to-transparent border-white/5' : 'from-red-500/10 to-transparent border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]'}`}
           >
              <div className="flex items-center justify-between mb-4">
                 <h4 className="text-white font-black text-xs uppercase tracking-[0.1em]">Status do Sistema</h4>
                 <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-neon-cyan animate-pulse shadow-[0_0_10px_#00f3ff]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} />
              </div>

              <div className="space-y-4">
                 {/* Servidor */}
                 <div 
                   className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                   onClick={() => checkConnectivity()}
                 >
                    <Activity className={`w-4 h-4 ${isHealthy ? 'text-neon-cyan' : 'text-red-500'}`} />
                    <div>
                       <p className="text-[10px] text-white font-bold">
                          {isHealthy ? 'Operacional' : 'Anomalia Detectada'}
                       </p>
                       <p className="text-[9px] text-gray-500">
                         Latência: {status.rendering === 'online' ? `${lastLatency}ms` : '---'}
                       </p>
                    </div>
                 </div>

                 {/* Motor Neural */}
                 <div className="flex items-center gap-3">
                    <Zap className={`w-4 h-4 ${engineOnline ? 'text-neon-purple' : 'text-gray-600'}`} />
                    <div>
                       <p className="text-[10px] text-white font-bold">Motor Neural</p>
                       <p className="text-[9px] text-gray-500 truncate max-w-[150px]">
                          {configs.active_model || 'Aguardando...'}
                          <span className={`ml-1 text-[8px] uppercase font-bold ${engineOnline ? 'text-neon-cyan' : 'text-gray-600'}`}>
                            ({status[activeAiKey] || 'offline'})
                          </span>
                       </p>
                    </div>
                 </div>

                 {/* Hint para configurações */}
                 <button
                   onClick={() => setActiveTab('settings')}
                   className="flex items-center gap-2 pt-1 w-full text-left hover:opacity-80 transition-opacity"
                 >
                    <Key className="w-3 h-3 text-gray-600 shrink-0" />
                    <p className="text-[9px] text-gray-500 italic">
                       Ver status de todas as chaves em{' '}
                       <span className="text-neon-cyan font-bold not-italic">Configurações</span>
                    </p>
                 </button>

                 {!isHealthy && (
                   <div className="pt-1 border-t border-red-500/20">
                     <p className="text-[8px] text-red-400 font-bold uppercase tracking-widest animate-bounce">
                       Ação requerida na configuração
                     </p>
                   </div>
                 )}
              </div>
           </div>
        </div>

        {/* Shortcuts Grid */}
        <div className="lg:col-span-12 mt-4">
           <div className="flex items-center justify-between mb-6 px-1">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <ArrowRight className="w-5 h-5 text-neon-cyan" /> {t('dashboard.shortcuts')}
              </h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Acesso Direto</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shortcuts.map((item, idx) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + (idx * 0.05) }}
                  onClick={() => setActiveTab(item.id)}
                  className="glass-card p-6 text-left group hover:border-current transition-all duration-300 relative overflow-hidden"
                >
                  <div className={`p-3 w-fit rounded-xl ${item.bg} ${item.color} mb-4 group-hover:scale-110 transition-transform duration-500`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-white font-bold mb-1 group-hover:text-neon-cyan transition-colors">{item.label}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">{item.desc}</p>
                  
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform">
                    <ArrowRight className={`w-4 h-4 ${item.color}`} />
                  </div>
                </motion.button>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};
