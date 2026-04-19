import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Download, Terminal, Settings, User, CreditCard, Bell, ChevronRight, PlayCircle, Star, Sparkles, Monitor } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { SettingsPanel } from '../components/SettingsPanel';
import { ViralHacker } from '../components/ViralHacker';

export const MemberPortal = ({ onLogout }) => {
  const { user } = useAuth();
  const { configs } = useSystemStatus();
  const [activeMenu, setActiveMenu] = useState('overview');
  const [selectedLanguage, setSelectedLanguage] = useState(null);

  const copyCommand = () => {
    navigator.clipboard.writeText('irm https://gurumaster.com/install.ps1 | iex');
    alert('Comando Criptografado Copiado para a Área de Transferência!');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-neon-cyan selection:text-dark">
      {/* Background Particles */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.03) 0%, transparent 60%)', backgroundSize: '100px 100px' }} />
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}></div>

      {/* Topbar */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl relative z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan p-[2px] shadow-[0_0_15px_rgba(0,243,255,0.3)]">
                 <img src="/logo.jpg" alt="Guru Master Logo" className="w-full h-full rounded-full object-cover" />
              </div>
              <span className="text-xl font-black tracking-widest uppercase text-white">Guru Master <span className="text-[10px] text-neon-cyan align-top ml-1">PORTAL</span></span>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-2 text-xs font-bold text-gray-400">
                 <Shield className="w-4 h-4 text-green-400" />
                 Licença Ativa
              </div>
              <div className="w-px h-6 bg-white/10 hidden md:block"></div>
              <button onClick={onLogout} className="text-xs font-black uppercase text-gray-500 hover:text-white transition-colors tracking-widest">Desconectar</button>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full relative z-10">
        {/* Sidebar Web */}
        <aside className="w-64 border-r border-white/5 bg-black/20 hidden md:block py-10 px-6">
           <nav className="space-y-2">
              <button onClick={() => setActiveMenu('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all tracking-widest ${activeMenu === 'overview' ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                 <Sparkles className="w-4 h-4" /> Visão Geral
              </button>
              <button onClick={() => setActiveMenu('engine')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all tracking-widest ${activeMenu === 'engine' ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                 <Download className="w-4 h-4" /> Download Engine
              </button>
              <button onClick={() => setActiveMenu('viral-hacker')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all tracking-widest ${activeMenu === 'viral-hacker' ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                 <Zap className="w-4 h-4" /> Viral Hacker
              </button>
              <button onClick={() => setActiveMenu('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all tracking-widest ${activeMenu === 'settings' ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                 <Settings className="w-4 h-4" /> Configurações
              </button>
              <button disabled className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-700 cursor-not-allowed">
                 <CreditCard className="w-4 h-4" /> Minha Assinatura
              </button>
           </nav>
        </aside>

        {/* Dynamic Area */}
        <main className="flex-1 p-6 md:p-12 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-4xl max-h-full">
            
            <div className="mb-12">
               <h1 className="text-3xl font-black text-white mb-2">Bem-vindo, {user?.email || 'Comandante'}.</h1>
               <p className="text-gray-400 font-medium">Este é o seu Centro de Comando Web. A partir daqui você baixa o cérebro da operação para a sua máquina.</p>
            </div>

            {activeMenu === 'overview' && (
              <div className="space-y-8">
                 {/* License Card */}
                 <div className="bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 p-[1px] rounded-3xl">
                    <div className="bg-black/90 p-8 rounded-[23px] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden backdrop-blur-xl">
                       <Shield className="absolute -right-8 -top-8 w-40 h-40 text-white/5 rotate-12 pointer-events-none" />
                       <div>
                          <div className="flex items-center gap-3 mb-2">
                             <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse"></div>
                             <span className="text-xs text-neon-cyan font-black uppercase tracking-widest">Status: Ativo</span>
                          </div>
                          <h3 className="text-2xl font-black text-white">Licença Dark Executive</h3>
                          <p className="text-sm text-gray-400 mt-1">Acesso garantido a todos os painéis e atualizações v3.1</p>
                       </div>
                       <button onClick={() => setActiveMenu('engine')} className="px-6 py-3 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl hover:scale-105 transition-transform flex items-center gap-2 z-10 w-full md:w-auto">
                          Acessar Inicializador <ChevronRight className="w-4 h-4" />
                       </button>
                    </div>
                 </div>

                 {/* Onboarding */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/5 p-8 rounded-3xl hover:border-white/10 transition-colors">
                       <PlayCircle className="w-8 h-8 text-orange-400 mb-6" />
                       <h4 className="text-lg font-black text-white mb-2">Comece por Aqui</h4>
                       <p className="text-sm text-gray-400 font-medium mb-6">Assista ao treinamento express de 10 minutos para entender como instalar e plugar suas chaves de API sem erros no Guru Master.</p>
                       <button className="text-neon-cyan text-xs font-bold uppercase tracking-widest hover:underline">Assistir Aula 01</button>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-8 rounded-3xl hover:border-white/10 transition-colors">
                       <Star className="w-8 h-8 text-yellow-400 mb-6" />
                       <h4 className="text-lg font-black text-white mb-2">Dúvidas Frequentes</h4>
                       <p className="text-sm text-gray-400 font-medium mb-6">Como o software roda sem consumir processador? Como criar APIs no Google Studio? Acesse o guia completo.</p>
                       <button className="text-neon-cyan text-xs font-bold uppercase tracking-widest hover:underline">Ler Manual</button>
                    </div>
                 </div>
              </div>
            )}

            {activeMenu === 'viral-hacker' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                 <ViralHacker 
                    configs={configs} 
                    selectedLanguage={selectedLanguage} 
                    setSelectedLanguage={setSelectedLanguage}
                    result={{ 
                      title: "Guru Master Web",
                      sections: {
                        countries: [
                          { name: 'Brasil', code: 'br', flag: '🇧🇷' },
                          { name: 'USA', code: 'us', flag: '🇺🇸' },
                          { name: 'Espanha', code: 'es', flag: '🇪🇸' }
                        ]
                      }
                    }}
                 />
              </motion.div>
            )}

            {activeMenu === 'settings' && (
               <SettingsPanel />
            )}

          </motion.div>
        </main>
      </div>
    </div>
  );
};
