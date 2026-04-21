import React from 'react';
import { motion } from 'framer-motion';
import { 
  HelpCircle, 
  Mail, 
  PlayCircle, 
  ExternalLink, 
  Zap, 
  Shield, 
  MessageSquare,
  FileText
} from 'lucide-react';
import { t } from '../utils/i18n';

export const HelpTab = () => {
  const tutorialVideos = [
    {
      id: 'use-app',
      title: t('help.how_to_use'),
      desc: t('help.how_to_use_desc'),
      duration: '12:45',
      url: '#' // Placeholder for future video link
    },
    {
      id: 'connect-api',
      title: t('help.connect_api'),
      desc: t('help.connect_api_desc'),
      duration: '08:30',
      url: '#' // Placeholder for future video link
    }
  ];

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col overflow-y-auto custom-scrollbar pb-20">
      <header className="mb-10 shrink-0">
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex items-center gap-4 mb-2"
        >
          <div className="p-3 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20">
            <HelpCircle className="text-neon-cyan w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
              {t('help.title')}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">
              {t('help.subtitle')}
            </p>
          </div>
        </motion.div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Support Section */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-8 border-l-4 border-l-neon-cyan relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-neon-cyan/20 rounded-lg">
                  <Mail className="w-6 h-6 text-neon-cyan" />
                </div>
                <h3 className="text-xl font-bold text-white">{t('help.contact_support')}</h3>
              </div>
              
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                {t('help.contact_desc')}
              </p>
              
              <a 
                href={`mailto:${t('help.email_support')}`}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-neon-cyan/50 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-500 group-hover:text-neon-cyan" />
                  <span className="text-xs md:text-sm font-bold text-gray-300 group-hover:text-white truncate">{t('help.email_support')}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-neon-cyan" />
              </a>

              <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                 <div className="text-center p-4">
                    <p className="text-2xl font-black text-white">24h</p>
                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Resposta VIP</p>
                 </div>
                 <div className="text-center p-4">
                    <p className="text-2xl font-black text-white">7/7</p>
                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Disponibilidade</p>
                 </div>
              </div>
            </div>
            
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-neon-cyan/5 blur-3xl rounded-full" />
          </motion.div>

          <div className="glass-card p-6 border border-white/5 bg-gradient-to-br from-white/5 to-transparent">
             <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-neon-purple" />
                <h4 className="text-white font-bold text-sm uppercase tracking-wider">Garantia Guru Master</h4>
             </div>
             <p className="text-[11px] text-gray-500 leading-relaxed">
                Sua satisfação e o sucesso do seu canal são nossa prioridade. Se encontrar bugs técnicos, nossa equipe de engenharia atuará em até 48h.
             </p>
          </div>
        </div>

        {/* Video Tutorials Section */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <PlayCircle className="text-neon-cyan w-6 h-6" />
              {t('help.tutorials')}
            </h3>
            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Vídeos Aulas</span>
          </div>

          <div className="space-y-4">
            {tutorialVideos.map((video, idx) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="glass-card group overflow-hidden border border-white/5 hover:border-neon-cyan/30 transition-all"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Thumbnail Placeholder */}
                  <div className="w-full md:w-48 h-32 bg-dark/80 relative flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-white/5">
                    <PlayCircle className="w-10 h-10 text-white/20 group-hover:text-neon-cyan group-hover:scale-110 transition-all duration-500 z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[9px] text-gray-400 font-mono font-bold border border-white/10">
                      {video.duration}
                    </div>
                  </div>
                  
                  <div className="flex-1 p-6 flex flex-col justify-center">
                    <h4 className="text-white font-bold mb-1 group-hover:text-neon-cyan transition-colors">{video.title}</h4>
                    <p className="text-xs text-gray-500 mb-4">{video.desc}</p>
                    
                    <button className="w-fit flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neon-cyan hover:text-white transition-colors">
                      {t('help.watch_video')} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Additional Resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
             <div className="p-4 rounded-xl border border-white/5 bg-white/5 flex items-center gap-3 hover:bg-white/10 cursor-pointer transition-all">
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="text-xs font-bold text-gray-300">Documentação PDF</span>
             </div>
             <div className="p-4 rounded-xl border border-white/5 bg-white/5 flex items-center gap-3 hover:bg-white/10 cursor-pointer transition-all">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                <span className="text-xs font-bold text-gray-300">Comunidade Discord</span>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// Internal icon for tutorial list
function ArrowRight({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}
