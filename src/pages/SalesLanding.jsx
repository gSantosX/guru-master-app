import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  Play, Shield, Zap, TrendingUp, Lock, FastForward, Layers, PenTool,
  Image, ArrowRight, Target, Clock, Monitor, Sparkles, Terminal,
  CheckCircle2, Globe, Cpu, EyeOff, CheckCircle, ChevronDown, Mail,
  X, Star, Users, Rocket, Brain, BarChart2, Wand2, Video, Crown,
  ChevronRight, Activity
} from 'lucide-react';
import { NativeCheckout } from '../components/NativeCheckout';
import { FloatingNav } from '../components/FloatingNav';
import { useAuth } from '../contexts/AuthContext';

/* ─── Paleta Guru Master ───────────────────────────────────────────────── */
const C = {
  cyan:   '#00f3ff',
  purple: '#a855f7',
  pink:   '#ff2cb6',
  dark:   '#0d0d12',
  card:   'rgba(255,255,255,0.03)',
};

/* ─── Variantes de animação ────────────────────────────────────────────── */
const fadeUp   = { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22,1,0.36,1] } } };
const fadeLeft = { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: [0.22,1,0.36,1] } } };
const fadeRight= { hidden: { opacity: 0, x:  40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: [0.22,1,0.36,1] } } };

/* ─── Componente: Módulo (Feature Row) ─────────────────────────────────── */
const FeatureRow = ({ num, tag, tagColor, title, desc, imgSrc, reverse }) => (
  <div className={`relative flex flex-col gap-8 items-center ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'}`}>
    <motion.div
      initial="hidden" whileInView="visible" viewport={{ once: true }}
      variants={reverse ? fadeRight : fadeLeft}
      className="w-full md:w-1/2 space-y-4"
    >
      <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border"
        style={{ color: tagColor, borderColor: `${tagColor}30`, background: `${tagColor}10` }}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: tagColor }} />
        Módulo {num} — {tag}
      </span>
      <h4 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">{title}</h4>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </motion.div>

    <motion.div
      initial="hidden" whileInView="visible" viewport={{ once: true }}
      variants={reverse ? fadeLeft : fadeRight}
      className="w-full md:w-1/2"
    >
      <div className="relative rounded-2xl overflow-hidden group"
        style={{ boxShadow: `0 0 40px ${tagColor}18, 0 0 80px ${tagColor}08`, border: `1px solid ${tagColor}25` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <img src={imgSrc} alt={title}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentNode.innerHTML = `<div style="height:200px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0d0d12,#1a1a2e);"><span style="font-size:40px;opacity:0.3">🎬</span></div>`;
          }}
        />
      </div>
    </motion.div>
  </div>
);

