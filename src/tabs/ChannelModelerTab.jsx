import React, { useState, useEffect } from 'react';
import { Youtube, Search, Loader2, Target, Brain, Palette, TrendingUp, Flame, Dna, CheckCircle, History, Trash2, Globe, AlertCircle, Sparkles, Wand2, Lightbulb, BarChart4, Layout, Layers, ShieldCheck, XCircle, ChevronRight, PanelLeftClose, PanelLeft, Eye, Video, Zap, MousePointer2, Copy, Check, MapPin, Gauge, Languages, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { callGemini, callGPT } from '../utils/aiUtils';
import { t } from '../utils/i18n';
import { stackPush, stackRead, stackRemove } from '../utils/stackUtils';
import { resolveApiUrl } from '../utils/apiUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';

const VIRAL_HOOKS = [
  { id: 'secret', name: 'O Segredo Revelado', icon: ShieldCheck, color: 'neon-cyan', prompt: 'Curiosidade extrema e segredos ocultos', isHot: true },
  { id: 'error', name: 'O Grande Erro', icon: XCircle, color: 'neon-pink', prompt: 'Medo de errar e perda de dinheiro/tempo' },
  { id: 'journey', name: 'Transformação Real', icon: TrendingUp, color: 'green-400', prompt: 'Jornada de superação e resultados práticos' },
  { id: 'truth', name: 'Verdade Chocante', icon: AlertCircle, color: 'orange-400', prompt: 'Controvérsia e fatos que ninguém conta' },
  { id: 'fast', name: 'Caminho Rápido', icon: Zap, color: 'yellow-400', prompt: 'Velocidade, hacks e atalhos de eficiência' },
  { id: 'proof', name: 'A Prova Social', icon: CheckCircle, color: 'neon-purple', prompt: 'Estudo de caso e prova de conceito' }
];

export const ChannelModelerTab = () => {
  const { configs } = useSystemStatus();
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState([]);
  const [activeHook, setActiveHook] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  
  const [selectedLanguage, setSelectedLanguage] = useState({ name: 'Brasil', code: 'pt', flag: '🇧🇷' });
  const [localizedChannelNames, setLocalizedChannelNames] = useState([]);
  const [isTranslatingNames, setIsTranslatingNames] = useState(false);
  const workspaceRef = React.useRef(null);

  useEffect(() => {
    setHistory(stackRead('guru_channel_modeling'));
  }, []);

  const extractChannelIdOrHandle = (url) => {
    if (!url) return null;
    if (url.startsWith('@')) return { type: 'handle', value: url };
    const handleMatch = url.match(/youtube\.com\/(@[\w.-]+)/);
    if (handleMatch) return { type: 'handle', value: handleMatch[1] };
    const idMatch = url.match(/youtube\.com\/channel\/([\w-]+)/);
    if (idMatch) return { type: 'id', value: idMatch[1] };
    if (url.startsWith('UC') && url.length > 20) return { type: 'id', value: url };
    return null;
  };

  const fetchChannelData = async (info) => {
    try {
      let channelId = info.value;
      if (info.type === 'handle') {
        const searchRes = await fetch(resolveApiUrl(`/api/youtube/search?part=snippet&type=channel&q=${info.value}`));
        const searchData = await searchRes.json();
        if (searchData.items && searchData.items.length > 0) {
          channelId = searchData.items[0].id.channelId;
        } else {
          throw new Error('Channel not found via API');
        }
      }
      const channelRes = await fetch(resolveApiUrl(`/api/youtube/channels?part=snippet,statistics&id=${channelId}`));
      const channelData = await channelRes.json();
      if (!channelData.items || channelData.items.length === 0) throw new Error('Channel details not found');
      const snippet = channelData.items[0].snippet;
      const stats = channelData.items[0].statistics;
      const viralRes = await fetch(resolveApiUrl(`/api/youtube/search?part=snippet&channelId=${channelId}&order=viewCount&type=video&maxResults=5`));
      const viralData = await viralRes.json();
      const latestRes = await fetch(resolveApiUrl(`/api/youtube/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5`));
      const latestData = await latestRes.json();
      const videoIds = [...(viralData.items || []).map(v => v.id.videoId), ...(latestData.items || []).map(v => v.id.videoId)].filter(Boolean).join(',');
      let videoStats = {};
      if (videoIds) {
        const statsRes = await fetch(resolveApiUrl(`/api/youtube/videos?part=statistics&id=${videoIds}`));
        const statsData = await statsRes.json();
        (statsData.items || []).forEach(v => { videoStats[v.id] = v.statistics.viewCount; });
      }
      return {
        id: channelId,
        title: snippet.title,
        description: snippet.description,
        thumbnail: snippet.thumbnails.medium.url,
        customUrl: snippet.customUrl,
        subscriberCount: stats.subscriberCount,
        viewCount: stats.viewCount,
        videoCount: stats.videoCount,
        viralVideos: (viralData.items || []).map(v => ({ title: v.snippet.title, viewCount: videoStats[v.id.videoId] || 0 })),
        latestVideos: (latestData.items || []).map(v => ({ title: v.snippet.title, viewCount: videoStats[v.id.videoId] || 0 }))
      };
    } catch (err) {
      console.error('Fetch error:', err);
      return null;
    }
  };

  const handleAnalyze = async () => {
    if (!url) return;
    setIsAnalyzing(true);
    setResult(null);
    setGeneratedTitles([]);
    setLocalizedChannelNames([]);
    setActiveHook(null);
    setSelectedLanguage({ name: 'Brasil', code: 'pt', flag: '🇧🇷' });

    const info = extractChannelIdOrHandle(url);
    const realData = info ? await fetchChannelData(info) : null;

    const statsContext = realData ? `
DADOS REAIS DO CANAL (YouTube API):
- Nome: ${realData.title}
- Inscritos: ${realData.subscriberCount}
- Visualizações Totais: ${realData.viewCount}
- Vídeos Postados: ${realData.videoCount}

PRINCIPAIS VÍDEOS (OUTLIERS):
${realData.viralVideos.map(v => `- ${v.title} (${v.viewCount} views)`).join('\n')}

ÚLTIMOS VÍDEOS:
${realData.latestVideos.map(v => `- ${v.title} (${v.viewCount} views)`).join('\n')}
` : `URL do canal: ${url}`;

    const prompt = `Você é um especialista em crescimento de canais virais no YouTube e engenharia reversa de conteúdo.

IMPORTANTE: Responda usando exatamente os delimitadores [SECAO_1] até [SECAO_9]. Seja direto e tático.

Sua tarefa é analisar profundamente um canal a partir dos dados reais fornecidos e extrair padrões replicáveis.

${statsContext}

[SECAO_1] ANÁLISE DO CANAL (Tempo, Frequência, Views, Outliers encontrados)
[SECAO_2] IDENTIFICAÇÃO DE NICHO (Nivel 1, 2, 3 e Tema Central)
[SECAO_3] ENGENHARIA DE CONTEÚDO (Títulos, Copy, Gatilhos e Palavras mais fortes)
[SECAO_4] ANÁLISE DE CAPAS (Design, Cores, Emoções, Clickbait)
[SECAO_5] PADRÕES VIRAIS (O que mais gera views baseado nos outliers, Retenção, Formatos)
[SECAO_6] OPORTUNIDADES (Brechas, Diferenciação, Temas pouco explorados)
[SECAO_7] MODELAGEM DO NOVO CANAL (Nome sugerido, Posicionamento, 10 IDEIAS VIRAIS)
[SECAO_8] VALIDAÇÃO (Responda: 50+ vídeos? Dor clara? RESULTADO FINAL: MICRONICHO IDEAL ou NÃO)
[SECAO_9] MERCADOS GLOBAIS (Priorize mercados com a MENOR CONCORRÊNCIA absoluta para replicar a estratégia, independentemente do RPM/CPM. Identifique onde há escassez de conteúdo de qualidade neste nicho. Justifique.)

IMPORTANTE: Ao final da SECAO 9, coloque uma linha com este formato exato:
ESTRATÉGIA_PAISES: [Estados Unidos|en, México|es, Brasil|pt, Índia|hi]

Foque em viralização e padrões replicáveis. Use frases curtas e diretas.`;

    try {
      const gptKey = localStorage.getItem('guru_gpt_key')?.trim();
      const geminiKey = localStorage.getItem('guru_gemini_key')?.trim();
      let responseText = "";
      try {
        if (!gptKey || gptKey.includes('YOUR_')) throw new Error("GPT key missing");
        responseText = await callGPT(gptKey, prompt);
      } catch (gptError) {
        if (geminiKey && geminiKey.length > 5) responseText = await callGemini(geminiKey, prompt);
        else throw new Error("Chave do GPT ou Gemini ausente.");
      }
      const parsedSections = parseSections(responseText);
      const newAnalysis = {
        id: Date.now().toString(),
        url,
        date: new Date().toLocaleString(),
        content: responseText,
        sections: parsedSections,
        channelMeta: realData
      };
      
      const updatedHistory = stackPush('guru_channel_modeling', newAnalysis);
      setHistory(updatedHistory);
      setResult(newAnalysis);
      setActiveHistoryId(newAnalysis.id);
      setUrl('');
      
      // Auto-select the first suggested market if available
      if (parsedSections.countries && parsedSections.countries.length > 0) {
        const topMarket = parsedSections.countries[0];
        setSelectedLanguage(topMarket);
        translateChannelNames(topMarket);
      }

      if (workspaceRef.current) {
        workspaceRef.current.scrollTop = 0;
      }
    } catch (error) {
      alert(`Erro na análise: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseSections = (text) => {
    if (!text) return {};
    const sections = {};
    for (let i = 1; i <= 9; i++) {
      const currentMarker = `[SECAO_${i}]`;
      const nextMarker = `[SECAO_${i + 1}]`;
      const startIdx = text.indexOf(currentMarker);
      if (startIdx === -1) continue;
      let endIdx = text.indexOf(nextMarker);
      if (endIdx === -1) endIdx = text.length;
      let content = text.substring(startIdx + currentMarker.length, endIdx).trim();
      content = content.replace(/^ANÁLISE.*|^IDENTIFICAÇÃO.*|^ENGENHARIA.*|^ANÁLISE DE CAPAS.*|^PADRÕES.*|^OPORTUNIDADES.*|^MODELAGEM.*|^VALIDAÇÃO.*|^MERCADOS.*/i, '').trim();
      sections[i] = content;
    }
    
    const countriesMatch = text.match(/ESTRATÉGIA_PAISES:\s*\[(.*?)\]/i) || text.match(/PAISES:\s*\[(.*?)\]/i);
    if (countriesMatch) {
       sections.countries = countriesMatch[1].split(',').map(item => {
          const parts = item.trim().split('|');
          const name = parts[0];
          const code = parts[1] || 'en';
          return { name, code, flag: getFlag(code) };
       }).filter(c => c.name && c.code);
    }
    return sections;
  };

  const getFlag = (code) => {
    const flags = { 'pt': '🇧🇷', 'en': '🇺🇸', 'es': '🇲🇽', 'hi': '🇮🇳', 'id': '🇮🇩', 'fr': '🇫🇷', 'de': '🇩🇪', 'jp': '🇯🇵', 'ru': '🇷🇺' };
    return flags[code.toLowerCase()] || '🌐';
  };

  const handleGenerateHookTitles = async (hook) => {
    if (!result || isGeneratingTitles) return;
    setIsGeneratingTitles(true);
    setActiveHook(hook);
    setGeneratedTitles([]);
    
    const niche = result.sections?.[2] || 'Canal Viral';
    const mainTopic = result.channelMeta?.title || 'este nicho';
    const langName = selectedLanguage.code === 'pt' ? 'Português' : 
                     selectedLanguage.code === 'en' ? 'Inglês' : 
                     selectedLanguage.code === 'es' ? 'Espanhol' : 
                     selectedLanguage.code === 'hi' ? 'Hindi' : selectedLanguage.name;

    const prompt = `Aja como o melhor estrategista de títulos virais em ${langName}.
Crie 4 títulos virais numerados de 1 a 4 para o nicho "${niche}" e canal "${mainTopic}".
Gatilho: ${hook.name} (${hook.prompt}). Escreva apenas em ${langName.toUpperCase()}. CTR Explosivo!`;

    try {
      const gptKey = localStorage.getItem('guru_gpt_key')?.trim();
      const geminiKey = localStorage.getItem('guru_gemini_key')?.trim();
      let responseText = "";
      try { responseText = await callGPT(gptKey, prompt); } catch (err) { responseText = await callGemini(geminiKey, prompt); }
      
      const lines = responseText.split('\n').filter(l => l.trim().length > 3);
      // Identify titles (lines starting with numbers) vs intro
      const titles = lines.filter(l => /^\d+[\.\s\)]/.test(l.trim())).map(l => l.replace(/^[\d\s\.\-)]+/, '').replace(/^["']|["']$/g, '').trim());
      const intro = lines.find(l => !/^\d+[\.\s\)]/.test(l.trim())) || "";
      
      setGeneratedTitles(titles.length > 0 ? titles : lines.slice(0, 4));
      // Store intro message separately if needed or just use logic in render
      if (intro) setGeneratedTitles(prev => [ `INFO:${intro}`, ...prev ]);
      
    } catch (err) { console.error(err); } finally { setIsGeneratingTitles(false); }
  };

  const translateChannelNames = async (langObj) => {
    if (!result || isTranslatingNames) return;
    setIsTranslatingNames(true);
    const originalNames = result.sections?.[7] || "Nome de Canal";
    const lang = langObj.name;

    const prompt = `Sugira 3 nomes de canais atraentes e virais especificamente para o idioma e mercado: ${lang}. 
Considere a cultura local. Contexto do canal original: "${originalNames}". 
Retorne APENAS os 3 nomes separados por vírgula, nada mais.`;

    try {
      const gptKey = localStorage.getItem('guru_gpt_key')?.trim();
      const geminiKey = localStorage.getItem('guru_gemini_key')?.trim();
      let responseText = "";
      try { 
        responseText = await callGPT(gptKey, prompt); 
      } catch (err) { responseText = await callGemini(geminiKey, prompt); }
      
      const names = responseText.split(',').map(n => n.replace(/^[\d\s\.\-)]+/, '').replace(/^["']|["']$/g, '').trim()).filter(n => n.length > 2);
      setLocalizedChannelNames(names);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsTranslatingNames(false); 
    }
  };

  const loadFromHistory = (item) => {
    if (!item) return;
    setIsAnalyzing(false);
    setResult(null);
    
    setTimeout(() => {
      try {
        const rawContent = item.content || "";
        const sections = parseSections(rawContent);
        const hydratedResult = { ...item, sections, id: item.id || `hist-${Date.now()}` };
        setResult(hydratedResult);
        setActiveHistoryId(hydratedResult.id);
        setGeneratedTitles([]);
        setLocalizedChannelNames([]);
        setActiveHook(null);
        setSelectedLanguage({ name: 'Brasil', code: 'pt', flag: '🇧🇷' });
        if (workspaceRef.current) workspaceRef.current.scrollTop = 0;
      } catch (e) { console.error(e); }
    }, 50);
  };

  const removeFromHistory = (e, id) => {
    e.stopPropagation();
    const updated = stackRemove('guru_channel_modeling', id);
    setHistory(updated);
    if (result && result.id === id) { setResult(null); setActiveHistoryId(null); }
  };

  const copyTitle = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    const n = parseInt(num);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const StatBadge = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg flex flex-col justify-center items-center leading-tight min-w-[100px] gap-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3 h-3 text-${color}`} />
        <span className="text-[9px] text-gray-500 uppercase font-black">{label}</span>
      </div>
      <span className="text-white font-black text-sm">{value}</span>
    </div>
  );

  const DashboardCard = ({ title, icon: Icon, color, children, className }) => (
    <div className={`glass-card p-6 border border-white/5 relative overflow-hidden group ${className}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-${color}/10 transition-colors pointer-events-none`} />
      <h4 className="text-[10px] font-black text-gray-500 mb-4 flex items-center gap-2 uppercase tracking-[0.2em] border-b border-white/5 pb-3">
        <Icon className={`w-3.5 h-3.5 text-${color}`} /> {title}
      </h4>
      <div className="text-gray-300 text-xs leading-relaxed font-sans whitespace-pre-wrap">{children}</div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full w-full max-w-[1700px] mx-auto gap-6 lg:overflow-hidden font-sans">
      
      {/* Sidebar - Left */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[400px] flex flex-col h-auto lg:h-full lg:pr-8 lg:border-r lg:border-white/5 overflow-y-auto custom-scrollbar shrink-0 px-4 lg:px-0"
      >
        <header className="mb-8 mt-4">
          <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-neon-cyan to-blue-600 shadow-xl shrink-0 overflow-hidden border border-white/10">
               <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            {t('modelador.title')}
          </h2>
          <p className="text-gray-400 mt-2 font-medium text-xs md:text-sm border-l-2 border-neon-cyan pl-3 ml-2">{t('modelador.subtitle')}</p>
        </header>

        <div className="space-y-8 pb-12">
          <div className="glass-card p-6 border border-white/5 relative overflow-hidden bg-black/20">
            <label className="text-[10px] font-black text-gray-500 mb-3 flex items-center gap-2 uppercase tracking-[0.2em]">
              <Globe className="w-3 h-3 text-neon-cyan" /> {t('modelador.input_label')}
            </label>
            <input 
              type="text"
              className="w-full bg-dark/40 border border-white/5 rounded-lg p-4 text-white text-md focus:outline-none focus:border-neon-cyan/50 transition-all font-bold mb-3"
              placeholder={t('modelador.input_placeholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !url}
              className="w-full py-4 rounded-xl flex items-center justify-center gap-3 font-black text-sm transition-all bg-white text-dark uppercase tracking-widest hover:bg-neon-cyan disabled:opacity-30 shadow-xl active:scale-95"
            >
              {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin text-neon-cyan" /> : <Sparkles className="w-5 h-5 text-neon-cyan" />}
              {isAnalyzing ? t('modelador.btn_analyzing') : t('modelador.btn_analyze')}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-[10px] font-black text-gray-500 flex items-center gap-2 uppercase tracking-widest border-b border-white/5 pb-3">
              <History className="w-3.5 h-3.5 text-neon-purple" /> Histórico Estratégico
            </h3>
            <div className="space-y-3">
              {history.map((item) => (
                <motion.div
                  key={item.id}
                  whileTap={{ scale: 0.98, backgroundColor: "rgba(0, 255, 255, 0.05)" }}
                  onClick={() => loadFromHistory(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden
                    ${activeHistoryId === item.id ? 'border-neon-cyan/40 bg-neon-cyan/5' : 'border-white/5 bg-black/20 hover:border-white/10'}
                  `}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-white/90 truncate uppercase mb-1">{item.channelMeta?.title || item.url}</p>
                      <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">{item.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <button className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-[8px] font-black uppercase hover:bg-neon-cyan/20 transition-all">ABRIR</button>
                       <button onClick={(e) => removeFromHistory(e, item.id)} className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 text-gray-700 transition-all">
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Workspace - Right */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col min-w-0"
      >
        <div className="glass-card flex flex-col h-full border border-white/10 relative overflow-hidden shadow-2xl bg-dark/20 min-h-[700px]">
           <header className="p-6 md:p-8 border-b border-white/5 bg-black/20 flex justify-between items-center z-10 backdrop-blur-md">
             <div className="flex items-center gap-3">
                <Brain className="text-neon-cyan w-5 h-5 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('modelador.results_title')}</h3>
             </div>
             {result && (
               <div className="flex gap-2">
                 <StatBadge icon={TrendingUp} label="Views" value={formatNumber(result.channelMeta?.viewCount)} color="neon-cyan" />
                 <StatBadge icon={Youtube} label="Subs" value={formatNumber(result.channelMeta?.subscriberCount)} color="neon-purple" />
                 <StatBadge icon={MapPin} label="Região" value={selectedLanguage.code.toUpperCase()} color="green-400" />
               </div>
             )}
           </header>

           <div 
             ref={workspaceRef}
             className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-black/10"
           >
              <AnimatePresence>
                {isAnalyzing ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center p-12 text-center">
                    <LoadingSpinner message="Consultando Guru Master IA..." size="lg" />
                    <div className="mt-8 text-[10px] font-black text-neon-cyan/60 uppercase tracking-widest animate-pulse">Sintonizando Canal...</div>
                  </motion.div>
                ) : result ? (
                  <motion.div 
                    key={result.id} 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    className="space-y-10 pb-16"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                       <DashboardCard title="1. Métricas de Performance" icon={BarChart4} color="neon-cyan">{result.sections?.[1]}</DashboardCard>
                       <DashboardCard title="2. DNA do Canal" icon={Dna} color="neon-purple">{result.sections?.[2]}</DashboardCard>
                       <DashboardCard title="3. Copyright & Storytelling" icon={Lightbulb} color="neon-cyan">{result.sections?.[3]}</DashboardCard>
                       <DashboardCard title="4. Design Visionário" icon={Palette} color="neon-pink">{result.sections?.[4]}</DashboardCard>
                       <DashboardCard title="5. Fatores do Viral" icon={Flame} color="orange-400">{result.sections?.[5]}</DashboardCard>
                       <DashboardCard title="6. Brechas Estratégicas" icon={AlertCircle} color="green-400">{result.sections?.[6]}</DashboardCard>
                       
                       <DashboardCard title="9. Expansão Geográfica" icon={MapPin} color="indigo-400" className="xl:col-span-1 border-indigo-500/10">
                          <div className="opacity-80">{result.sections?.[9]?.split('ESTRATÉGIA_PAISES:')[0]}</div>
                       </DashboardCard>

                       <DashboardCard title="7. Modelagem & Editorial" icon={Layers} color="neon-cyan" className="xl:col-span-2">
                          {localizedChannelNames.length > 0 && (
                            <div className="mb-6 animate-fade-in">
                               <p className="text-[10px] font-black text-neon-cyan uppercase tracking-widest mb-3 flex items-center gap-2">
                                 <Brain className="w-3 h-3" /> Nomes Sugeridos para {selectedLanguage.name}:
                               </p>
                               <div className="flex flex-wrap gap-2">
                                 {localizedChannelNames.map((name, i) => (
                                   <div key={i} className="px-4 py-2 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg text-white font-black text-xs shadow-[0_0_15px_rgba(34,211,238,0.15)] flex items-center gap-2 group">
                                      <CheckCircle className="w-3 h-3 text-neon-cyan" />
                                      {name}
                                   </div>
                                 ))}
                               </div>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {result.sections?.[7]?.split('\n').filter(l => l.trim()).map((l, i) => (
                              <div key={i} className="bg-black/20 p-4 rounded-xl border border-white/5 flex gap-3 text-[11px] font-medium leading-relaxed">
                                <Sparkles className="w-3 h-3 text-neon-cyan shrink-0 mt-1" /> {l.replace(/^-\s*|^\d+\.\s*/, '')}
                              </div>
                            ))}
                          </div>
                       </DashboardCard>

                       <DashboardCard title="8. Conclusão Guru" icon={ShieldCheck} color="green-400" className="xl:col-span-1 border-green-500/20 bg-green-500/5">
                          <div className="text-center space-y-4">
                             <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                                <p className="text-xs font-black text-white uppercase">{result.sections?.[8]?.includes('IDEAL') ? 'CANAL IDEAL' : 'ANÁLISE FINAL'}</p>
                             </div>
                             <p className="text-[11px] text-gray-400 p-2">{result.sections?.[8]?.split('\n')[0]}</p>
                          </div>
                       </DashboardCard>
                    </div>

                    <section className="bg-black/40 p-10 rounded-3xl border border-white/5 relative group overflow-hidden">
                       <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 blur-[100px] -z-10 group-hover:bg-neon-cyan/10 transition-all" />
                       
                       <header className="mb-10 flex flex-col md:flex-row justify-between items-start gap-8">
                          <div className="flex-1">
                             <h3 className="text-md font-black text-white flex items-center gap-2 uppercase tracking-widest">
                                <Zap className="w-5 h-5 text-neon-cyan fill-current shadow-[0_0_15px_rgba(34,211,238,0.5)]" /> Hacker de Viralização
                             </h3>
                             <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Geração de Estratégias Locais</p>
                             
                             {/* Country Opportunity Cards - REFINED DESIGN */}
                             {result.sections?.countries && (
                               <div className="mt-8 space-y-4">
                                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                                    <Globe className="w-3 h-3" /> Mercados de Replicação (Mude a língua aqui):
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {result.sections.countries.map((c, i) => (
                                      <button 
                                        key={i} 
                                        onClick={() => { 
                                          setSelectedLanguage(c); 
                                          translateChannelNames(c);
                                          if(activeHook) handleGenerateHookTitles(c); 
                                        }} 
                                        className={`p-4 rounded-2xl border transition-all flex flex-col items-start gap-2 relative overflow-hidden group/c
                                          ${selectedLanguage.code === c.code 
                                            ? 'bg-neon-cyan/20 border-neon-cyan text-white shadow-[0_0_20px_rgba(0,243,255,0.2)]' 
                                            : i === 0 
                                              ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 hover:border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]' 
                                              : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
                                          }
                                        `}
                                      >
                                         <div className="flex items-center gap-3">
                                            <span className="text-2xl leading-none filter grayscale-[0.3] group-hover/c:grayscale-0 transition-all">{c.flag}</span> 
                                            <span className="text-[11px] font-black uppercase tracking-tight">{c.name}</span>
                                         </div>
                                         
                                         {i === 0 ? (
                                           <span className="text-[8px] text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">MÁXIMO POTENCIAL</span>
                                         ) : (
                                           <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Oportunidade</span>
                                         )}

                                         {selectedLanguage.code === c.code && (
                                           <div className="absolute top-2 right-2 flex gap-1">
                                              <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(0,243,255,1)]" />
                                           </div>
                                         )}
                                      </button>
                                    ))}
                                  </div>
                               </div>
                             )}
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                             {isGeneratingTitles || isTranslatingNames ? (
                               <div className="flex items-center gap-3 px-4 py-2 bg-neon-cyan/10 rounded-full border border-neon-cyan/20">
                                  <Loader2 className="w-4 h-4 animate-spin text-neon-cyan" />
                                  <span className="text-[10px] font-black text-neon-cyan uppercase tracking-widest">IA Localizando...</span>
                               </div>
                             ) : (
                               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                  Língua: {selectedLanguage.name}
                               </div>
                             )}
                          </div>
                       </header>

                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
                          {VIRAL_HOOKS.map(h => (
                            <button 
                              key={h.id} 
                              onClick={() => handleGenerateHookTitles(h)} 
                              disabled={isGeneratingTitles} 
                              className={`p-5 rounded-2xl border text-[10px] font-black transition-all flex flex-col items-center gap-4 relative overflow-hidden group/h
                                ${activeHook?.id === h.id 
                                  ? `bg-${h.color}/20 border-${h.color} text-white shadow-[0_0_20px_rgba(0,243,255,0.1)]` 
                                  : h.isHot 
                                    ? 'bg-neon-pink/5 border-neon-pink/20 text-neon-pink hover:bg-neon-pink/10 hover:border-neon-pink/40'
                                    : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10 hover:border-white/10'
                                }
                              `}
                            >
                               <h.icon className={`w-6 h-6 ${activeHook?.id === h.id ? `text-${h.color}` : h.isHot ? 'text-neon-pink' : 'text-gray-600'}`} /> 
                               <span className="uppercase tracking-tighter leading-none text-center">{h.name}</span>
                               {h.isHot && !activeHook && (
                                 <span className="absolute top-2 right-2 flex h-3 w-3">
                                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-pink opacity-75"></span>
                                   <span className="relative inline-flex rounded-full h-3 w-3 bg-neon-pink shadow-[0_0_10px_rgba(255,18,131,0.5)]"></span>
                                 </span>
                               )}
                               
                               {activeHook?.id === h.id && (
                                 <motion.div layoutId="activeHookTab" className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent" />
                               )}
                            </button>
                          ))}
                       </div>
                       <AnimatePresence>
                          {generatedTitles.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-8 border-t border-white/5">
                               {generatedTitles.map((t, i) => {
                                 const isInfo = t.startsWith('INFO:');
                                 const cleanText = isInfo ? t.replace('INFO:', '') : t;
                                 
                                 return (
                                   <div key={i} className={`flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-white/5 group hover:border-neon-cyan/30 transition-all ${isInfo ? 'opacity-80 italic' : ''}`}>
                                      <span className={`${isInfo ? 'text-xs text-gray-400' : 'text-sm font-bold text-gray-200'}`}>{cleanText}</span>
                                      {!isInfo && (
                                        <button onClick={() => copyTitle(cleanText, i)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 transition-all ${copiedIndex === i ? 'bg-green-500 text-dark' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                                           {copiedIndex === i ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiedIndex === i ? 'Copiado' : 'Copiar'}
                                        </button>
                                      )}
                                   </div>
                                 );
                               })}
                            </motion.div>
                          )}
                       </AnimatePresence>
                    </section>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-32">
                     <Youtube className="w-16 h-16 mb-4" />
                     <p className="text-xs font-black uppercase tracking-widest">{t('modelador.empty_hint')}</p>
                  </div>
                )}
              </AnimatePresence>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
