import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Shield, Zap, TrendingUp, Lock, XCircle, FastForward, Layers, PenTool, Image, ArrowRight, Target, Clock, Monitor, Sparkles, Terminal, CheckCircle2, Globe, Cpu, EyeOff, CheckCircle, ChevronDown, Mail, X } from 'lucide-react';
import { NativeCheckout } from '../components/NativeCheckout';

export const SalesLanding = ({ onLoginClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [activeModule, setActiveModule] = useState(0);
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

  const features = [
    {
      title: "Pesquisa de Nichos Simplificada",
      icon: <Globe className="w-6 h-6 text-cyan-400" />,
      desc: "Economize horas de pesquisa. O app analisa dados do YouTube e aponta tendências em canais sem rosto (faceless) para você focar apenas no que tem demanda comprovada."
    },
    {
      title: "Modelagem de Estrutura",
      icon: <Target className="w-6 h-6 text-purple-400" />,
      desc: "Entenda o que funciona. Nossa IA lê a estrutura de canais consolidados e sugere melhorias para você agregar mais valor e retenção ao seu conteúdo."
    },
    {
      title: "Assistente de Roteiros Dinâmicos",
      icon: <PenTool className="w-6 h-6 text-indigo-400" />,
      desc: "Não trave na página em branco. O gerador cria rascunhos otimizados para narração de IA, organizando ganchos iniciais e desenrolar com total fluidez."
    },
    {
      title: "Direção Visual Automática",
      icon: <Image className="w-6 h-6 text-blue-400" />,
      desc: "Chega de dúvidas na edição. Receba orientações claras de b-rolls e Prompts para gerar imagens que ilustrem com perfeição os trechos do seu áudio."
    },
    {
      title: "Sugestões de Monetização",
      icon: <Zap className="w-6 h-6 text-green-400" />,
      desc: "Além das parcerias padrão, o sistema sugere produtos ideais para você indicar nos comentários fixados, rentabilizando o canal desde os primeiros inscritos."
    },
    {
      title: "Edição e Render Automático",
      icon: <Monitor className="w-6 h-6 text-teal-400" />,
      desc: "Deixe o peso com a máquina. O Guru Master junta seu roteiro e mídias, cortando silêncios e renderizando o vídeo final em alta qualidade direto no seu computador."
    }
  ];

  const modules = [
    {
       name: "1. Pesquisa Inteligente",
       icon: <Target className="w-5 h-5 text-cyan-400" />,
       color: "border-cyan-500/20 bg-cyan-500/10",
       content: "Nossa aba de Identificação faz leitura de tendências globais entregando nichos organizados por complexidade de produção. Encontre o equilíbrio ideal entre um bom tema e a sua capacidade de tempo para operar."
    },
    {
       name: "2. Assistente Criativo",
       icon: <Terminal className="w-5 h-5 text-purple-400" />,
       color: "border-purple-500/20 bg-purple-500/10",
       content: "O Módulo de Escrita estrutura o conhecimento cru em um vídeo engajador. Ele sugere os blocos de texto otimizados para manter o espectador interessado do começo ao final, sem jargões complexos."
    },
    {
       name: "3. Empacotamento Visual",
       icon: <Image className="w-5 h-5 text-indigo-400" />,
       color: "border-indigo-500/20 bg-indigo-500/10",
       content: "Planejamento visual transparente. O sistema interpreta sua pauta e sugere ganchos para as Thumbnails e cenas de corte para manter o canal sem rosto 100% dinâmico visualmente."
    },
    {
       name: "4. Máquina de Render",
       icon: <Play className="w-5 h-5 text-teal-400" />,
       color: "border-teal-500/20 bg-teal-500/10",
       content: "Esqueça os editores complexos. O motor nativo une suas narrações, corta pontas soltas, sincroniza slides e exporta o arquivo de vídeo MP4 automaticamente."
    }
  ];

  const faqs = [
    {
      q: "O software funciona no macOS ou Mobile?",
      a: "Por enquanto não. O Guru Master foi desenvolvido como um App nativo (Desktop .EXE) exclusivamente para Windows 10 e 11, garantindo processamento seguro local na sua máquina."
    },
    {
      q: "Preciso aparecer nos vídeos?",
      a: "Não. A ferramenta foi concebida focando na estratégia 'Faceless' (Canais Sem Rosto). Os roteiros e estruturas são pensados para locução com ferramentas de voz e edição intercalada com imagens/b-rolls."
    },
    {
      q: "O Guru Master cria os vídeos automaticamente para mim?",
      a: "Nós prezamos pelo trabalho de qualidade. O app não vai 'cuspir' um vídeo empacotado aleatório (pois isso prejudica seu canal com o YouTube). O Guru atua como seu assistente criativo completo: da ideia ao roteiro e prompts visuais, permitindo que você junte as peças na sua edição final com extrema agilidade."
    },
    {
      q: "Como tenho acesso após a compra?",
      a: "Você receberá o acesso imediatamente por e-mail, de forma simples e segura. Dentro da sua página privada, estará o botão de download oficial e seu login de ativação da plataforma."
    }
  ];

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

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

      <main className="relative z-10 w-full flex flex-col items-center">
        
        {/* SESSÃO 1: HERO */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 flex flex-col items-center text-center w-full max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="w-full relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 text-xs font-semibold text-cyan-400 mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> O seu parceiro para Canais Sem Rosto
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 text-white">
               Acelere a construção<br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                 dos seus Canais Faceless.
              </span>
            </h1>
            
            <p className="text-base md:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed mb-10">
               O Guru Master é um aplicativo focado em produtividade para quem cria conteúdo no YouTube sem aparecer. Chega de planilhas bagunçadas: nossa Inteligência unifica pesquisa, ideias visuais e rotinas criativas.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mx-auto mt-4">
              <button 
                 onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
                 className="w-full sm:w-auto px-8 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95"
              >
                 Começar Agora <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                 onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                 className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 active:scale-95"
              >
                 Conhecer Módulos
              </button>
            </div>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 30 }} 
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.2 }}
             className="mt-20 w-full relative group cursor-pointer"
          >
             <div className="relative aspect-video rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shadow-xl z-10 transition-transform duration-500 hover:scale-[1.01]">
                <img src="/logo.jpg" alt="Interface Guru Master Demo" className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                   <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 transition-transform group-hover:scale-110">
                     <Play className="w-6 h-6 ml-1" />
                   </div>
                   <p className="mt-4 text-xs font-semibold tracking-wide text-cyan-300">Ver tour da plataforma</p>
                </div>
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

        {/* SESSÃO 2: PRODUTIVIDADE (COMPARAÇÃO) */}
        <section className="py-24 px-6 w-full max-w-5xl mx-auto border-b border-slate-800/50">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn} className="text-center mb-16">
             <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">Seu Tempo é Valioso</h2>
             <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight">O que antes tomava dias, agora leva minutos.</h3>
             <p className="text-slate-400 mt-4 max-w-2xl mx-auto text-sm">Organize sua estrutura cerebral. Automatize tarefas chatas sem perder a essência do seu conteúdo exclusivo.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 relative">
             {/* O Caminho Tradicional */}
             <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 relative">
                <h4 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-slate-500" /> O Método Manual</h4>
                <div className="space-y-6">
                   <div className="flex gap-4 items-start pb-4 border-b border-slate-800/50">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 font-bold text-slate-400 text-sm">1</div>
                      <div>
                        <p className="text-white font-semibold text-sm mb-1">Caça por Ideias e Referências</p>
                        <p className="text-slate-400 text-sm">Múltiplas abas abertas, falta de clareza do que o mercado quer ver.</p>
                      </div>
                   </div>
                   <div className="flex gap-4 items-start pb-4 border-b border-slate-800/50">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 font-bold text-slate-400 text-sm">2</div>
                      <div>
                        <p className="text-white font-semibold text-sm mb-1">Roteiro Improvisado</p>
                        <p className="text-slate-400 text-sm">Gera um texto padronizado em chat público sem gatilhos que prendem audiência.</p>
                      </div>
                   </div>
                   <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 font-bold text-slate-400 text-sm">3</div>
                      <div>
                        <p className="text-white font-semibold text-sm mb-1">Edição Cega</p>
                        <p className="text-slate-400 text-sm">Começa o vídeo sem norte visual e gasta horas procurando b-rolls corretos.</p>
                      </div>
                   </div>
                </div>
             </motion.div>

             {/* O Caminho Guru */}
             <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-slate-900 border border-slate-700/50 shadow-lg shadow-cyan-500/5 rounded-3xl p-8 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[40px] pointer-events-none rounded-full" />
                <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-cyan-400" /> O Método Guru Master</h4>
                <div className="space-y-6">
                   <div className="flex gap-4 items-start pb-4 border-b border-slate-800">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 font-bold text-sm border border-cyan-500/20">1</div>
                      <div>
                        <p className="text-cyan-50 mb-1 font-semibold text-sm">Pesquisa Otimizada</p>
                        <p className="text-slate-400 text-sm">Utiliza nosso rastreador focado. Recebe lista do que o algoritmo recompensa sem perder tempo.</p>
                      </div>
                   </div>
                   <div className="flex gap-4 items-start pb-4 border-b border-slate-800">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 font-bold text-sm border border-cyan-500/20">2</div>
                      <div>
                        <p className="text-cyan-50 mb-1 font-semibold text-sm">Roteiro Dinâmico IA</p>
                        <p className="text-slate-400 text-sm">A ferramenta escreve scripts já com estrutura de início cativante, prontos para a voz.</p>
                      </div>
                   </div>
                   <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 font-bold text-sm border border-cyan-500/20">3</div>
                      <div>
                        <p className="text-cyan-50 mb-1 font-semibold text-sm">Edição Automática (1-Click)</p>
                        <p className="text-slate-400 text-sm">A ferramenta compila seu áudio narrado e suas imagens, aplicando os cortes sem falhas até te entregar o vídeo pronto para upar no Youtube.</p>
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>
        </section>

         {/* SESSÃO 3: ESTEIRA DE AUTOMAÇÃO */}
        <section id="features" className="py-24 px-6 w-full max-w-5xl mx-auto border-b border-slate-800/50">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mb-20">
              <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">Linha de Produção Visual</h2>
              <h3 className="text-3xl font-bold tracking-tight text-white leading-tight">Como a Automação se parece na prática</h3>
           </motion.div>

           <div className="relative space-y-20">
              <div className="hidden md:block absolute left-1/2 top-10 bottom-10 w-px bg-slate-800 -translate-x-1/2"></div>

              {/* Step 1 - Mineração */}
              <div className="relative flex flex-col md:flex-row items-center gap-10">
                 <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-cyan-500 items-center justify-center z-10 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                    <Target className="w-4 h-4 text-cyan-400" />
                 </div>
                 <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pr-16 text-center md:text-right">
                    <span className="inline-block text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full mb-4">Passo 1</span>
                    <h4 className="text-xl font-bold text-white mb-3">Mineração de Canais Virais</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">A IA varre o YouTube em tempo real e entrega canais em ascensão com poucos vídeos e alto alcance — o ambiente perfeito para você entrar antes dos outros.</p>
                 </motion.div>
                 <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pl-16">
                    <div className="relative rounded-2xl overflow-hidden border border-cyan-500/20 shadow-2xl shadow-cyan-500/5 group">
                       <img src="/prints/mineracao.png" alt="Mineração de Canais" className="w-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-500" />
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />
                    </div>
                 </motion.div>
              </div>

              {/* Step 2 - Identificador de Nichos */}
              <div className="relative flex flex-col md:flex-row-reverse items-center gap-10">
                 <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-purple-500 items-center justify-center z-10 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                 </div>
                 <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pl-16 text-center md:text-left">
                    <span className="inline-block text-[10px] font-bold text-purple-400 uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full mb-4">Passo 2</span>
                    <h4 className="text-xl font-bold text-white mb-3">Identificador de Nichos</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">O Oracle V4 analisa o mercado, calcula ganho estimado, apetite viral e saturação real — e entrega o blueprint completo do canal: nomenclatura, fórmulas de título e temas de estreia.</p>
                 </motion.div>
                 <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pr-16">
                    <div className="relative rounded-2xl overflow-hidden border border-purple-500/20 shadow-2xl shadow-purple-500/5 group">
                       <img src="/prints/identificador2.png" alt="Identificador de Nichos" className="w-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-500" />
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />
                    </div>
                 </motion.div>
              </div>

              {/* Step 3 - Gerador de Prompts */}
              <div className="relative flex flex-col md:flex-row items-center gap-10">
                 <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-indigo-500 items-center justify-center z-10 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                    <Image className="w-4 h-4 text-indigo-400" />
                 </div>
                 <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pr-16 text-center md:text-right">
                    <span className="inline-block text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full mb-4">Passo 3</span>
                    <h4 className="text-xl font-bold text-white mb-3">Empacotamento Visual</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">Chega da tela em branco. Escolha entre 19 estilos visuais — do Ultra-Realista ao Neon Glow — e gere prompts prontos para IA de imagem com fidelidade cinematográfica.</p>
                 </motion.div>
                 <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pl-16">
                    <div className="relative rounded-2xl overflow-hidden border border-indigo-500/20 shadow-2xl shadow-indigo-500/5 group">
                       <img src="/prints/prompts.png" alt="Gerador de Prompts" className="w-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-500" />
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />
                    </div>
                 </motion.div>
              </div>

              {/* Step 4 - Render */}
              <div className="relative flex flex-col md:flex-row-reverse items-center gap-10">
                 <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-950 border-2 border-teal-500 items-center justify-center z-10 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                    <Play className="w-4 h-4 text-teal-400" />
                 </div>
                 <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pl-16 text-center md:text-left">
                    <span className="inline-block text-[10px] font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full mb-4">Passo 4</span>
                    <h4 className="text-xl font-bold text-white mb-3">Máquina de Render</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">Combine narração, imagens e trilha sonora. O motor FFmpeg nativo sincroniza, corta silêncios e exporta o MP4 final em 1 clique — sem abrir nenhum editor de vídeo.</p>
                 </motion.div>
                 <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="w-full md:w-1/2 md:pr-16">
                    <div className="relative rounded-2xl overflow-hidden border border-teal-500/20 shadow-2xl shadow-teal-500/5 group">
                       <img src="/prints/render.png" alt="Motor de Render" className="w-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-500" />
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />
                    </div>
                 </motion.div>
              </div>

           </div>
        </section>

        {/* SESSÃO 3.5: GALERIA DE PRINTS REAIS */}
        <section className="py-24 px-6 w-full max-w-6xl mx-auto border-b border-slate-800/50">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mb-14">
              <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">Direto do Software</h2>
              <h3 className="text-3xl font-bold tracking-tight text-white">Veja o que você vai ter nas mãos</h3>
              <p className="text-slate-400 mt-4 text-sm max-w-xl mx-auto">Cada tela abaixo é captura real do aplicativo. Sem mockups, sem montagens. É o que você acessa no dia 1.</p>
           </motion.div>

           <div className="grid grid-cols-12 gap-4 auto-rows-[220px]">

              {/* Large hero - Modelador de Canais */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="col-span-12 md:col-span-8 row-span-1 relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 cursor-default"
              >
                <img src="/prints/modelador.png" alt="Modelador de Canais" className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 p-5">
                   <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-full">Modelador de Canais</span>
                   <p className="text-white font-semibold mt-2 text-sm">Raio-X de canais concorrentes. Replicação estrutural inteligente.</p>
                </div>
              </motion.div>

              {/* Status do Sistema */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                className="col-span-12 md:col-span-4 row-span-1 relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 cursor-default"
              >
                <img src="/prints/status.png" alt="Status do Sistema" className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 p-5">
                   <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded-full">Status em Tempo Real</span>
                   <p className="text-white font-semibold mt-2 text-sm">Todas as IAs conectadas e monitoradas.</p>
                </div>
              </motion.div>

              {/* Roteiros */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
                className="col-span-12 md:col-span-4 row-span-1 relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 cursor-default"
              >
                <img src="/prints/roteiros.png" alt="Gerador de Roteiros" className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 p-5">
                   <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-full">Criador de Roteiros</span>
                   <p className="text-white font-semibold mt-2 text-sm">20+ DNA de estrutura narrativa para máxima retenção.</p>
                </div>
              </motion.div>

              {/* Prompts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                className="col-span-12 md:col-span-4 row-span-1 relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 cursor-default"
              >
                <img src="/prints/prompts.png" alt="Gerador de Prompts" className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 p-5">
                   <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-full">Gerador de Prompts</span>
                   <p className="text-white font-semibold mt-2 text-sm">19 estilos visuais com fidelidade cinematográfica.</p>
                </div>
              </motion.div>

              {/* Render */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 }}
                className="col-span-12 md:col-span-4 row-span-1 relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 cursor-default"
              >
                <img src="/prints/render.png" alt="Gerar Vídeo" className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 p-5">
                   <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded-full">Motor de Render</span>
                   <p className="text-white font-semibold mt-2 text-sm">FFmpeg nativo. MP4 final em 1 clique.</p>
                </div>
              </motion.div>

           </div>
        </section>

        {/* SESSÃO 4: PRICING PERSUASIVO */}
        <section id="pricing" className="py-32 px-6 w-full relative overflow-hidden border-b border-slate-800">
           {/* Background glow */}
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.08),transparent)] pointer-events-none" />
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-cyan-500/30 to-transparent" />

           <div className="max-w-5xl mx-auto relative z-10">

              {/* Pain Pill Header */}
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mb-16">
                 <span className="inline-flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                    Quanto tempo você ainda vai perder?
                 </span>
                 <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6 leading-tight">
                    Cada semana sem sistema<br/>é uma semana doada à concorrência.
                 </h2>
                 <p className="text-slate-400 max-w-xl mx-auto text-base leading-relaxed">
                    Enquanto você busca ideias no Google, roteiriza do zero e gasta horas editando — quem usa o Guru Master já publicou, ranqueou e monetizou.
                 </p>
              </motion.div>

              {/* Two-column layout: Value Stack + Pricing Card */}
              <div className="grid md:grid-cols-2 gap-8 items-start">

                 {/* Left: Value Stack */}
                 <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-6">O que entra no seu arsenal:</h3>
                    {[
                      { icon: <Target className="w-5 h-5 text-cyan-400" />, color: "bg-cyan-500/10 border-cyan-500/20", title: "Minerador de Canais Virais", desc: "Encontre nichos com alta busca e poucos concorrentes antes de qualquer um." },
                      { icon: <Sparkles className="w-5 h-5 text-purple-400" />, color: "bg-purple-500/10 border-purple-500/20", title: "Identificador Oracle V4", desc: "Blueprint completo: nichos, fórmulas de título e temas de estreia prontos." },
                      { icon: <Terminal className="w-5 h-5 text-indigo-400" />, color: "bg-indigo-500/10 border-indigo-500/20", title: "Roteirizador com DNA de Retenção", desc: "20+ estruturas narrativas que seguram audiência do gancho ao CTA." },
                      { icon: <Image className="w-5 h-5 text-pink-400" />, color: "bg-pink-500/10 border-pink-500/20", title: "Gerador de Prompts Visuais", desc: "19 estilos cinematográficos. Capa e B-Roll prontos para IA de imagem." },
                      { icon: <Play className="w-5 h-5 text-teal-400" />, color: "bg-teal-500/10 border-teal-500/20", title: "Máquina de Edição e Render", desc: "Motor FFmpeg nativo. Combina voz, imagens e trilha. Exporta MP4 em 1 clique." },
                    ].map((item, i) => (
                       <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                          className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 transition-colors group">
                          <div className={`p-2.5 rounded-xl border shrink-0 ${item.color}`}>{item.icon}</div>
                          <div>
                             <p className="font-semibold text-white text-sm mb-1">{item.title}</p>
                             <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                          </div>
                       </motion.div>
                    ))}
                 </motion.div>

                 {/* Right: Pricing Card */}
                 <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="sticky top-8">
                    <div className="relative bg-slate-950 border border-slate-700/60 rounded-3xl p-8 shadow-2xl shadow-cyan-500/5 overflow-hidden">
                       {/* Inner glow */}
                       <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 blur-[60px] pointer-events-none rounded-full" />
                       <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 blur-[40px] pointer-events-none rounded-full" />

                       <div className="relative z-10">
                          <div className="flex items-center justify-between mb-6">
                             <span className="text-xs font-bold text-white uppercase tracking-widest bg-slate-800 px-3 py-1.5 rounded-full">Plano Criador</span>
                             <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-full">Acesso Completo</span>
                          </div>

                          {/* Price */}
                          <div className="mb-2">
                             <div className="flex items-start gap-1">
                                <span className="text-lg font-medium text-slate-400 mt-3">R$</span>
                                <span className="text-8xl font-black tracking-tighter text-white leading-none">47</span>
                                <span className="text-sm font-medium text-slate-500 self-end mb-3">/mês</span>
                             </div>
                             <p className="text-xs text-slate-500 mt-1">Menos que um almoço por semana. Cancele quando quiser.</p>
                          </div>

                          {/* CTA */}
                          <div className="mt-8 mb-6">
                             <button onClick={() => setShowPaymentModal(true)}
                                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 rounded-2xl font-black text-base transition-all shadow-lg shadow-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/50">
                                Quero Começar Agora →
                             </button>
                          </div>

                          {/* Mini features */}
                          <ul className="space-y-2.5 mb-6">
                             {[
                               'Minerador + Identificador de Nichos',
                               'Roteirizador com 20+ DNA de Retenção',
                               'Motor de Edição e Render Automático',
                               'App Desktop Nativo (Windows)',
                               'Atualizações incluídas',
                             ].map((item, i) => (
                               <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                                  <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                                  {item}
                               </li>
                             ))}
                          </ul>

                          {/* Trust signals */}
                          <div className="pt-5 border-t border-slate-800 space-y-2">
                             <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                                <Shield className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                Cancele a qualquer momento, sem perguntas.
                             </div>
                             <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                                <CheckCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                Sem taxas ocultas. Sem fidelidade mínima.
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Urgency note below card */}
                    <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
                       className="text-center text-xs text-slate-500 mt-5 flex items-center justify-center gap-1.5">
                       <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                       Software ativo e em evolução contínua.
                    </motion.p>
                 </motion.div>

              </div>
           </div>
        </section>


        {/* SESSÃO 5: FAQ */}
        <section className="py-24 px-6 w-full max-w-2xl mx-auto">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mb-12">
              <h3 className="text-2xl font-bold text-white">Perguntas Frequentes</h3>
           </motion.div>
           
           <div className="space-y-4">
              {faqs.map((faq, idx) => (
                 <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} key={idx} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700/80 transition-colors">
                    <button 
                       onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                       className="w-full p-5 text-left flex items-start justify-between focus:outline-none gap-4"
                    >
                       <span className="font-semibold text-sm text-slate-200">{faq.q}</span>
                       <ChevronDown className={`w-5 h-5 text-cyan-500 shrink-0 mt-0.5 transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                       <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed font-medium">
                          {faq.a}
                       </p>
                    </div>
                 </motion.div>
              ))}
           </div>
        </section>

        {/* FOOTER */}
        <footer className="w-full border-t border-slate-800/50 py-12 px-6 text-center bg-slate-950">
           <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                 <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover grayscale opacity-50" />
              </div>
              <span className="text-sm font-bold text-slate-500">Guru Master</span>
           </div>
           
           <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
              <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Políticas e Privacidade</button>
              <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Contato de Suporte</button>
              <button onClick={onLoginClick} className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors flex items-center gap-1"><Terminal className="w-3 h-3"/> Acesso Oficial</button>
           </div>
           
           <p className="text-xs text-slate-600">Guru Master &copy; {new Date().getFullYear()} - O Assistente Definitivo.</p>
        </footer>
      </main>

      {/* MODAL DE PAGAMENTO NATIVO */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowPaymentModal(false); setCheckoutStep('email'); } }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-700">
                  <img src="/logo.jpg" alt="Guru Master" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-white text-sm font-bold leading-none">Guru Master</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">Plano Criador — R$47/mês</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <Shield className="w-3 h-3" />
                  Pagamento 100% Seguro
                </div>
                <button
                  onClick={() => { setShowPaymentModal(false); setCheckoutStep('email'); }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto flex items-start justify-center py-10 px-4">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="w-full max-w-md"
              >
                {checkoutStep === 'email' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">Criar sua conta</h2>
                      <p className="text-slate-400 text-sm">Seu e-mail será seu login na plataforma.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="email"
                          value={checkoutEmail}
                          onChange={(e) => setCheckoutEmail(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && checkoutEmail.includes('@')) setCheckoutStep('payment'); }}
                          placeholder="seu@email.com"
                          className="w-full h-13 bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-2xl pl-11 pr-4 py-3.5 text-white outline-none transition-colors text-sm"
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={() => { if (checkoutEmail.includes('@') && checkoutEmail.includes('.')) setCheckoutStep('payment'); }}
                        disabled={!checkoutEmail.includes('@')}
                        className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 rounded-2xl font-black text-base transition-all shadow-lg shadow-cyan-500/10"
                      >
                        Continuar para Pagamento →
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 text-center">Ao continuar você aceita nossos Termos e Política de Privacidade.</p>
                  </div>
                )}

                {checkoutStep === 'payment' && (
                  <div>
                    <button onClick={() => setCheckoutStep('email')} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors">
                      ← Voltar
                    </button>
                    <NativeCheckout userEmail={checkoutEmail} onVerificationSuccess={() => { setShowPaymentModal(false); onLoginClick(); }} />
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