/* ─── Componente: Stat Card ────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, value, label, color }) => (
  <motion.div
    initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
    className="flex flex-col items-center gap-2 p-6 rounded-2xl border"
    style={{ background: `${color}06`, borderColor: `${color}20` }}
  >
    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
      style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
    <span className="text-3xl font-black text-white tracking-tight">{value}</span>
    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-center">{label}</span>
  </motion.div>
);

/* ─── MAIN COMPONENT ───────────────────────────────────────────────────── */
export const SalesLanding = ({ onLoginClick }) => {
  const { isAuthenticated, logout } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutStep, setCheckoutStep] = useState('email');

  const faqs = [
    { q: 'O software funciona no macOS ou Mobile?', a: 'No momento, o Guru Master é um App nativo focado em performance para Windows 10 e 11. Isso garante que o processamento de dados e IAs seja feito com a máxima velocidade do seu hardware.' },
    { q: 'Preciso aparecer nos vídeos?', a: 'Não. O foco total são Canais Faceless (Sem Rosto). Todas as ferramentas foram desenhadas para que você crie conteúdo de altíssimo nível sem precisar ligar uma câmera.' },
    { q: 'O Guru Master garante resultados financeiros?', a: 'Sendo honestos: nenhuma ferramenta garante dinheiro. O que o Guru Master garante é o suporte técnico de elite: pesquisa de dados real, roteirização científica e design de alta conversão. O sucesso depende da sua consistência.' },
    { q: 'Como recebo o acesso?', a: 'Imediatamente após a confirmação. Você define seu e-mail no checkout e ele será sua chave de entrada para baixar o software e começar sua operação.' },
    { q: 'Posso cancelar quando quiser?', a: 'Sim. Sem fidelidade, sem multa. Você cancela quando quiser diretamente pelo painel, sem burocracia.' },
  ];

  const modules = [
    { num: '01', tag: 'Inteligência', tagColor: C.cyan, title: 'Monitoramento de Tendências', desc: 'Acompanhe canais rivais e filtre o que está viralizando agora. Dados reais sobre o algoritmo para garantir que seu próximo vídeo tenha demanda comprovada antes de você gravar uma única sílaba.', imgSrc: '/prints/screenshot_monitoramento.png', reverse: false },
    { num: '02', tag: 'Roteirização', tagColor: C.purple, title: 'Engine de Roteiros Cirúrgicos', desc: 'Scripts estruturados para retenção máxima. Nossa IA com 20+ DNAs de canais não apenas escreve — ela constrói ganchos, desenvolve tensão e fecha com CTAs que convertem.', imgSrc: '/prints/screenshot_roteiro.png', reverse: true },
    { num: '03', tag: 'Prompts IA', tagColor: '#6366f1', title: 'Engenharia de Prompts Visuais', desc: 'Gere comandos cinematográficos precisos para Midjourney, Stable Diffusion e RunwayML. Defina identidade visual, estilo, paleta e DNA visual do seu canal de uma vez.', imgSrc: '/prints/screenshot_prompts.png', reverse: false },
    { num: '04', tag: 'Organização', tagColor: '#14b8a6', title: 'Banco de Roteiros & Acervo', desc: 'Todo o seu histórico de produção organizado e pesquisável. Recupere, reutilize e adapte seus melhores scripts em segundos. Escale sem reinventar a roda.', imgSrc: '/prints/screenshot_banco.png', reverse: true },
    { num: '05', tag: 'Design', tagColor: C.pink, title: 'Design Center — Capas & Thumbnails', desc: 'Sugestões de capa geradas por IA com foco em CTR. Identidade visual que força o clique e posiciona seu canal como autoridade antes mesmo do vídeo começar.', imgSrc: '/prints/screenshot_capas.png', reverse: false },
  ];

  return (
    <div
      id="sales-scroll-container"
      className="absolute inset-0 z-50 w-full h-full overflow-y-auto overflow-x-hidden text-slate-200 font-sans custom-scrollbar"
      style={{ background: C.dark }}
    >
      {/* ── BACKGROUND GLOW ────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 20% -10%, ${C.cyan}12, transparent),
          radial-gradient(ellipse 60% 40% at 80% 110%, ${C.purple}10, transparent),
          radial-gradient(ellipse 50% 60% at 50% 50%, ${C.pink}05, transparent)
        `
      }} />

      {/* ── GRID TEXTURE ───────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

      <main className="relative z-10 w-full flex flex-col items-center">

        {/* ════════════════════════════════════════════════════════════════
            SEÇÃO 1 — HERO
        ════════════════════════════════════════════════════════════════ */}
        <section className="relative w-full flex flex-col items-center text-center px-6 pt-32 pb-24 overflow-hidden">

          {/* Glow orb */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[120px] pointer-events-none"
            style={{ background: `radial-gradient(circle, ${C.cyan}18 0%, ${C.purple}10 50%, transparent 80%)` }} />

          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="relative z-10 max-w-5xl mx-auto">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8 text-xs font-bold uppercase tracking-[0.15em]"
              style={{ background: `${C.cyan}10`, border: `1px solid ${C.cyan}30`, color: C.cyan }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.cyan }} />
              Ferramentas de Elite · Sem Promessas Mágicas
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em] leading-[1.05] mb-6 text-white">
              O suporte técnico para o seu
              <br />
              <span className="relative inline-block">
                <span className="relative z-10" style={{
                  background: `linear-gradient(135deg, ${C.cyan} 0%, ${C.purple} 50%, ${C.pink} 100%)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>
                  império no YouTube.
                </span>
                <span className="absolute -inset-2 blur-3xl opacity-30 rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})` }} />
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
              O Guru Master não é um botão mágico. É a <strong className="text-white">inteligência</strong> que unifica
              pesquisa de dados, roteirização cirúrgica e visuais cinematográficos para canais faceless de elite.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: `0 0 40px ${C.cyan}50` }}
                whileTap={{ scale: 0.97 }}
                onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
                className="relative px-10 py-4 rounded-2xl font-black text-base transition-all overflow-hidden group"
                style={{ background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`, color: '#000' }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Começar por R$ 29,90 <ArrowRight className="w-5 h-5" />
                </span>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.pink})` }} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm transition-all text-slate-300 hover:text-white"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                Ver os Módulos <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>

          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            TICKER TAPE
        ════════════════════════════════════════════════════════════════ */}
        <div className="w-full py-3 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <motion.div
            animate={{ x: [0, -1200] }}
            transition={{ ease: 'linear', duration: 28, repeat: Infinity }}
            className="flex whitespace-nowrap"
          >
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className="flex items-center gap-12 px-8 text-[10px] font-black uppercase tracking-[0.2em] shrink-0" style={{ color: '#ffffff40' }}>
                <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: C.cyan }} /> Produtividade Aumentada</span>
                <span className="flex items-center gap-2"><Brain className="w-3.5 h-3.5" style={{ color: C.purple }} /> IA Generativa Integrada</span>
                <span className="flex items-center gap-2"><EyeOff className="w-3.5 h-3.5" style={{ color: C.pink }} /> 100% Sem Rosto</span>
                <span className="flex items-center gap-2"><BarChart2 className="w-3.5 h-3.5" style={{ color: C.cyan }} /> Dados em Tempo Real</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SEÇÃO 2 — STATS / CREDIBILIDADE
        ════════════════════════════════════════════════════════════════ */}
        <section className="w-full max-w-5xl mx-auto px-6 py-24">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: C.cyan }}>Por que o Guru Master?</p>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">
              Não é sorte.<br />
              <span style={{ color: C.cyan }}>É suporte técnico.</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">O YouTube não é mais para amadores. Vencer o algoritmo exige dados, consistência e ferramentas que os grandes canais já usam.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <StatCard icon={Users}    value="2.400+"  label="Criadores Ativos"          color={C.cyan}   />
            <StatCard icon={Video}    value="120k+"   label="Vídeos Produzidos"         color={C.purple} />
            <StatCard icon={TrendingUp} value="8.5×" label="Produção mais rápida"       color={C.pink}   />
            <StatCard icon={Star}     value="4.9/5"   label="Avaliação média"           color="#f59e0b"  />
          </div>

          {/* 3 Pilares */}
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Shield,   color: C.cyan,   title: 'Credibilidade Real',  desc: 'Desenvolvido por quem entende canais faceless. Zero promessas de ganhos rápidos. Apenas ferramentas.' },
              { icon: Target,   color: C.purple, title: 'Foco em Dados',       desc: 'Decisões baseadas no que o algoritmo entrega para a concorrência agora, não em achismos.' },
              { icon: Zap,      color: C.pink,   title: 'Escala Técnica',      desc: 'Produza em 1 hora o que seus concorrentes levam 1 dia inteiro. Velocidade é vantagem competitiva.' },
            ].map(({ icon: Icon, color, title, desc }, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.1 } } }}
                className="p-7 rounded-2xl group hover:scale-[1.02] transition-all duration-300 cursor-default"
                style={{ background: `${color}06`, border: `1px solid ${color}18`, boxShadow: `0 0 40px ${color}05` }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h4 className="text-white font-bold text-base mb-2">{title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SEÇÃO 3 — MÓDULOS (Feature Rows)
        ════════════════════════════════════════════════════════════════ */}
        <section id="features" className="w-full max-w-5xl mx-auto px-6 py-16 space-y-28">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: C.purple }}>A Esteira Completa</p>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              5 módulos. Uma operação.
            </h2>
          </motion.div>

          {modules.map((m, i) => (
            <FeatureRow key={i} {...m} />
          ))}
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SEÇÃO 4 — DEPOIMENTOS (Social Proof)
        ════════════════════════════════════════════════════════════════ */}
        <section className="w-full max-w-5xl mx-auto px-6 py-24">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: C.pink }}>O que dizem os criadores</p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Resultados reais.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Rafael S.',  role: 'Canal de Mistério · 180k subs',      text: 'Em 60 dias do Guru Master meu canal saiu de 40k para 180k. A pesquisa de tendências mudou completamente minha estratégia de conteúdo.', stars: 5 },
              { name: 'Camila M.',  role: 'Canal de Conspirações · 95k subs',   text: 'O roteirizador com DNA de canal entregou scripts melhores que os que eu escrevia manualmente em horas. Em 20 minutos tinha um vídeo completo pronto.', stars: 5 },
              { name: 'Igor T.',    role: 'Canal Dark History · 320k subs',     text: 'O módulo de prompts mudou minha identidade visual. Meu CTR subiu de 4% para 9,3% depois que passei a usar as sugestões de thumbnail do sistema.', stars: 5 },
            ].map(({ name, role, text, stars }, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: i*0.12 } } }}
                className="p-7 rounded-2xl flex flex-col gap-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 fill-current" style={{ color: '#f59e0b' }} />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed flex-1">"{text}"</p>
                <div>
                  <p className="text-white font-bold text-sm">{name}</p>
                  <p className="text-slate-500 text-xs">{role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SEÇÃO 5 — PRICING
        ════════════════════════════════════════════════════════════════ */}
        <section id="pricing" className="w-full px-6 py-24 relative overflow-hidden">
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${C.cyan}10, transparent)` }} />

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="relative z-10 w-full max-w-lg mx-auto">

            {/* Card */}
            <div className="relative rounded-3xl p-px overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${C.cyan}40, ${C.purple}40, ${C.pink}20)` }}>
              <div className="relative rounded-3xl p-10 flex flex-col gap-8"
                style={{ background: '#0f0f18', boxShadow: `0 0 80px ${C.cyan}18, inset 0 1px 0 rgba(255,255,255,0.06)` }}>

                {/* Crown badge */}
                <div className="text-center">
                  <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em]"
                    style={{ background: `linear-gradient(135deg, ${C.cyan}20, ${C.purple}20)`, border: `1px solid ${C.cyan}30`, color: C.cyan }}>
                    <Crown className="w-3.5 h-3.5" /> Plano Criador — Acesso Total
                  </span>
                </div>

                {/* Price */}
                <div className="text-center">
                  <div className="flex items-start justify-center gap-1">
                    <span className="text-lg font-semibold text-slate-400 mt-4">R$</span>
                    <span className="text-8xl font-black tracking-tighter text-white leading-none"
                      style={{ textShadow: `0 0 40px ${C.cyan}40` }}>29,90</span>
                    <span className="text-sm text-slate-500 self-end mb-4">/mês</span>
                  </div>
                  <p className="text-slate-500 text-sm mt-2">Sem fidelidade · Cancele quando quiser</p>
                </div>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: `0 0 50px ${C.cyan}45` }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-5 rounded-2xl font-black text-lg relative overflow-hidden group"
                  style={{ background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`, color: '#000' }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Quero Começar Agora <ArrowRight className="w-5 h-5" />
                  </span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.pink})` }} />
                </motion.button>

                {/* Features list */}
                <ul className="space-y-3 pt-2">
                  {[
                    'Monitoramento de Canais e Tendências',
                    'Engine de Roteiros com 20+ DNAs',
                    'Gerador de Prompts Cinematográficos',
                    'Design Center + Sugestão de Thumbnails',
                    'Banco de Roteiros Ilimitado',
                    'Suporte Técnico Prioritário',
                    'Atualizações gratuitas incluídas',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${C.cyan}15`, border: `1px solid ${C.cyan}30` }}>
                        <CheckCircle2 className="w-3 h-3" style={{ color: C.cyan }} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Security note */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-[11px] text-slate-600">Pagamento 100% seguro e criptografado</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SEÇÃO 6 — FAQ
        ════════════════════════════════════════════════════════════════ */}
        <section id="faq" className="w-full max-w-2xl mx-auto px-6 py-24">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: C.purple }}>Dúvidas Frequentes</p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Perguntas & Respostas</h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <motion.div key={idx}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: idx * 0.07 } } }}
                className="rounded-2xl overflow-hidden transition-all duration-300"
                style={{
                  background: openFaq === idx ? `${C.cyan}06` : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${openFaq === idx ? C.cyan + '30' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="font-semibold text-sm text-slate-200">{faq.q}</span>
                  <ChevronDown className={`shrink-0 w-4 h-4 transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`}
                    style={{ color: C.cyan }} />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            CTA FINAL BANNER
        ════════════════════════════════════════════════════════════════ */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="relative rounded-3xl p-12 text-center overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${C.cyan}12 0%, ${C.purple}12 50%, ${C.pink}08 100%)`, border: `1px solid ${C.cyan}20` }}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% 0%, ${C.cyan}15, transparent 70%)` }} />
            <div className="relative z-10">
              <Rocket className="w-12 h-12 mx-auto mb-6" style={{ color: C.cyan }} />
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
                Pronto para operar como um canal de elite?
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                Junte-se a mais de 2.400 criadores que já estão usando o Guru Master para escalar seus canais.
              </p>
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: `0 0 50px ${C.cyan}40` }}
                whileTap={{ scale: 0.97 }}
                onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-base"
                style={{ background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`, color: '#000' }}
              >
                Começar Agora por R$ 29,90 <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <footer className="w-full py-10 px-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-black text-white">Guru Master</span>
              <span>© {new Date().getFullYear()} — O Assistente Definitivo para Canais Faceless.</span>
            </div>
            <p className="text-xs">Valor exclusivo: R$ 29,90/mês · Cancele quando quiser</p>
          </div>
        </footer>
      </main>

      {/* ── FloatingNav ─────────────────────────────────────────────── */}
      <FloatingNav onLoginClick={onLoginClick} isAuthenticated={isAuthenticated} onLogout={logout} />

      {/* ── MODAL CHECKOUT ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: `${C.dark}ee`, backdropFilter: 'blur(16px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl p-8 relative"
              style={{ background: '#0f0f18', border: `1px solid ${C.cyan}25`, boxShadow: `0 0 80px ${C.cyan}18` }}
            >
              <button onClick={() => setShowPaymentModal(false)}
                className="absolute top-5 right-5 text-slate-600 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>

              {checkoutStep === 'email' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-white mb-1">Criar sua conta</h2>
                    <p className="text-slate-400 text-sm">O e-mail será sua chave de acesso ao sistema.</p>
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={checkoutEmail}
                      onChange={(e) => setCheckoutEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full pl-11 pr-4 py-4 rounded-2xl text-white outline-none text-sm transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.1)` }}
                      onFocus={e => e.target.style.borderColor = C.cyan + '60'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { if (checkoutEmail.includes('@')) setCheckoutStep('payment'); }}
                    className="w-full py-4 rounded-2xl font-black text-base"
                    style={{ background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`, color: '#000' }}
                  >
                    Ir para Pagamento (R$ 29,90) →
                  </motion.button>
                </div>
              )}

              {checkoutStep === 'payment' && (
                <NativeCheckout userEmail={checkoutEmail} onVerificationSuccess={() => setShowPaymentModal(false)} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
