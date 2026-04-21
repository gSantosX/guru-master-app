import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Search, 
  Loader2, 
  Sparkles, 
  Check, 
  Copy, 
  TrendingUp, 
  Users, 
  Video, 
  Image as ImageIcon, 
  Type, 
  Zap, 
  Compass,
  Globe,
  Youtube,
  History,
  Trash2,
  RefreshCw,
  DollarSign,
  BarChart2,
  AlertTriangle,
  Flame,
  LayoutTemplate
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { callAI } from '../utils/aiUtils';
import { resolveApiUrl } from '../utils/apiUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useCloudStorage } from '../hooks/useCloudStorage';

const LANGUAGES = [
  { name: "Inglês (EUA/Reino Unido) 🚀", code: "en-US", region: "US", rpm: 6.50 },
  { name: "Inglês (Austrália/Canadá) 🚀", code: "en-AU", region: "AU", rpm: 5.80 },
  { name: "Alemão (Alemanha/Suíça) 🚀", code: "de-DE", region: "DE", rpm: 5.50 },
  { name: "Norueguês (Noruega) 🚀", code: "no-NO", region: "NO", rpm: 6.80 },
  { name: "Sueco (Suécia) 🚀", code: "sv-SE", region: "SE", rpm: 5.20 },
  { name: "Dinamarquês (Dinamarca) 🚀", code: "da-DK", region: "DK", rpm: 5.40 },
  { name: "Neerlandês (Holanda) 🚀", code: "nl-NL", region: "NL", rpm: 5.10 },
  { name: "Francês (França/Suíça) 🚀", code: "fr-FR", region: "FR", rpm: 4.80 },
  { name: "Japonês (Japão) 🚀", code: "ja-JP", region: "JP", rpm: 4.20 },
  { name: "Coreano (Coreia do Sul) 🚀", code: "ko-KR", region: "KR", rpm: 3.90 },
  { name: "Árabe (Emirados Árabes) 🚀", code: "ar-AE", region: "AE", rpm: 4.50 },
  { name: "Espanhol (Espanha) 🚀", code: "es-ES", region: "ES", rpm: 3.50 },
  { name: "Italiano (Itália) 🚀", code: "it-IT", region: "IT", rpm: 3.20 },
  { name: "Finlandês (Finlândia) 🚀", code: "fi-FI", region: "FI", rpm: 4.90 },
  { name: "Inglês (Singapura/Ásia) 🚀", code: "en-SG", region: "SG", rpm: 4.60 },
  { name: "Português (Brasil)", code: "pt-BR", region: "BR", rpm: 1.20 },
  { name: "Espanhol (Latam)", code: "es-LA", region: "MX", rpm: 1.50 },
  { name: "Global (Inglês Massivo)", code: "en", region: "US", rpm: 3.00 }
];

