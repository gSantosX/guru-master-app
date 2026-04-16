import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Shield, Zap, TrendingUp, Lock, XCircle, FastForward, Layers, PenTool, Image, ArrowRight, Target, Clock, Monitor, Sparkles, Terminal, CheckCircle2, Globe, Cpu, EyeOff, CheckCircle, ChevronDown, Mail, X } from 'lucide-react';
import { NativeCheckout } from '../components/NativeCheckout';

export const SalesLanding = ({ onLoginClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutStep, setCheckoutStep] = useState('email'); // 'email' | 'payment' | 'success'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const faqs = [
    {
      q: "O software funciona no macOS ou Mobile?",
      a: "No momento, o Guru Master é um App nativo focado em performance para Windows 10 e 11. Isso garante que o processamento de dados e IAs seja feito com a máxima velocidade do seu hardware."
    },
    {
      q: "Preciso aparecer nos vídeos?",
      a: "Não. O foco total são Canais Faceless (Sem Rosto). Todas as ferramentas foram desenhadas para que você crie conteúdo de altíssimo nível sem precisar ligar uma câmera."
    },
    {
      q: "O Guru Master garante resultados financeiros?",
      a: "Sendo honestos: nenhuma ferramenta garante dinheiro. O que o Guru Master garante é o suporte técnico de elite: pesquisa de dados real, roteirização científica e design de alta conversão. O seu sucesso depende da sua consistência usando essas ferramentas profissionais."
    },
    {
      q: "Como recebo o acesso?",
      a: "Imediatamente após a confirmação. Você define seu e-mail no checkout e ele será sua chave de entrada para baixar o software e começar sua operação."
    }
  ];

  return (
    <div className="absolute inset-0 z-50 w-full h-full overflow-y-auto overflow-x-hidden bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 selection:text-white custom-scrollbar">
      {/* Background Soft Mesh */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(34, 211, 238, 0.04), transparent 50%), radial-gradient(circle at 85% 30%, rgba(168, 85, 247, 0.04), transparent 50%)' }} />

      {/* HEADER NAVBAR */}
      <header className={`fixed top-0 w-full z-[100] transition-all duration-300 ${isScrolled ? 'bg-slate-950/80 border-b border-slate-800/50 backdrop-blur-xl py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 p-[1px] shadow-sm">
                <img src="/logo.jpg" alt="Guru Master Logo" className="w-full h-full rounded-xl object-cover" />
             </div>
             <span className="text-xl font-bold tracking-wide text-white group-hover:text-cyan-400 transition-colors">
               Guru Master
             </span>
          </div>
          
          <button 
            onClick={onLoginClick}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700 active:scale-95"
          >
            Acessar Plataforma
          </button>
        </div>
      </header>

      <main className="relative z-10 w-full flex flex-col items-center pt-16">
        
        {/* SESSÃO 1: HERO */}
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 px-6 flex flex-col items-center text-center w-full max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="w-full relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 text-xs font-semibold text-cyan-400 mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Ferramentas de Elite sem promessas mágicas
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 text-white text-balance">
               O suporte técnico para o seu<br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                 império no YouTube.
              </span>
            </h1>
            
            <p className="text-base md:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed mb-10 text-pretty">
               O Guru Master não é um botão mágico. É a inteligência que unifica pesquisa, roteirização cirúrgica e visuais cinematográficos. Diga adeus ao amadorismo e produza como um canal de elite.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mx-auto mt-4">
              <button 
                 onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
                 className="w-full sm:w-auto px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95"
              >
                 Acessar por R$ 24,90 <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                 onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                 className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 active:scale-95"
              >
                 Conhecer os Módulos
              </button>
            </div>
          </motion.div>
        </section>

        {/* TICKER TAPE BANNER */}
        <div className="w-full bg-slate-900 border-y border-slate-800 py-3 overflow-hidden flex items-center">
           <motion.div 
             animate={{ x: [0, -1035] }} 
             transition={{ ease: "linear", duration: 25, repeat: Infinity }}
             className="flex flex-nowrap whitespace-nowrap"
           >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                 <div key={i} className="flex items-center gap-10 px-5 text-slate-400 text-xs font-bold uppercase tracking-wider shrink-0">
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-500" /> PRODUTIVIDADE AUMENTADA</span>
                    <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-cyan-500" /> ORGANIZAÇÃO DE ROTINA</span>
                    <span className="flex items-center gap-2"><Cpu className="w-4 h-4 text-cyan-500" /> ASSISTENTE DE CRIAÇÃO</span>
                    <span className="flex items-center gap-2"><EyeOff className="w-4 h-4 text-cyan-500" /> TOTALMENTE SEM ROSTO</span>
                 </div>
              ))}
           </motion.div>
        </div>

        {/* SESSÃO 2: POR QUE O GURU MASTER? */}
        <section className="py-24 px-6 w-full max-w-5xl mx-auto border-b border-slate-800/50">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mb-16">
              <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">Honestidade acima de tudo</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Não é sorte, é suporte técnico.</h3>
              <p className="text-slate-400 mt-4 max-w-2xl mx-auto text-sm">O YouTube não é mais para amadores. Para vencer o algoritmo, você precisa de dados claros e ferramentas que acelerem sua escala sem comprometer a qualidade.</p>
           </motion.div>

           <div className="grid md:grid-cols-3 gap-6">
              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800">
                 <Shield className="w-8 h-8 text-cyan-400 mb-4" />
                 <h4 className="text-white font-bold mb-2">Credibilidade Real</h4>
                 <p className="text-slate-400 text-xs leading-relaxed">Desenvolvido por quem entende de canais faceless. Sem promessas falsas de ganhos rápidos.</p>
              </div>
              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800">
                 <Target className="w-8 h-8 text-purple-400 mb-4" />
                 <h4 className="text-white font-bold mb-2">Foco em Dados</h4>
                 <p className="text-slate-400 text-xs leading-relaxed">Decisões baseadas no que o algoritmo está entregando para a concorrência agora.</p>
              </div>
              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800">
                 <Zap className="w-8 h-8 text-indigo-400 mb-4" />
                 <h4 className="text-white font-bold mb-2">Escala Técnica</h4>
                 <p className="text-slate-400 text-xs leading-relaxed">Produza em 1 hora o que seus concorrentes levam 1 dia inteiro para fazer.</p>
              </div>
           </div>
        </section>

         {/* SESSÃO 3: ESTEIRA DE AUTOMAÇÃO */}
        <section id="features" className="py-24 px-6 w-full max-w-5xl mx-auto border-b border-slate-800/50">
           <div className="relative space-y-24">
              <div className="hidden md:block absolute left-1/2 top-10 bottom-10 w-px bg-slate-800 -translate-x-1/2"></div>

              {/* Step 1 - Monitoramento */}
              <div className="relative flex flex-col md:flex-row items-center gap-10">
                 <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-cyan-500 items-center justify-center z-10 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                 </div>
                 <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pr-16 text-center md:text-right">
                    <span className="inline-block text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full mb-4">Módulo 1</span>
                    <h4 className="text-xl font-bold text-white mb-3">Monitoramento de Tendências</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">Acompanhe seus canais favoritos e filtre o que está viralizando. Inteligência real para garantir que seu próximo vídeo tenha demanda.</p>
                 </motion.div>
                 <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pl-16">
                    <div className="relative rounded-2xl overflow-hidden border border-cyan-500/20 group">
                       <img src="/prints/screenshot_monitoramento.png" alt="Monitoramento" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                    </div>
                 </motion.div>
              </div>

              {/* Step 2 - Criar Roteiro */}
              <div className="relative flex flex-col md:flex-row-reverse items-center gap-10">
                 <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-purple-500 items-center justify-center z-10 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    <PenTool className="w-4 h-4 text-purple-400" />
                 </div>
                 <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pl-16 text-center md:text-left">
                    <span className="inline-block text-[10px] font-bold text-purple-400 uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full mb-4">Módulo 2</span>
                    <h4 className="text-xl font-bold text-white mb-3">Roteirização Cirúrgica</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">Scripts pensados para retenção. Nossa IA não apenas escreve, ela estrutura seu conteúdo para prender o espectador do início ao fim.</p>
                 </motion.div>
                 <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pr-16">
                    <div className="relative rounded-2xl overflow-hidden border border-purple-500/20 group">
                       <img src="/prints/screenshot_roteiro.png" alt="Roteiro" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                    </div>
                 </motion.div>
              </div>

              {/* Step 3 - Prompts */}
              <div className="relative flex flex-col md:flex-row items-center gap-10">
                 <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-indigo-500 items-center justify-center z-10 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                 </div>
                 <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pr-16 text-center md:text-right">
                    <span className="inline-block text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full mb-4">Módulo 3</span>
                    <h4 className="text-xl font-bold text-white mb-3">Engenharia de Prompts</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">Dê vida ao seu canal com visuais cinematográficos. Gere comandos precisos para IAs de imagem e garanta thumbnails e cenas de nível profissional.</p>
                 </motion.div>
                 <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pl-16">
                    <div className="relative rounded-2xl overflow-hidden border border-indigo-500/20 group">
                       <img src="/prints/screenshot_prompts.png" alt="Prompts" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                    </div>
                 </motion.div>
              </div>

              {/* Step 4 - Banco de Roteiros */}
              <div className="relative flex flex-col md:flex-row-reverse items-center gap-10">
                 <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-teal-500 items-center justify-center z-10 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                    <Layers className="w-4 h-4 text-teal-400" />
                 </div>
                 <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pl-16 text-center md:text-left">
                    <span className="inline-block text-[10px] font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full mb-4">Módulo 4</span>
                    <h4 className="text-xl font-bold text-white mb-3">Banco de Roteiros</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">Organize e recupere seus melhores scripts em segundos. Todo o seu histórico de produção organizado para escala e reutilização inteligente.</p>
                 </motion.div>
                 <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pr-16">
                    <div className="relative rounded-2xl overflow-hidden border border-teal-500/20 group">
                       <img src="/prints/screenshot_banco.png" alt="Banco" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                    </div>
                 </motion.div>
              </div>

              {/* Step 5 - Design Center */}
              <div className="relative flex flex-col md:flex-row items-center gap-10">
                 <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-pink-500 items-center justify-center z-10 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                    <Image className="w-4 h-4 text-pink-400" />
                 </div>
                 <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pr-16 text-center md:text-right">
                    <span className="inline-block text-[10px] font-bold text-pink-400 uppercase tracking-widest bg-pink-500/10 border border-pink-500/20 px-3 py-1 rounded-full mb-4">Módulo 5</span>
                    <h4 className="text-xl font-bold text-white mb-3">Design Center</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">Identidade visual que força o clique. Gere sugestões de capas (Thumbnails) com design focado em CTR para canais que crescem rápido.</p>
                 </motion.div>
                 <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pl-16">
                    <div className="relative rounded-2xl overflow-hidden border border-pink-500/20 group">
                       <img src="/prints/screenshot_capas.png" alt="Capas" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                    </div>
                 </motion.div>
              </div>
           </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-32 px-6 w-full relative overflow-hidden border-b border-slate-800">
           <div className="max-w-md mx-auto relative z-10">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative bg-slate-950 border border-slate-700/60 rounded-3xl p-10 shadow-2xl">
                  <div className="text-center mb-8">
                     <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-full mb-6 inline-block">Plano Criador</span>
                     <div className="flex items-start justify-center gap-1 mt-6">
                        <span className="text-lg font-medium text-slate-400 mt-3">R$</span>
                        <span className="text-8xl font-black tracking-tighter text-white leading-none">24,90</span>
                        <span className="text-sm font-medium text-slate-500 self-end mb-3">/mês</span>
                     </div>
                     <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                        Acesso completo ao software Guru Master.<br/>Sem pegadinhas, sem taxas ocultas.
                     </p>
                  </div>

                  <button 
                     onClick={() => setShowPaymentModal(true)}
                     className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-2xl font-black text-lg transition-all shadow-lg shadow-cyan-500/20 active:scale-95 mb-8"
                  >
                     Quero Começar Agora →
                  </button>

                  <ul className="space-y-4">
                     {[
                       'Monitoramento de Canais Virais',
                       'Engine de Roteiros com 20+ DNA',
                       'Gerador de Prompts Cinematográficos',
                       'Design Center (Sugestões de Capas)',
                       'Banco de Roteiros Organizado',
                       'Suporte Técnico Incluso'
                     ].map((item, i) => (
                       <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                          {item}
                       </li>
                     ))}
                  </ul>
              </motion.div>
           </div>
        </section>

        {/* FAQ */}
        <section className="py-24 px-6 w-full max-w-2xl mx-auto">
           <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-white">Perguntas Frequentes</h3>
           </div>
           
           <div className="space-y-4">
              {faqs.map((faq, idx) => (
                 <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors">
                    <button 
                       onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                       className="w-full p-5 text-left flex items-start justify-between focus:outline-none gap-4"
                    >
                       <span className="font-semibold text-sm text-slate-200">{faq.q}</span>
                       <ChevronDown className={`w-5 h-5 text-cyan-500 shrink-0 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === idx && (
                       <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">
                          {faq.a}
                       </p>
                    )}
                 </div>
              ))}
           </div>
        </section>

        {/* FOOTER */}
        <footer className="w-full border-t border-slate-800/50 py-12 px-6 text-center bg-slate-950">
           <p className="text-xs text-slate-600 mb-2">Guru Master &copy; {new Date().getFullYear()} - O Assistente Definitivo.</p>
           <p className="text-[10px] text-slate-500">Valor exclusivo: R$ 24,90 mensais.</p>
        </footer>
      </main>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 relative">
              <button onClick={() => setShowPaymentModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6"/></button>
              
              {checkoutStep === 'email' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Criar sua conta</h2>
                    <p className="text-slate-400 text-sm">O e-mail será sua chave de acesso.</p>
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={checkoutEmail}
                      onChange={(e) => setCheckoutEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-11 pr-4 py-4 text-white outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => { if (checkoutEmail.includes('@')) setCheckoutStep('payment'); }}
                    className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-2xl font-black text-base shadow-lg shadow-cyan-500/10"
                  >
                    Ir para Pagamento (R$ 24,90)
                  </button>
                </div>
              )}

              {checkoutStep === 'payment' && (
                <NativeCheckout userEmail={checkoutEmail} onVerificationSuccess={() => setShowPaymentModal(false)} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
