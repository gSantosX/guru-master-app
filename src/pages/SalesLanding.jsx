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

/* ─── Paleta Guru Master — Neon System ─────────────────────────────────── */
const C = {
  cyan:   '#00f3ff',
  purple: '#9d00ff',
  pink:   '#ff00ea',
  dark:   '#0a0a0f',
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
    { q: 'O Guru Master funciona no macOS ou celular?', a: 'O Guru Master é uma plataforma web — funciona em qualquer navegador, PC, Mac ou celular. Basta acessar com seu e-mail e começar a produzir.' },
    { q: 'Preciso aparecer nos vídeos?', a: 'Não. O sistema foi 100% projetado para canais Dark/Faceless. Todas as ferramentas — roteiros, prompts visuais, capas — foram desenhadas para criar conteúdo cinematográfico sem mostrar o rosto.' },
    { q: 'Vou ficar rico com isso?', a: 'Vamos ser honestos: nenhuma ferramenta garante dinheiro. O que o Guru Master faz é eliminar a parte difícil — pesquisa, roteiro, identidade visual — para que você consiga postar com consistência. O sucesso depende do seu esforço e da sua constância.' },
    { q: 'Que tipo de canal posso criar?', a: 'Canais de Mistérios, Crimes Reais, História, Curiosidades, Documentários, Finanças, Motivação, Espiritualidade — qualquer nicho Dark ou Faceless. O sistema tem 35+ nichos prontos e suporte a 8 idiomas.' },
    { q: 'Como recebo o acesso?', a: 'Imediatamente após a confirmação do pagamento. O e-mail que você cadastrar no checkout será sua chave de acesso ao sistema.' },
    { q: 'Posso cancelar quando quiser?', a: 'Sim. Sem fidelidade, sem multa, sem burocracia. Cancele direto pelo painel a qualquer momento.' },
  ];

  const modules = [
    { num: '01', tag: 'Mineração', tagColor: C.cyan, title: 'Descubra Canais Que Estão Explodindo', desc: 'O sistema varre o YouTube em tempo real e encontra canais dark/faceless que estão crescendo agora — com poucos vídeos e muitas views. Filtre por idioma, nicho, idade do canal e formato (Shorts ou Vídeo Normal). Você copia a estratégia de quem já está funcionando.', imgSrc: '/prints/mineracao_new.png', reverse: false },
    { num: '02', tag: 'Modelagem', tagColor: C.purple, title: 'Modele o DNA de Qualquer Canal', desc: 'Cole a URL de um canal e a IA analisa tudo: nicho, estrutura de títulos, padrões de retenção e público-alvo. Ela gera títulos virais personalizados baseados no DNA do canal escolhido — em qualquer idioma.', imgSrc: '/prints/modelador_new.png', reverse: true },
    { num: '03', tag: 'Roteiros', tagColor: '#6366f1', title: 'Roteiros Cinematográficos com I.A.', desc: 'Crie scripts completos com 20+ estilos narrativos (Jornada do Herói, Thriller, Documentário...). A IA constrói ganchos, tensão, clímax e CTA. Escolha o tom, o idioma e o tamanho — de 3 mil a 15 mil caracteres. Pronto pra gravar.', imgSrc: '/prints/roteiros_new.png', reverse: false },
    { num: '04', tag: 'Visuais', tagColor: '#14b8a6', title: 'Prompts Visuais Para Cada Cena', desc: 'O motor lê cada legenda do seu roteiro e gera prompts cinematográficos detalhados — com gênero, câmera, composição, iluminação e foco. Exporte para Midjourney, Leonardo AI ou qualquer gerador. Modo Automático incluso.', imgSrc: '/prints/prompts_new.png', reverse: true },
    { num: '05', tag: 'Capas', tagColor: C.pink, title: 'Thumbnails Geradas por IA (Imagen 3)', desc: 'O sistema analisa o título e a descrição SEO do vídeo e gera thumbnails prontas usando o Google Imagen 3. Escolha estilo (cinematic, anime, 3D...), cor, composição e se quer texto viral no idioma original do título.', imgSrc: '/prints/capas_new.png', reverse: false },
    { num: '06', tag: 'SEO', tagColor: '#f59e0b', title: 'SEO & Publicação Automatizada', desc: 'Gere pacotes completos de SEO para cada vídeo: título otimizado, descrição com keywords, tags e hashtags. Tudo baseado na análise real do mercado e do seu nicho. Publique com confiança.', imgSrc: '/prints/seo_new.png', reverse: true },
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
              Plataforma Completa Para Canais Dark & Faceless
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em] leading-[1.05] mb-6 text-white">
              Crie seu canal dark
              <br />
              <span className="relative inline-block">
                <span className="relative z-10" style={{
                  background: `linear-gradient(135deg, ${C.cyan} 0%, ${C.purple} 50%, ${C.pink} 100%)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>
                  do jeito fácil.
                </span>
                <span className="absolute -inset-2 blur-3xl opacity-30 rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})` }} />
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
              Mineração de canais, roteiros com I.A., prompts visuais cinematográficos e thumbnails — <strong className="text-white">tudo numa plataforma só</strong>.
              Sem precisar aparecer. Sem precisar ser editor. Só precisa ter consistência.
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
            <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: C.cyan }}>O que o sistema resolve</p>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">
              Criar conteúdo dark é difícil.<br />
              <span style={{ color: C.cyan }}>Não precisa ser.</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">Pesquisar nicho, escrever roteiro, gerar imagens, montar capa — cada etapa leva horas. O Guru Master automatiza todas elas numa esteira só.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <StatCard icon={Layers}     value="35+"    label="Nichos Dark Prontos"        color={C.cyan}   />
            <StatCard icon={Globe}      value="8"      label="Idiomas Suportados"         color={C.purple} />
            <StatCard icon={Brain}      value="20+"    label="Estilos de Roteiro"         color={C.pink}   />
            <StatCard icon={Wand2}      value="∞"      label="Prompts Gerados por I.A."   color="#f59e0b"  />
          </div>

          {/* 3 Pilares */}
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: EyeOff,   color: C.cyan,   title: '100% Sem Rosto',      desc: 'Cada ferramenta foi desenhada para produção faceless. Você nunca precisa ligar uma câmera — a I.A. cuida do visual e da narrativa.' },
              { icon: Target,   color: C.purple, title: 'Dados Reais do YouTube', desc: 'Mineração de canais com filtros de idioma, nicho, idade e formato. Você não adivinha — você copia o que já funciona.' },
              { icon: Zap,      color: C.pink,   title: 'Esteira de Produção',  desc: 'Do título ao vídeo pronto: pesquisa → roteiro → prompts → capa → SEO. Uma sequência lógica, tudo dentro do sistema.' },
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
            <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: C.purple }}>Veja o que está dentro</p>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              6 módulos. Um sistema.
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
            <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: C.pink }}>Sem filtros</p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">O que os usuários dizem.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Lucas R.',  role: 'Canal de Mistérios · Iniciante',     text: 'Eu não sabia nem por onde começar. O Guru Master me deu a estrutura: pesquisei nicho, gerei o roteiro e as imagens tudo no mesmo dia. Já postei 4 vídeos.', stars: 5 },
              { name: 'Amanda C.',  role: 'Canal de Crimes Reais',              text: 'O que mais demora era o roteiro. Agora eu seleciono o DNA do estilo, jogo o título e em 3 minutos tenho um script de 8 mil caracteres pronto pra narrar.', stars: 5 },
              { name: 'Diego M.',   role: 'Canal Dark History · 2 meses',       text: 'A mineração de canais me mostrou concorrentes que estavam bombando com 10 vídeos. Copiei a estratégia e adaptei pro meu nicho. Sem adivinhação.', stars: 5 },
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
                    'Mineração de Canais em Tempo Real',
                    'Modelagem de DNA de Canais com I.A.',
                    'Engine de Roteiros com 20+ Estilos',
                    'Gerador de Prompts Cinematográficos',
                    'Thumbnails com Google Imagen 3',
                    'SEO & Publicação Automatizada',
                    '35+ Nichos Dark · 8 Idiomas',
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
                Pronto pra criar seu canal dark do jeito fácil?
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                Pesquisa, roteiro, visuais e capa — tudo numa esteira só. Sem enrolação.
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
              <span>© {new Date().getFullYear()} — Plataforma de Produção para Canais Dark & Faceless.</span>
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