export const NicheIdentifierTab = ({ setActiveTab }) => {
  const { configs } = useSystemStatus();
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);
  const [loadingStep, setLoadingStep] = useState('');

  const [history, setHistory] = useCloudStorage('niche_history', []);

  const saveToHistory = (newResult, langInfo) => {
    const newEntry = {
      id: Date.now(),
      topic: topic || "Trend Aleatória",
      language: langInfo,
      data: newResult,
      date: new Date().toLocaleDateString()
    };
    setHistory(prev => {
      const existing = Array.isArray(prev) ? prev : [];
      // Filter out old format entries without gapAnalysis
      const valid = existing.filter(h => h?.data?.gapAnalysis);
      return [newEntry, ...valid].slice(0, 30);
    });
  };

  const clearHistory = () => {
    if(window.confirm("Deseja apagar permanentemente o histórico de nichos analisados?")) {
      setHistory([]);
    }
  };

  const loadFromHistory = (entry) => {
    setLanguage(entry.language);
    setTopic(entry.topic === "Trend Aleatória" ? "" : entry.topic);
    setResult(entry.data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const redoSearch = () => {
    handleSearch();
  };

  const transferToAutoFlow = () => {
    if(!result) return;
    const bridgeData = `NICHO GERADO:\n${result.nicheName}\n\nTEMAS IDEAIS:\n${result.videoThemes.join(" | ")}\n\nTÍTULOS IDEAIS:\n${result.titleStructures.join(" | ")}`;
    localStorage.setItem('guru_flow_transfer', bridgeData);
    alert("Função Auto Flow temporariamente indisponível (Em manutenção). Dados copiados.");
  };

  const handleSearch = async () => {
    // Check Cache
    const cacheKey = `niche_yt_${topic}_${language.code}`;
    const cached = sessionStorage.getItem(cacheKey);
    let cachedYTData = null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 1 * 60 * 60 * 1000) {
          cachedYTData = parsed.data;
        }
      } catch (e) {}
    }

    setIsSearching(true);
    setResult(null);

    try {
      const geminiKey = localStorage.getItem('guru_gemini_key')?.trim();
      const gptKey = localStorage.getItem('guru_gpt_key')?.trim();
      if (!geminiKey) throw new Error("Chave Gemini não configurada!");

      // 1. Live Data Ingestion (YouTube API)
      setLoadingStep('Mergulhando na API do YouTube');
      let youtubeContextData = "Buscador de Dados Real-time indisponível no momento. Use sua intuição máxima pre-treinada.";
      try {
           if (cachedYTData) {
               console.log("Using cached YouTube context data for niche identification");
               youtubeContextData = cachedYTData;
           } else {
               let searchUrl = '';
               if(topic) {
                    searchUrl = resolveApiUrl(`/api/youtube/search?part=snippet&type=video&q=${encodeURIComponent(topic)}&relevanceLanguage=${language.code}&regionCode=${language.region}&maxResults=10&order=viewCount`);
               } else {
                    searchUrl = resolveApiUrl(`/api/youtube/videos?part=snippet,statistics&chart=mostPopular&regionCode=${language.region}&maxResults=15`);
               }
               const ytRes = await fetch(searchUrl);
               const ytData = await ytRes.json();
               
               if(ytData.items && ytData.items.length > 0) {
                   const videoTitles = ytData.items.map(item => item.snippet?.title || item.title).join(" || ");
                   youtubeContextData = `TOP VÍDEOS MAIS VISTOS E EM ALTA NESTE EXATO MOMENTO NA REGIÃO [${language.region}]:\n${videoTitles}\n(Cruze isso para construir o modelo perfeito de concorrência).`;
                   
                   // Save to cache
                   sessionStorage.setItem(cacheKey, JSON.stringify({
                     timestamp: Date.now(),
                     data: youtubeContextData
                   }));
               }
           }
      } catch(e) {
          console.warn("YouTube live ingestion failed", e);
      }

      setLoadingStep('Decodificando Estratégia Apex');

      // 2. Strategy AI Generation V4 ORACLE
      const prompt = `Você é um Cientista de Dados Supremo do YouTube.
      Sua missão é identificar BURACOS (Gaps) escondidos na concorrência e criar o "Plano Tático Validado" de Baixíssimo Custo de Produção (Faceless), focando sempre na maior rentabilidade possível em Oceanos Azuis (sempre procure falhas na massa atual).
      
      TÓPICO PAI: "${topic || 'OS 3 INFRA-NICHOS OCULTOS MAIS LUCRATIVOS E FÁCEIS DO MOMENTO (Ex: Fatos Macabros ou Cripto-Gamer)'}"
      MERCADO ALVO: "${language.name}"
      
      CONTEXTO: DADOS AO VIVO DO YOUTUBE HOJE NO MERCADO SELECIONADO:
      """${youtubeContextData}"""
      
      REGRAS CRÍTICAS DE ENGENHARIA (NÃO AS QUEBRE):
      - "saturationScore": TEM QUE SER BAIXO (1 a 4). Foque na variação inexplorada do nicho, nunca no nicho genérico saturado.
      - "productionDifficulty": O ESFORÇO DEVE SER ZERO PARA O HUMANO. Grave essa nota como 1 a 3 no máximo. Sugira APENAS canais que possam ser 100%feitos com IA (Voz + Imagens base) sem câmera ou filmagem real.
      - "gapAnalysis": A Falha Inimiga. Explique em uma frase exata por que os youtubers locais não estão vendo isso e qual a falha exata da concorrência que deixará seu vídeo dominar em cliques (O Oceano Azul).
      - "monetizationStrategy": Vá MUITO ALÉM DO ADSENSE. Indique exatamente o tipo de afiliado, curso, CPA ou venda direta (Info-produto de R$ 47 a R$ 197) que se faz rios de dinheiro injetando silenciosamente nestes vídeos.
      - "channelArchetype": Formato validado. Ex: "Vídeo-Listas Rápidas de 3min", "Mini-Documentários de 9min Estilo Detetive", etc.
      
      Retorne a resposta EXATAMENTE no seguinte formato JSON puro (sem marcações e com chaves em pt-BR adaptadas pra o modelo):
      {
        "nicheName": "O Micro-Nicho Encontrado (PT-BR)",
        "viralPotential": 9,
        "saturationScore": 2,
        "productionDifficulty": 2,
        "categoryMultiplier": 1.5,
        "trendMomentum": "Nascente (Oceano Azul)",
        "strategyDescription": "Explicação pragmática da tática validada de criação e escala do canal.",
        "gapAnalysis": "A fraqueza fatal da concorrência (O Gap).",
        "channelArchetype": "Estrutura Base de Tempo e Estilo Narrativo",
        "monetizationStrategy": "Por trás dos panos: O que vender além de Views (Clickbank, Eduzz, Parceiros, etc).",
        "toolsRequired": ["ElevenLabs (Voz Mágica)", "Midjourney (Imagens)", "CapCut (Edição Seca)"],
        "targetAudience": "Mapeamento Psicológico de quem não consegue parar de ver isso.",
        "channelNames": ["Nome Criativo 1", "Nome 2", "Nome 3"],
        "videoThemes": ["Tema Inédito 1", "Tema Polêmico 2", "Tema 3"],
        "titleStructures": ["Fórmula Matadora 1", "Fórmula 2", "Fórmula 3"],
        "thumbnailIdeas": ["Como montar a Capa 1 (Alta Retenção)", "Ideia da Capa 2"],
        "thumbnailStyle": {
           "primaryColor": "#ff0080",
           "secondaryColor": "#00f3ff",
           "mood": "Cinematográfico Oculto",
           "keyElement": "Contraste Alto"
        },
        "competitors": [
           { "name": "Canal Rival A", "strength": "Efeitos visuais", "weakness": "Textos engessados sem gancho emocional" }
        ]
      }`;

      const response = await callAI(prompt, { gptKey });
      const cleanJson = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      setResult(parsed);
      saveToHistory(parsed, language);
    } catch (error) {
      console.error(error);
      alert("Falha Sistêmica na Extração do Youtube/Gemini:\\n" + error.message);
    } finally {
      setIsSearching(false);
      setLoadingStep('');
    }
  };

  const handleCopy = (text, section) => {
    navigator.clipboard.writeText(Array.isArray(text) ? text.join('\\n') : text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const SectionCopyBtn = ({ text, sectionId }) => (
    <button 
      onClick={() => handleCopy(text, sectionId)}
      className={`absolute top-4 right-4 p-2 rounded-lg border transition-all active:scale-95 z-10
        ${copiedSection === sectionId 
          ? 'bg-green-500/20 border-green-500 text-green-400' 
          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}
      `}
      title="Copiar Conteúdo"
    >
      {copiedSection === sectionId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  const ItemCopyBtn = ({ text, id }) => (
    <button 
      onClick={(e) => { e.stopPropagation(); handleCopy(text, id); }}
      className={`p-2 rounded-lg border transition-all active:scale-95 shrink-0
        ${copiedSection === id 
          ? 'bg-green-500/20 border-green-500 text-green-400' 
          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}
      `}
      title="Copiar Item"
    >
      {copiedSection === id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );

  const calculateRevenue = () => {
    if (!result || !language.rpm) return "$0";
    const multiplier = result.categoryMultiplier || 1.0;
    const projected = language.rpm * multiplier * 1000;
    return projected.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const getSaturationColor = (score) => {
      if(score <= 3) return 'text-green-400';
      if(score <= 6) return 'text-yellow-400';
      return 'text-red-500';
  };

  const getTrendColor = (momentum) => {
     if(momentum?.includes("Nascente") || momentum?.includes("Oceano") || momentum?.includes("Descob")) return "text-neon-cyan border-neon-cyan bg-neon-cyan/10";
     if(momentum?.includes("Alta")) return "text-green-400 border-green-500 bg-green-500/10";
     return "text-red-500 border-red-500 bg-red-500/10";
  };

  const getDifficultyColor = (score) => {
     if(score <= 3) return 'text-green-400';
     if(score <= 6) return 'text-yellow-400';
     return 'text-red-500';
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto gap-8 font-sans overflow-hidden">
      <header className="mb-12">
        <h2 className="text-3xl md:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-pink p-[2px] shadow-[0_0_20px_rgba(255,44,182,0.3)]">
            <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
              <Compass className="w-8 h-8 text-white" />
            </div>
          </div>
          Identificador de Nichos
        </h2>
        <p className="text-gray-400 mt-3 font-bold text-sm uppercase tracking-[0.2em] border-l-4 border-neon-pink pl-4 ml-2 italic">
          V4 ORACLE: Caçador de Oceanos Azuis & Gaps Táticos de Mercado
        </p>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-6 pb-12">
        {/* Input Panel */}
        <div className="glass-card p-8 border border-neon-purple/20 relative overflow-hidden group shrink-0 shadow-[0_0_50px_rgba(255,44,182,0.05)]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-neon-purple/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-neon-purple/10 transition-colors" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end relative z-10">
            <div className="md:col-span-2 flex flex-col gap-2">
               <label className="text-[10px] font-black text-neon-pink uppercase tracking-widest flex items-center gap-2">
                 <Target className="w-3 h-3" /> Ideia Principal (Vazio para Mergulho Geral)
               </label>
               <input 
                 type="text"
                 value={topic}
                 onChange={(e) => setTopic(e.target.value)}
                 placeholder="Ex: Lifehacks e Sustentabilidade..."
                 className="bg-dark/60 border border-white/10 rounded-xl px-5 py-4 text-white font-bold text-sm focus:outline-none focus:border-neon-pink/50 placeholder:text-gray-600 transition-all w-full shadow-inner"
               />
            </div>

            <div className="flex flex-col gap-2">
               <label className="text-[10px] font-black text-neon-cyan uppercase tracking-widest flex items-center gap-2">
                 <Globe className="w-3 h-3" /> Mercado Alvo (País/Idioma)
               </label>
               <select 
                 value={language.code}
                 onChange={(e) => setLanguage(LANGUAGES.find(l => l.code === e.target.value))}
                 className="bg-dark/60 border border-white/10 rounded-xl px-5 py-4 text-white font-bold text-sm focus:outline-none focus:border-neon-cyan/50 hover:bg-dark/80 transition-all w-full cursor-pointer appearance-none shadow-inner"
               >
                 {LANGUAGES.map(lang => (
                   <option key={lang.code} value={lang.code}>{lang.name}</option>
                 ))}
               </select>
            </div>

            <button 
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full py-4 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(255,44,182,0.4)] hover:shadow-[0_0_30px_rgba(0,243,255,0.6)] hover:from-neon-cyan hover:to-blue-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 h-[52px]"
            >
               {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RadarScanIcon />}
               {isSearching ? loadingStep : "Extrair Mercado"}
            </button>
          </div>
        </div>

        {/* Results View */}
        <AnimatePresence mode="wait">
           {isSearching ? (
              <motion.div 
                 key="loading"
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }}
                 className="glass-card p-32 flex flex-col items-center justify-center border border-white/5 relative overflow-hidden"
               >
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
                 <LoadingSpinner message="Realizando Varredura Continental..." size="xl" />
                 <p className="mt-8 text-[11px] font-black text-neon-purple uppercase tracking-[0.4em] animate-pulse glow-text">{loadingStep}</p>
                 <div className="w-64 h-1 bg-white/5 mt-4 overflow-hidden rounded-full relative">
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-neon-cyan to-neon-purple w-full animate-[shimmer_2s_infinite]" />
                 </div>
              </motion.div>
           ) : result ? (
              <motion.div 
                 key="results"
                 initial={{ opacity: 0, scale: 0.98 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="flex flex-col gap-6"
              >
                 {/* Hero Result Panel V3 */}
                 <div className="glass-card border border-neon-cyan/20 p-8 flex flex-col xl:flex-row gap-8 relative items-stretch shadow-[0_0_40px_rgba(0,243,255,0.05)] overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-neon-cyan/10 rounded-full blur-[120px] pointer-events-none" />
                    
                    <div className="absolute top-4 right-4 flex gap-2">
                       <button 
                         onClick={redoSearch}
                         className="p-2 rounded-xl bg-white/5 hover:bg-neon-pink/20 text-gray-400 hover:text-neon-pink transition-all z-10 border border-white/5"
                         title="Recalcular Dados"
                       >
                         <RefreshCw className="w-3.5 h-3.5" />
                       </button>
                       <SectionCopyBtn text={JSON.stringify(result, null, 2)} sectionId="all" />
                    </div>
                    
                    {/* Left Panel: Primary Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-1 gap-4 w-full xl:w-56 shrink-0 relative z-10">
                        {/* Viral Score */}
                        <div className="flex flex-col items-center justify-center p-5 border border-neon-cyan/20 rounded-2xl bg-dark/80 relative group overflow-hidden">
                           <div className="absolute inset-0 bg-gradient-to-b from-neon-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Flame className="w-3 h-3 text-neon-cyan" /> Apetite Viral</span>
                           <span className="text-5xl font-black text-white leading-none tracking-tighter">
                              {result.viralPotential}
                              <span className="text-xl text-neon-cyan/50 ml-1">/10</span>
                           </span>
                        </div>
                        
                        {/* Saturation Score */}
                        <div className="flex flex-col items-center justify-center p-5 border border-white/10 rounded-2xl bg-dark/80 relative">
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <AlertTriangle className={`w-3 h-3 ${getSaturationColor(result.saturationScore)}`} /> Saturação Real
                           </span>
                           <span className={`text-4xl font-black leading-none tracking-tighter ${getSaturationColor(result.saturationScore)}`}>
                              {result.saturationScore}
                              <span className="text-xl text-gray-600 ml-1">/10</span>
                           </span>
                        </div>

                        {/* Production Difficulty */}
                        <div className="flex flex-col items-center justify-center p-5 border border-white/5 rounded-2xl bg-dark/80 relative">
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <Zap className={`w-3 h-3 ${getDifficultyColor(result.productionDifficulty)}`} /> Esforço Produção
                           </span>
                           <span className={`text-4xl font-black leading-none tracking-tighter ${getDifficultyColor(result.productionDifficulty)}`}>
                              {result.productionDifficulty || "2"}
                              <span className="text-xl text-gray-600 ml-1">/10</span>
                           </span>
                        </div>

                         {/* Trend Phase Graph Mock */}
                         <div className={`col-span-2 md:col-span-2 xl:col-span-1 flex flex-col items-center justify-center p-3 border rounded-2xl ${getTrendColor(result.trendMomentum)} relative overflow-hidden backdrop-blur-md`}>
                           <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">Oceano de Mercado</span>
                           <span className="text-sm text-center md:text-base font-black uppercase tracking-widest flex items-center gap-2 px-2">
                             {result.trendMomentum}
                           </span>
                        </div>
                    </div>

                    {/* Center Context */}
                    <div className="flex-1 space-y-5 flex flex-col justify-center relative z-10">
                       <div className="flex flex-wrap items-center gap-3">
                           <div className="inline-flex px-4 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full text-[11px] font-black text-green-400 uppercase tracking-[0.2em] items-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                              <DollarSign className="w-3.5 h-3.5" /> Est. Ganho/1M: {calculateRevenue()}
                           </div>
                           <div className="inline-flex px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                              Peso do Nicho: {result.categoryMultiplier || 1}x
                           </div>
                       </div>
                       
                       <h3 className="text-4xl md:text-5xl lg:text-7xl font-black text-white italic tracking-tighter leading-none">{result.nicheName}</h3>
                       <div className="relative group/strat space-y-4">
                          {/* STrategy Output */}
                          <div className="border-l-4 border-neon-cyan pl-5 py-1 pr-10">
                             <span className="block text-[10px] font-black text-neon-cyan uppercase tracking-widest mb-1">A Estrutura Validada:</span>
                             <p className="text-base font-bold text-gray-300 leading-relaxed">
                                {result.strategyDescription}
                             </p>
                          </div>
                          
                          {/* Gap Analysis Drop */}
                          <div className="border-l-4 border-neon-pink pl-5 py-1 pr-10">
                             <span className="block text-[10px] font-black text-neon-pink uppercase tracking-widest mb-1 flex items-center gap-2"><Target className="w-3 h-3" /> A Fraqueza (Gap de Concorrência):</span>
                             <p className="text-[13px] font-medium text-gray-400 italic leading-relaxed">
                                "{result.gapAnalysis}"
                             </p>
                          </div>
                          
                          <div className="absolute top-2 right-0 opacity-0 group-hover/strat:opacity-100 transition-opacity flex flex-col gap-2">
                             <ItemCopyBtn text={`ESTRUTURA: ${result.strategyDescription}\n\nGAP (FALHA DELES): ${result.gapAnalysis}`} id="strat-desc" />
                          </div>
                       </div>
                    </div>

                    {/* Right Panel: Actions */}
                    <div className="flex flex-col justify-end xl:w-64 shrink-0 mt-6 xl:mt-0 relative z-10 gap-3">
                        <div className="w-full py-5 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center gap-2">
                           <Target className="w-4 h-4 text-white/20" />
                           <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">Oportunidade Mapeada</span>
                        </div>

                       <div className="w-full mb-2 bg-gradient-to-r from-green-600/10 to-transparent border border-green-500/20 rounded-xl p-3 shadow-inner">
                           <span className="block text-[9px] font-black text-green-500 uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Monetização Camuflada</span>
                           <p className="text-[10px] font-bold text-green-100 leading-tight">
                              {result.monetizationStrategy}
                           </p>
                        </div>

                       <div className="glass-card bg-dark/60 border border-white/5 p-4 rounded-xl flex items-center gap-3 relative group/aud">
                          <Users className="w-8 h-8 text-neon-purple p-1.5 bg-neon-purple/10 rounded-lg shrink-0" />
                          <div className="flex-1 overflow-hidden pr-6">
                            <span className="block text-[8px] font-black text-neon-purple uppercase tracking-[0.2em] mb-0.5">Perfil Psicológico</span>
                            <p className="text-[10px] text-gray-300 font-bold leading-tight line-clamp-3" title={result.targetAudience}>{result.targetAudience}</p>
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover/aud:opacity-100 transition-opacity">
                             <ItemCopyBtn text={result.targetAudience} id="aud-desc" />
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Matrix Bento Grid V3 */}
                 <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    
                    {/* Visual Predizer - Thumbnail Blueprint (New Feature) */}
                    <div className="glass-card md:col-span-3 xl:col-span-1 border border-white/5 relative overflow-hidden flex flex-col group p-0 min-h-[400px]">
                       <div className="p-4 border-b border-white/5 bg-black/40 flex items-center justify-between gap-2 z-10 relative">
                         <div className="flex items-center gap-2">
                           <LayoutTemplate className="w-4 h-4 text-neon-pink" />
                           <span className="text-[10px] font-black text-neon-pink uppercase tracking-[0.2em]">Blueprint Visual</span>
                         </div>
                         <span className="text-[8px] font-black uppercase text-gray-500 bg-white/5 px-2 py-1 rounded truncate max-w-[120px]">{result.channelArchetype}</span>
                       </div>
                       
                       <div className="p-6 flex-1 flex flex-col justify-center items-center relative overflow-hidden min-h-[200px]">
                         {/* CSS Mockup Representation */}
                         <div className="w-full max-w-[280px] aspect-video rounded-xl border border-white/20 shadow-2xl relative overflow-hidden flex flex-col p-4"
                              style={{ 
                                background: `linear-gradient(135deg, ${result.thumbnailStyle?.primaryColor || '#1a1a2e'} 0%, ${result.thumbnailStyle?.secondaryColor || '#16213e'} 100%)` 
                              }}
                         >
                            <div className="absolute inset-0 bg-black/30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 mix-blend-overlay" />
                            <h4 className="text-white font-black text-lg leading-tight uppercase relative z-10 w-2/3 break-words mix-blend-difference drop-shadow-md">
                               [TEXTO DE CHOCAR]
                            </h4>
                            <div className="absolute bottom-4 right-4 text-5xl opacity-40 mix-blend-overlay">👤</div>
                            <div className="mt-auto relative z-10 text-[8px] font-black bg-black/50 text-white w-fit px-2 py-0.5 rounded uppercase">{result.thumbnailStyle?.keyElement || 'Elemento Foco'}</div>
                         </div>
                       </div>

                       <div className="p-4 border-t border-white/5 bg-dark/60 space-y-4">
                          <p className="text-[11px] text-gray-400 font-bold leading-relaxed border-b border-white/5 pb-2">
                            <span className="text-white">Direção de Arte:</span> {result.thumbnailStyle?.mood || 'Vibrante e Misterioso'}.
                          </p>
                          
                          {/* Tools Needed Badges */}
                          {(result.toolsRequired && result.toolsRequired.length > 0) && (
                              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-white/5">
                                 {result.toolsRequired.map((tool, idx) => (
                                    <span key={idx} className="text-[8px] font-black text-white/70 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded shadow-sm">
                                       {tool}
                                    </span>
                                 ))}
                              </div>
                           )}

                          <div className="space-y-2">
                             {result.thumbnailIdeas?.map((idea, idx) => (
                                <div key={idx} className="flex items-start justify-between gap-2 p-2 bg-white/5 rounded-lg group/thumb">
                                   <p className="text-[10px] text-gray-400 font-medium leading-tight line-clamp-2">{idea}</p>
                                   <div className="opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                                      <ItemCopyBtn text={idea} id={`thumb-idea-${idx}`} />
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>

                    {/* Competitors Tracker (New Feature) */}
                    <div className="glass-card md:col-span-3 xl:col-span-3 border border-neon-purple/20 relative p-6 bg-[url('https://www.transparenttextures.com/patterns/micro-carbon.png')]">
                       <SectionCopyBtn text={JSON.stringify(result.competitors)} sectionId="competitors" />
                       <h4 className="text-[11px] font-black text-neon-purple uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                          <Target className="w-4 h-4" /> Alvos a Serem Desbancados
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {result.competitors && result.competitors.map((comp, i) => (
                             <div key={i} className="p-5 bg-black/60 rounded-xl border border-white/10 hover:border-neon-purple/50 transition-colors relative overflow-hidden group/comp">
                                <div className="absolute top-0 left-0 w-1 h-full bg-neon-purple" />
                                <div className="absolute top-4 right-4 opacity-0 group-hover/comp:opacity-100 transition-opacity">
                                   <ItemCopyBtn text={`${comp.name} - Força: ${comp.strength} - Fraqueza: ${comp.weakness}`} id={`comp-${i}`} />
                                </div>
                                <h5 className="text-lg font-black text-white italic tracking-tight mb-3 flex justify-between items-center pr-8">
                                  {comp.name} <span className="text-[9px] font-mono text-neon-purple/50">TARGET {i+1}</span>
                                </h5>
                                <div className="space-y-2">
                                  <div className="flex gap-2 items-start">
                                    <span className="text-green-500 mt-1 shrink-0">▲</span>
                                    <p className="text-xs text-gray-300 font-bold leading-tight"><span className="text-gray-500 uppercase text-[9px] tracking-widest block mb-1">Força Operacional</span> {comp.strength}</p>
                                  </div>
                                  <div className="flex gap-2 items-start">
                                    <span className="text-red-500 mt-1 shrink-0">▼</span>
                                    <p className="text-xs text-gray-300 font-bold leading-tight"><span className="text-gray-500 uppercase text-[9px] tracking-widest block mb-1">Ponto de Ruptura (Sua Vantagem)</span> {comp.weakness}</p>
                                  </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>

                    {/* Channel Names */}
                    <div className="glass-card p-6 border border-white/5 relative group xl:col-span-1">
                       <SectionCopyBtn text={result.channelNames} sectionId="names" />
                       <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-5">
                          <Youtube className="w-3 h-3" /> Nomenclatura Preditiva
                       </h4>
                       <ul className="space-y-2.5">
                          {Array.isArray(result.channelNames) && result.channelNames.map((name, i) => (
                             <li key={i} className="px-4 py-3 bg-white/5 rounded-xl border border-white/5 text-sm font-bold text-gray-200 hover:bg-white/10 transition-all flex justify-between items-center gap-2 group">
                                <span className="truncate" title={name}>{name}</span>
                                <button 
                                  onClick={() => handleCopy(name, `name-${i}`)}
                                  className={`p-2 rounded-lg transition-all border flex items-center justify-center shrink-0
                                    ${copiedSection === `name-${i}` ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/30'}
                                  `}
                                >
                                  {copiedSection === `name-${i}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                             </li>
                          ))}
                       </ul>
                    </div>

                    {/* Title Structures */}
                    <div className="glass-card p-6 border border-white/5 relative group md:col-span-2 xl:col-span-2">
                       <SectionCopyBtn text={result.titleStructures} sectionId="titles" />
                       <h4 className="text-[10px] font-black text-neon-cyan uppercase tracking-[0.2em] flex items-center gap-2 mb-5">
                          <Type className="w-3 h-3" /> Fórmulas de Escrita (Copywriting)
                       </h4>
                       <div className="space-y-3">
                          {Array.isArray(result.titleStructures) && result.titleStructures.map((title, i) => (
                             <div key={i} className="px-5 py-3.5 bg-dark/40 border-l-2 border-neon-cyan/50 rounded-r-xl shadow-inner text-sm font-black text-white hover:border-neon-cyan transition-all flex justify-between items-center gap-3 group">
                                <span className="break-words w-full">{title}</span>
                                <button 
                                  onClick={() => handleCopy(title, `title-${i}`)}
                                  className={`p-2 rounded-lg transition-all border flex items-center justify-center shrink-0
                                    ${copiedSection === `title-${i}` ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/30'}
                                  `}
                                >
                                  {copiedSection === `title-${i}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                             </div>
                          ))}
                       </div>
                    </div>

                    {/* Video Ideas */}
                    <div className="glass-card p-6 border border-white/5 relative group xl:col-span-1">
                       <SectionCopyBtn text={result.videoThemes} sectionId="ideas" />
                       <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-5">
                          <Video className="w-3 h-3" /> Temas de Estreia
                       </h4>
                       <ul className="space-y-3">
                          {Array.isArray(result.videoThemes) && result.videoThemes.map((theme, i) => (
                             <li key={i} className="flex items-center justify-between gap-3 text-[13px] font-bold text-gray-300 leading-tight bg-dark/40 p-3 rounded-xl border border-white/5 group">
                                <div className="flex gap-3 items-start overflow-hidden w-full">
                                   <span className="text-orange-400 shrink-0 mt-0.5">{i+1}.</span>
                                   <span className="line-clamp-2 w-full" title={theme}>{theme}</span>
                                </div>
                                <button 
                                  onClick={() => handleCopy(theme, `theme-${i}`)}
                                  className={`p-2 rounded-lg transition-all border flex items-center justify-center shrink-0 active:scale-95
                                    ${copiedSection === `theme-${i}` ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}
                                  `}
                                >
                                  {copiedSection === `theme-${i}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                             </li>
                          ))}
                       </ul>
                    </div>

                 </div>
              </motion.div>
           ) : null}
        </AnimatePresence>

        {/* History Section V3 */}
        {history.length > 0 && (
          <div className="mt-8 pt-8 border-t border-white/10 shrink-0 pb-10">
             <div className="flex items-center justify-between mb-6">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   <History className="w-4 h-4 text-neon-purple" /> Memória de Mapeamento
                </h4>
                <button 
                   onClick={clearHistory}
                   className="text-[9px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-1 transition-colors bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg"
                >
                   <Trash2 className="w-3 h-3" /> Expurgo Total
                </button>
             </div>
             <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {history.map((entry) => (
                   <button 
                      key={entry.id}
                      onClick={() => loadFromHistory(entry)}
                      className="glass-card shrink-0 p-5 border border-white/5 hover:border-white/20 transition-all text-left w-72 group relative overflow-hidden flex flex-col shadow-lg"
                   >
                      <div className="flex justify-between items-start mb-3 relative z-10 w-full">
                         <span className="text-[8px] font-black text-white/50 bg-white/5 px-2 py-1 rounded uppercase tracking-widest">{entry.language?.region || entry.language?.name}</span>
                         <span className="text-[10px] font-black text-neon-cyan drop-shadow-md">V: {entry.data.viralPotential}</span>
                      </div>
                      
                      <h5 className="text-[14px] font-black text-white leading-tight mb-2 truncate">{entry.data.nicheName}</h5>
                      
                      <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between relative z-10 w-full gap-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border ${getTrendColor(entry.data.trendMomentum)}`}>
                             {entry.data.trendMomentum || 'Trend'}
                          </span>
                          <span className={`text-[10px] font-black ${getSaturationColor(entry.data.saturationScore)}`}>
                             Sat: {entry.data.saturationScore}
                          </span>
                      </div>
                   </button>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Internal icon for the main scanning button
function RadarScanIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.183 1.996-.519 2.9m1.938 1.562c.46-.816.837-1.688 1.12-2.607M12 7a4 4 0 00-4 4ml8 10a19.983 19.983 0 00-5.748-4.254" />
    </svg>
  );
}
