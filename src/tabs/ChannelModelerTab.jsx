import React, { useState, useEffect } from 'react';
import { Youtube, Search, Loader2, Target, Brain, Palette, TrendingUp, Flame, Dna, CheckCircle, History, Trash2, Globe, AlertCircle, Sparkles, Wand2, Lightbulb, Layout, Layers, ShieldCheck, XCircle, ChevronRight, PanelLeft, PanelLeftClose, Zap, MousePointer2, Copy, Check, MapPin, Gauge, Languages, ExternalLink, RefreshCw, Cpu, Music, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { callAI } from '../utils/aiUtils';
import { t } from '../utils/i18n';
import { stackPush, stackRead, stackRemove } from '../utils/stackUtils';
import { resolveApiUrl } from '../utils/apiUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ViralHacker } from '../components/ViralHacker';

export const ChannelModelerTab = ({ setActiveTab }) => {
  const { configs } = useSystemStatus();
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState({ name: 'Brasil', code: 'pt', flag: '🇧🇷' });
  const [localizedChannelNames, setLocalizedChannelNames] = useState([]);
  const [isTranslatingNames, setIsTranslatingNames] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [copiedSection, setCopiedSection] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const workspaceRef = React.useRef(null);
  
  const CPM_MAP = {
    'finanças': 12, 'investimento': 15, 'money': 10,
    'tech': 8, 'tecnologia': 7,
    'curiosidades': 1.5, 'mistérios': 2,
    'documentário': 4, 'história': 3,
    'saúde': 6, 'beleza': 5,
    'entretenimento': 1.2, 'cinema': 2,
    'medicina': 10, 'marketing': 8
  };

  const calculateROI = () => {
    if (!result) return { cpm: 2, potential: 0 };
    const niche = (result.sections?.[2] || '').toLowerCase();
    const cpm = Object.entries(CPM_MAP).find(([k]) => niche.includes(k))?.[1] || 2.5;
    
    // Estimativa baseada nos vídeos virais (média de views / 1000 * cpm)
    const avgViews = result.viralVideos?.reduce((a, b) => a + b.viewCount, 0) / (result.viralVideos?.length || 1);
    const potential = (avgViews / 1000) * cpm;
    return { cpm, potential: potential.toFixed(2) };
  };

  const exportToScript = () => {
    const seed = {
      title: result.channelMeta?.title || '',
      niche: result.sections?.[2]?.split('\n')[0]?.replace(/^[-\d\.]+\s*/, '') || 'Documentário',
      dna: result.sections?.[2]?.split('\n').find(l => l.length > 10) || ''
    };
    localStorage.setItem('guru_script_seed', JSON.stringify(seed));
    setActiveTab('create-script');
  };

  const generateConceptPreview = async () => {
    const prompt = result.sections?.[11];
    if (!prompt) return;
    setIsPreviewing(true);
    try {
      const geminiKey = configs.gemini_key || localStorage.getItem('guru_gemini_key');
      const { callGeminiImage } = await import('../utils/aiUtils');
      const url = await callGeminiImage(geminiKey, prompt, { aspect_ratio: "16:9" });
      setPreviewImage(url);
    } catch (err) {
      console.error(err);
      alert("Falha ao gerar draft visual: " + err.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const copyToClipboard = (text, sectionId) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    if (sectionId === 'general') setIsCopied(true);
    setTimeout(() => {
      setCopiedSection(null);
      setIsCopied(false);
    }, 2000);
  };

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

  const fetchChannelData = async (info, force = false) => {
    try {
      let channelId = info.value;
      const cacheKey = `modeler_yt_${info.value}`;
      if (!force) {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 2 * 60 * 60 * 1000) {
              return parsed.data;
            }
          } catch (e) {}
        }
      }

      if (info.type === 'handle') {
        const searchRes = await fetch(resolveApiUrl(`/api/youtube/channels?part=snippet&forHandle=${info.value}`));
        const searchData = await searchRes.json();
        if (searchData.items && searchData.items.length > 0) {
          channelId = searchData.items[0].id;
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

      const viralVids = (viralData.items || []).map(v => ({ 
        title: v.snippet.title, 
        viewCount: videoStats[v.id.videoId] || 0,
        thumbnail: v.snippet.thumbnails.high?.url || v.snippet.thumbnails.medium.url,
        id: v.id.videoId,
        publishedAt: v.snippet.publishedAt
      }));

      const latestVids = (latestData.items || []).map(v => ({ 
        title: v.snippet.title, 
        viewCount: videoStats[v.id.videoId] || 0,
        id: v.id.videoId,
        publishedAt: v.snippet.publishedAt
      }));

      const avgViews = Object.values(videoStats).reduce((a, b) => a + parseInt(b), 0) / Math.max(1, Object.keys(videoStats).length);
      const subs = parseInt(stats.subscriberCount) || 1;
      const viralIndex = (avgViews / subs).toFixed(2);
      
      let frequency = "N/A";
      if (latestVids.length >= 2) {
        const d1 = new Date(latestVids[0].publishedAt);
        const dlast = new Date(latestVids[latestVids.length - 1].publishedAt);
        const diffDays = Math.abs(d1 - dlast) / (1000 * 60 * 60 * 24);
        frequency = (diffDays / (latestVids.length - 1)).toFixed(1) + " dias";
      }

      // --- AUDIENCE FEEDBACK SCAN ---
      let audienceFeedback = [];
      try {
        const globalCommentsRes = await fetch(resolveApiUrl(`/api/youtube/commentThreads?allThreadsRelatedToChannelId=${channelId}&part=snippet&maxResults=20&order=relevance`));
        const globalCommentsData = await globalCommentsRes.json();
        (globalCommentsData.items || []).forEach(item => {
          audienceFeedback.push({
            text: item.snippet.topLevelComment.snippet.textDisplay,
            likeCount: item.snippet.topLevelComment.snippet.likeCount,
            type: 'global'
          });
        });

        const topViralId = viralVids[0]?.id;
        if (topViralId) {
          const viralCommentsRes = await fetch(resolveApiUrl(`/api/youtube/commentThreads?videoId=${topViralId}&part=snippet&maxResults=20&order=relevance`));
          const viralCommentsData = await viralCommentsRes.json();
          (viralCommentsData.items || []).forEach(item => {
            audienceFeedback.push({
              text: item.snippet.topLevelComment.snippet.textDisplay,
              likeCount: item.snippet.topLevelComment.snippet.likeCount,
              type: 'viral_critique'
            });
          });
        }
      } catch (e) { console.warn("Failed to fetch audience feedback:", e); }

      const finalResult = {
        id: channelId,
        title: snippet.title,
        description: snippet.description,
        thumbnail: snippet.thumbnails.medium.url,
        customUrl: snippet.customUrl,
        subscriberCount: stats.subscriberCount,
        viewCount: stats.viewCount,
        videoCount: stats.videoCount,
        viralVideos: viralVids,
        latestVideos: latestVids,
        audienceFeedback,
        metrics: {
          viralIndex,
          avgViews: Math.round(avgViews),
          frequency
        }
      };

      sessionStorage.setItem(`modeler_yt_${info.value}`, JSON.stringify({
        timestamp: Date.now(),
        data: finalResult
      }));

      return finalResult;
    } catch (err) {
      console.error('Fetch error:', err);
      return null;
    }
  };

  const handleAnalyze = async () => {
    let brainContext = "";
    try {
      const brainRes = await fetch(resolveApiUrl('/api/brain/context?niche=Geral'));
      const brainData = await brainRes.json();
      brainContext = brainData.experience;
    } catch (err) { console.error('Brain Fetch Error', err); }
    if (!url) return;
    setIsAnalyzing(true);
    setShowSidebar(false);
    setResult(null);
    setLocalizedChannelNames([]);
    setSelectedLanguage({ name: 'Brasil', code: 'pt', flag: '🇧🇷' });

    const info = extractChannelIdOrHandle(url);
    const realData = info ? await fetchChannelData(info) : null;

    const statsContext = realData ? `
DADOS REAIS DO CANAL (YouTube API):
- Nome: ${realData.title}
- Inscritos: ${realData.subscriberCount}
- Visualizações Totais: ${realData.viewCount}
- Vídeos Postados: ${realData.videoCount}

MÉTRICAS DE PERFORMANCE (Calculadas):
- Índice de Viralização: ${realData.metrics.viralIndex}
- Média de Views (Amostra): ${realData.metrics.avgViews}
- Frequência de Postagem: a cada ${realData.metrics.frequency}

PRINCIPAIS VÍDEOS (OUTLIERS):
${realData.viralVideos.map(v => `- ${v.title} (${v.viewCount} views)`).join('\n')}

VOZ DA AUDIÊNCIA (Comentários reais e críticas dos vídeos virais):
${(realData.audienceFeedback || []).sort((a,b) => b.likeCount - a.likeCount).slice(0, 30).map(c => `[${c.likeCount} likes] ${c.text}`).join('\n') || 'Sem comentários recentes disponíveis.'}

ÚLTIMOS VÍDEOS:
${realData.latestVideos.map(v => `- ${v.title} (${v.viewCount} views)`).join('\n')}
` : `URL do canal: ${url}`;

    const prompt = `Você é o DARK MASTER AI, o maior engenheiro de canais dark do mundo. 

Sua análise deve ser CIRÚRGICA, FRIA e focada apenas no que gera ROI em um modelo DARK.

MISSÃO: Transformar o canal alvo em um modelo DARK FACELESS (Estritamente Narração Off + Imagens/Vídeos B-roll/IA). O criador NÃO vai aparecer.
REGRAS: 
- Resuma TUDO em BULLET POINTS diretos e cirúrgicos.
- Use os delimitadores EXATOS: [SECAO_1] até [SECAO_15].
- LEIA A VOZ DA AUDIÊNCIA. Se eles reclamam de algo, o Roteiro deve resolver isso.
- MATRIZ DE FUGA DARK (CRÍTICO): Se a Concorrência for "Alta" ou a Dificuldade "Alta", você é OBRIGADO a sugerir uma "Rota de Fuga" para que o canal Faceless seja viável. Escolha a melhor opção:
   ROTA A (Fuga de Formato): Manter o tema, mas facilitar o formato visual (ex: em vez de documentário denso, criar "Drops Rápidos" usando geração Veo ultra-simples e narração agressiva).
   ROTA B (Cruzamento Blue Ocean): Pegar a estética e narrativa que validaram o canal e jogar em um nicho inexplorado (ex: edição True Crime aplicada no mercado de Startups).
   ROTA C (Pivô Sensorial): Ir na contra-mão visual. Se o concorrente é rápido/acelerado, ditar um estilo Dark, atmosférico, com imagens Veo lentas e cinematográficas focando na atenção passiva.
A Rota escolhida deve estar justificada na [SECAO_8]. O modelo resultante deve SER SEMPRE FACELESS (Narração Off + IA).

[SECAO_1] VIABILIDADE FACELESS (Score 0-100% de facilidade para replicar sem aparecer)
[SECAO_2] OPORTUNIDADE DELTA (A brecha invisível deixada pelo concorrente)
[SECAO_3] ENGENHARIA DE TÍTULOS (3 regras sintáticas vencedoras)
[SECAO_4] SENSORIAL DARK FACELESS (Defina: 1. Tom de Voz da locução, 2. Ritmo de Edição de Imagens, 3. Trilha BGM central)
[SECAO_5] ENGENHARIA DE RETENÇÃO (Fórmula do Hook dos 15s iniciais e o Arco Emocional do roteiro)
[SECAO_6] DIAGNÓSTICO DA AUDIÊNCIA (O que os inscritos estão implorando ou criticando nos vídeos virais)
[SECAO_7] NOME DO NOVO CANAL (3 opções misteriosas ou autoritárias para canal gringo. Comece com "- ")
[SECAO_8] VEREDITO CIRÚRGICO (Formato EXATO separado por '|': Nível de Dificuldade | Nível de Concorrência | Potencial de ROI | Justificativa Estratégica. Obs: Se houver saturação, explique o pivô adotado para rebaixar a concorrência e dificuldade).
[SECAO_9] MERCADOS 99% SEGUROS (Liste APENAS os países onde você tem 99% de certeza que este modelo será lucrativo. Formato: País|sigla_ISO. Ex: Alemanha|de, Reino Unido|gb, Japão|jp) - Seja extremamente seletivo. NÃO repita o rótulo da seção.
[SECAO_10] DATA MINING / PESQUISA (Onde o criador vai pesquisar o roteiro? Ex: Fóruns do Reddit específicos, Relatórios da SEC, etc)
[SECAO_11] PROMPT MASTER VEO 3.1 (Prompt técnico para geração de vídeo IA)
[SECAO_12] BLUEPRINT DARK MASTER (Protocolo de Ação: Qual tema focar baseado nos comentários, e onde encaixar o CTA de Monetização sem cair a retenção)
[SECAO_13] TEMA E NICHE CENTRAL (Sugestão de nicho ultra-seletivo)
[SECAO_14] ESTRUTURAS DE TÍTULOS (3 modelos 'preencha os espaços' baseados no que a audiência quer)
[SECAO_15] TÍTULOS PRONTOS PARA USO (3 exemplos virais focados em atacar as falhas do concorrente)

DADOS DO ALVO:
${statsContext}

Responda agora.`;

      try {
        const responseText = await callAI(prompt);
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
      
      if (parsedSections.countries && parsedSections.countries.length > 0) {
        const topMarket = parsedSections.countries[0];
        setSelectedLanguage(topMarket);
        translateChannelNames(topMarket, newAnalysis);
      }

      if (workspaceRef.current) workspaceRef.current.scrollTop = 0;
    } catch (error) {
      alert(`Erro na análise: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
      setShowSidebar(false);
    }
  };

  const parseSections = (text) => {
    if (!text) return {};
    const sections = {};
    for (let i = 1; i <= 15; i++) {
      const currentMarker = `\\[SECAO_${i}\\]`;
      const nextMarker = i < 15 ? `\\[SECAO_${i + 1}\\]` : "$";
      const regex = new RegExp(`${currentMarker}([\\s\\S]*?)(?=${nextMarker})`, "i");
      const match = text.match(regex);
      if (match) {
        let content = match[1].trim();
        // Remove labels AI might have repeated (e.g. "TÍTULOS PRONTOS:")
        content = content.replace(/^.*?:/m, '').trim();
        sections[i] = content;
      }
    }
    
    const countriesMatch = text.match(/\[SECAO_9\]([\s\S]*?)(?=\[SECAO_10\]|$)/i);
    if (countriesMatch) {
       const content = countriesMatch[1].trim();
       // Normalize multi-line, comma-sep, or pipe-sep responses
       const rawItems = content.split(/,|\n|;|\|/).map(i => i.trim()).filter(Boolean);
       const filteredCountries = [];
       
       rawItems.forEach(item => {
          // Remove numbers (1., 2.), dashes, dots, brackets and common noise
          const cleanItem = item.replace(/\[|\]|\d+\.|\*|-|\./g, '').trim();
          if (!cleanItem || cleanItem.length < 2) return;
          
          // Hard blacklist of non-country terms
          const blacklist = ['SECAO', 'ESTRATEGIA', 'PAIS', 'REAL', 'CODIGO', 'SIGLA', 'OPÇÃO', 'EXEMPLO', 'ROI', 'GLOBAL', 'VIRAL'];
          if (blacklist.some(b => cleanItem.toUpperCase().includes(b))) return;

          const name = cleanItem.split('|')[0].trim();
          let codeFromAI = cleanItem.includes('|') ? cleanItem.split('|')[1].trim().toLowerCase() : '';
          
          // ROBUST COUNTRY-TO-CODE MAPPING
          const countryToCode = {
            'brasil': 'pt', 'brazil': 'pt',
            'portugal': 'pt',
            'estados unidos': 'en', 'usa': 'en', 'eua': 'en', 'united states': 'en',
            'reino unido': 'gb', 'uk': 'gb', 'united kingdom': 'gb',
            'canadá': 'ca', 'canada': 'ca',
            'austrália': 'au', 'australia': 'au',
            'alemanha': 'de', 'germany': 'de', 'deutschland': 'de',
            'frança': 'fr', 'france': 'fr',
            'espanha': 'es-es', 'spain': 'es-es', 'españa': 'es-es',
            'méxico': 'es-mx', 'mexico': 'es-mx',
            'itália': 'it', 'italy': 'it',
            'japão': 'jp', 'japan': 'jp',
            'china': 'zh',
            'índia': 'hi', 'india': 'hi',
            'rússia': 'ru', 'russia': 'ru',
            'indonésia': 'id', 'indonesia': 'id',
            'vietnã': 'vi', 'vietnam': 'vi',
            'tailândia': 'th', 'thailand': 'th',
            'turquia': 'tr', 'turkey': 'tr', 'türkiye': 'tr',
            'coreia': 'ko', 'korea': 'ko'
          };

          let code = codeFromAI;
          if (!code || code.length > 5) {
            const lowerName = name.toLowerCase();
            const foundKey = Object.keys(countryToCode).find(k => lowerName.includes(k));
            code = foundKey ? countryToCode[foundKey] : 'en';
          }
          
          // Final fix for case where AI gives ISO country code instead of language
          if (code === 'us') code = 'en';
          if (code === 'br') code = 'pt';
          if (code === 'gb') code = 'gb'; // keep for flag dist
          if (code === 'ca') code = 'ca'; // keep for flag dist

          if (name.length > 2 && !filteredCountries.find(c => c.name === name)) {
            filteredCountries.push({ name, code, flag: getFlag(code) });
          }
       });
       
       if (filteredCountries.length > 0) {
          sections.countries = filteredCountries;
       }
    }
    
    if (!sections.countries || sections.countries.length === 0) {
      sections.countries = [
        { name: 'México', code: 'es', flag: '🇲🇽' },
        { name: 'Indonésia', code: 'id', flag: '🇮🇩' },
        { name: 'Vietnã', code: 'vn', flag: '🇻🇳' },
        { name: 'Índia', code: 'in', flag: '🇮🇳' }
      ];
    }
    return sections;
  };

  const getFlag = (code) => {
    const c = code.toLowerCase();
    const flags = { 
      'pt': '🇧🇷', 'br': '🇧🇷', 'en': '🇺🇸', 'us': '🇺🇸', 
      'gb': '🇬🇧', 'uk': '🇬🇧', 
      'es-es': '🇪🇸', 'es': '🇪🇸', 
      'mx': '🇲🇽', 'es-mx': '🇲🇽', 
      'hi': '🇮🇳', 'in': '🇮🇳', 
      'id': '🇮🇩', 'fr': '🇫🇷', 'de': '🇩🇪', 'jp': '🇯🇵', 
      'ru': '🇷🇺', 'it': '🇮🇹', 'kr': '🇰🇷', 'ko': '🇰🇷', 'tr': '🇹🇷', 
      'vi': '🇻🇳', 'vn': '🇻🇳', 'th': '🇹🇭',
      'zh': '🇨🇳', 'cn': '🇨🇳', 'au': '🇦🇺', 'ca': '🇨🇦'
    };
    return flags[c] || '🌐';
  };

  const translateChannelNames = async (langObj, resultOverride = null) => {
    const targetResult = resultOverride || result;
    if (!targetResult || isTranslatingNames) return;
    setIsTranslatingNames(true);
    const originalNames = targetResult.sections?.[7] || "Nome de Canal";
    const lang = langObj.name;

    const prompt = `Sugira 3 nomes de canais atraentes para o idioma/mercado: ${lang}. Contexto original: "${originalNames}". Retorne APENAS os 3 nomes separados por vírgula.`;

    try {
      const responseText = await callAI(prompt);
      
      const names = responseText.split(',').map(n => n.trim()).filter(n => n.length > 2);
      setLocalizedChannelNames(names);
    } catch (err) { console.error(err); } 
    finally { setIsTranslatingNames(false); }
  };

  const loadFromHistory = (item) => {
    if (!item) return;
    setShowSidebar(false);
    setIsAnalyzing(false);
    setResult(null);
    setTimeout(() => {
      try {
        const sections = parseSections(item.content || "");
        const hydratedResult = { ...item, sections };
        setActiveHistoryId(hydratedResult.id);
        setResult(hydratedResult);
        setLocalizedChannelNames([]);
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

  const formatNumber = (num) => {
    if (!num) return '0';
    const n = parseInt(num);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const StatBadge = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl flex flex-col justify-center items-center leading-tight min-w-[100px] gap-1 shadow-lg">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3 h-3 text-${color}`} />
        <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-outfit">{label}</span>
      </div>
      <span className="text-white font-black text-sm font-outfit">{value}</span>
    </div>
  );

  const DashboardCard = ({ title, icon: Icon, color, children, className, onCopy, sectionId }) => (
    <div className={`glass-card p-6 border border-white/5 relative overflow-hidden group transition-all duration-300 ${className}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-${color}/10 transition-colors`} />
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <h4 className="text-[10px] font-black text-gray-400 flex items-center gap-2.5 uppercase tracking-[0.2em] font-outfit">
          <Icon className={`w-3.5 h-3.5 text-${color}`} /> {title}
        </h4>
        {onCopy && (
          <button 
            onClick={onCopy}
            className={`p-2 rounded-lg transition-all transform active:scale-95 ${
              copiedSection === sectionId 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            {copiedSection === sectionId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      <div className="text-gray-300 text-xs leading-relaxed font-inter font-medium tracking-wide whitespace-pre-wrap relative z-10">{children}</div>
    </div>
  );

  const StrategyPillar = ({ title, icon: Icon, color, children }) => (
    <div className="space-y-6">
       <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-2 relative group">
          <div className={`p-2 rounded-xl bg-${color}/10 border border-${color}/20`}>
             <Icon className={`w-5 h-5 text-${color}`} />
          </div>
          <h3 className={`text-sm font-black text-white/90 uppercase tracking-[0.2em] font-outfit`}>{title}</h3>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {children}
       </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full w-full max-w-[1700px] mx-auto gap-6 lg:overflow-hidden font-sans">
      <AnimatePresence>
        {showSidebar && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-[400px] flex flex-col h-auto lg:h-full lg:pr-8 lg:border-r lg:border-white/5 overflow-y-auto custom-scrollbar shrink-0 px-4 lg:px-0"
          >
            <header className="mb-12">
              <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan p-[2px] shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                  <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
                    <Youtube className="w-7 h-7 text-white fill-current" />
                  </div>
                </div>
                {t('modelador.title') || 'Modelador de Canais'}
              </h2>
              <p className="text-gray-400 mt-3 font-bold text-sm uppercase tracking-[0.2em] border-l-4 border-neon-cyan pl-4 ml-2 italic">{t('modelador.subtitle') || 'Engenharia Reversa de Canais Virais & ROI'}</p>
            </header>

            <div className="space-y-8 pb-12">
              <div className="glass-card p-6 border border-white/5 bg-black/20">
                <label className="text-[10px] font-black text-gray-500 mb-3 flex items-center gap-2 uppercase tracking-[0.2em] font-outfit">
                  <Globe className="w-3.5 h-3.5 text-neon-cyan" /> {t('modelador.input_label')}
                </label>
                <input 
                  type="text"
                  className="w-full bg-dark/40 border border-white/10 rounded-xl p-4 text-white font-bold mb-3 focus:outline-none focus:border-neon-cyan/50 transition-all font-inter"
                  placeholder={t('modelador.input_placeholder')}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !url}
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-3 font-black text-xs font-outfit uppercase tracking-widest bg-white text-dark hover:bg-neon-cyan disabled:opacity-30 transition-all shadow-xl active:scale-95"
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
                      whileTap={{ scale: 0.98 }}
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
                           <button className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-[8px] font-black uppercase transition-all">ABRIR</button>
                           <button onClick={(e) => removeFromHistory(e, item.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-700 hover:text-red-500 transition-all">
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
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col min-w-0"
      >
        <div className="glass-card flex flex-col h-full border border-white/10 shadow-2xl bg-dark/20 min-h-[700px] overflow-hidden">
           <header className="p-6 md:p-8 border-b border-white/5 bg-black/20 flex justify-between items-center z-10 backdrop-blur-md shrink-0">
             <div className="flex items-center gap-3">
                <ShieldCheck className="text-neon-cyan w-5 h-5 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                {!showSidebar && (
                  <button onClick={() => setShowSidebar(true)} className="mr-4 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-neon-cyan/20 hover:border-neon-cyan/40 text-gray-400 hover:text-neon-cyan transition-all group flex items-center gap-2">
                     <PanelLeft className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline italic">Painel de Análise</span>
                  </button>
                )}
                <div className="flex flex-col">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1 serif italic">{t('modelador.results_title') || 'Relatório Estratégico'}</h3>
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                     <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Protocolo Dark Master Ativado</span>
                  </div>
                </div>
             </div>
             {result && (
               <div className="flex gap-2">
                  <StatBadge icon={Zap} label="Dark Feasibility" value={result.sections?.[1]?.match(/\d+%/)?.[0] || 'N/A'} color="neon-cyan" />
                  <StatBadge icon={TrendingUp} label="Viral Index" value={result.metrics?.viralIndex || 'N/A'} color="neon-purple" />
                  <StatBadge icon={Youtube} label="Subs" value={formatNumber(result.channelMeta?.subscriberCount)} color="green-400" />
               </div>
             )}
           </header>

           <div ref={workspaceRef} className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-black/10">
              <AnimatePresence>
                {isAnalyzing ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center p-12 text-center">
                    <LoadingSpinner message="Consultando Guru Master IA..." size="lg" />
                    <div className="mt-8 text-[10px] font-black text-neon-cyan/60 uppercase tracking-widest animate-pulse">Sintonizando Canal...</div>
                  </motion.div>
                ) : result ? (
                  <motion.div key={result.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10 pb-16">
                    <div className="space-y-16 pb-16">
                      {/* IDENTIDADE DO CANAL SUGERIDO */}
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 border border-neon-cyan/20 bg-gradient-to-br from-neon-cyan/5 via-transparent to-transparent relative overflow-hidden group shadow-xl">
                         <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                            <div className="flex-1">
                               <div className="flex items-center gap-2 mb-4">
                                  <div className="w-8 h-[1px] bg-neon-cyan opacity-50"></div>
                                  <span className="text-[10px] font-black text-neon-cyan uppercase tracking-[0.4em] font-outfit opacity-80">Identidade do Canal Dark</span>
                               </div>
                               <div className="space-y-3">
                                  <h2 className="text-3xl md:text-5xl font-black font-outfit tracking-tighter mb-4 text-white group-hover:text-neon-cyan transition-colors">
                                     {result.sections?.[7]?.split('\n').find(l => l.includes('-'))?.replace(/^-\s*/, '') || result.sections?.[7]?.split('\n')[0]?.replace(/^\d+\.\s*/, '') || "Novo Canal Dark"}
                                  </h2>
                                  <div className="flex flex-wrap gap-2">
                                     <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 uppercase flex items-center gap-2 tracking-widest font-outfit">
                                        <Layers className="w-3 h-3 text-neon-cyan opacity-60" /> {result.sections?.[13]?.split('\n')[0] || "Nicho Estratégico"}
                                     </span>
                                     <span className="px-3 py-1.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20 text-[9px] font-black text-neon-purple uppercase tracking-widest font-outfit">Potencial Máximo</span>
                                  </div>
                               </div>
                            </div>
                            <button onClick={() => copyToClipboard(result.sections?.[7], 'identity')} className={`px-6 py-3.5 rounded-xl font-black text-[10px] font-outfit uppercase tracking-superwide transition-all flex items-center gap-3 ${copiedSection === 'identity' ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-white text-dark hover:bg-neon-cyan'}`}>
                                {copiedSection === 'identity' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copiedSection === 'identity' ? 'COPIADO' : 'COPIAR IDENTIDADE'}
                            </button>
                         </div>
                      </motion.div>

                      {/* PILAR 1: DIAGNÓSTICO */}
                      <StrategyPillar title="Pilar 1: Diagnóstico Dark" icon={ShieldCheck} color="neon-cyan">
                         <DashboardCard title="Viabilidade Dark" icon={Zap} color="neon-cyan" onCopy={() => copyToClipboard(result.sections?.[1], 's1')} sectionId="s1">
                            <div className="space-y-2.5">
                               {result.sections?.[1]?.split('\n').filter(l => l.trim().length > 3).map((l, i) => (
                                 <div key={i} className="flex gap-3 items-center bg-white/[0.02] border border-white/5 p-2.5 rounded-xl">
                                    <div className="w-1 h-1 rounded-full bg-neon-cyan shrink-0 opacity-60" />
                                    <span className="text-gray-400 font-medium leading-tight">{l.replace(/^[-\d\.]+\s*/, '')}</span>
                                 </div>
                               ))}
                            </div>
                         </DashboardCard>
                         <DashboardCard title="Veredito Master" icon={ShieldCheck} color="green-400" className="border-green-500/30 bg-green-500/5" onCopy={() => copyToClipboard(result.sections?.[8], 's8')} sectionId="s8">
                            <div className="space-y-4">
                               {(() => {
                                 const verdictParts = result.sections?.[8]?.split('|').map(s => s.trim()) || [];
                                 const diff = verdictParts[0]?.replace('Dificuldade:', '')?.replace('Dificuldade', '')?.trim() || 'N/A';
                                 const comp = verdictParts[1]?.replace('Concorrência:', '')?.replace('Concorrência', '')?.trim() || 'N/A';
                                 const roi = verdictParts[2]?.replace('ROI:', '')?.replace('ROI', '')?.trim() || 'N/A';
                                 const just = verdictParts[3] || verdictParts.slice(1).join(' ') || 'N/A';
                                 
                                 return (
                                   <>
                                     <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                                           <span className="block text-[8px] text-gray-500 uppercase font-black mb-1">Dificuldade</span>
                                           <span className="text-[11px] text-white font-black">{diff.length > 20 ? 'ALTA' : diff}</span>
                                        </div>
                                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                                           <span className="block text-[8px] text-gray-500 uppercase font-black mb-1">Concorrência</span>
                                           <span className="text-[11px] text-white font-black">{comp.length > 20 ? 'MÉDIA' : comp}</span>
                                        </div>
                                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                                           <span className="block text-[8px] text-gray-500 uppercase font-black mb-1">Potencial ROI</span>
                                           <span className="text-[11px] text-green-400 font-black">{roi.length > 20 ? 'MÉDIO' : roi}</span>
                                        </div>
                                     </div>
                                     <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl mt-3">
                                         <p className="text-[10px] text-green-100/90 font-medium italic leading-relaxed text-center">"{just}"</p>
                                     </div>
                                   </>
                                 );
                               })()}
                            </div>
                         </DashboardCard>
                         <DashboardCard title="Oportunidade Delta" icon={Sparkles} color="orange-400" className="border-orange-500/30 bg-orange-500/5" onCopy={() => copyToClipboard(result.sections?.[2], 's2')} sectionId="s2">
                            <p className="text-[11px] leading-snug text-white/90 font-medium">{result.sections?.[2]}</p>
                         </DashboardCard>
                      </StrategyPillar>

                      {/* PILAR 2: ENGENHARIA */}
                      <StrategyPillar title="Pilar 2: Engenharia Dark" icon={Dna} color="neon-purple">
                         <DashboardCard title="Automação Sensorial & Retenção" icon={Brain} color="neon-purple" onCopy={() => copyToClipboard(`${result.sections?.[4]}\n${result.sections?.[5]}`, 's2ge')} sectionId="s2ge">
                            <div className="space-y-4">
                               <div><p className="text-[9px] font-black text-neon-purple uppercase mb-1">Títulos (Regras):</p><p className="leading-tight">{result.sections?.[3]}</p></div>
                               <div><p className="text-[9px] font-black text-neon-purple uppercase mb-1">Ritmo & Emoção:</p><p className="leading-tight">{result.sections?.[5]}</p></div>
                            </div>
                         </DashboardCard>
                         <DashboardCard title="DNA Auditivo e Visual" icon={Palette} color="neon-pink" onCopy={() => copyToClipboard(result.sections?.[4], 's4')} sectionId="s4">
                            {result.viralVideos && (
                              <div className="mb-4 grid grid-cols-2 gap-2">
                                {result.viralVideos.slice(0, 4).map((v, idx) => (
                                  <div key={idx} className="group/th relative rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/40">
                                     <img src={v.thumbnail} alt="Viral" className="w-full h-full object-cover group-hover/th:scale-110 transition-transform opacity-50 group-hover/th:opacity-100" />
                                     <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                                        <p className="text-[7px] font-black text-neon-cyan uppercase tracking-tighter">{(v.viewCount/1000).toFixed(0)}K VIEWS</p>
                                     </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="leading-tight opacity-80 text-[11px] font-inter mt-3 p-3 bg-neon-pink/5 border border-neon-pink/10 rounded-lg">{result.sections?.[4]}</p>
                         </DashboardCard>
                         <DashboardCard title="Voz da Audiência" icon={AlertCircle} color="red-400" onCopy={() => copyToClipboard(result.sections?.[6], 's6')} sectionId="s6">
                            <div className="space-y-2.5">
                               {result.sections?.[6]?.split('\n').filter(l => l.trim().length > 3).map((l, i) => (
                                 <div key={i} className="flex gap-3 items-start bg-red-400/5 border border-red-400/10 p-3 rounded-xl font-inter">
                                    <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-red-400 opacity-60 shrink-0" />
                                    <span className="text-red-100/80 font-medium text-[11px] leading-relaxed">{l.replace(/^[-\d\.]+\s*/, '')}</span>
                                 </div>
                               ))}
                            </div>
                         </DashboardCard>
                      </StrategyPillar>

                      {/* PILAR 3: A RECEITA */}
                      <StrategyPillar title="Pilar 3: A Receita (Dark Blueprint)" icon={Zap} color="yellow-400">
                         <DashboardCard title="Data Mining (Fontes de Pesquisa)" icon={Search} color="blue-400" className="xl:col-span-2" onCopy={() => copyToClipboard(result.sections?.[10], 's10')} sectionId="s10">
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden group/dm">
                               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] pointer-events-none" />
                               <div className="relative z-10 space-y-3">
                                  {result.sections?.[10] ? result.sections?.[10].split('\n').filter(l => l.trim().length > 3).map((l, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                       <Target className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                       <p className="text-[12px] font-medium text-white/90 leading-relaxed font-inter">{l.replace(/^[-\d\.]+\s*/, '').replace(/^-\s*/, '')}</p>
                                    </div>
                                  )) : (
                                    <p className="text-[10px] text-gray-500 italic">Fontes indisponíveis.</p>
                                  )}
                               </div>
                            </div>
                         </DashboardCard>
                         <DashboardCard title="Arquitetura de Títulos" icon={Layout} color="yellow-400" className="xl:col-span-2" onCopy={() => copyToClipboard(result.sections?.[14], 's14')} sectionId="s14">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {result.sections?.[14] ? result.sections?.[14].split('\n').filter(l => l.trim().length > 3).map((l, i) => (
                                 <div key={i} className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-4 group/tpl">
                                    <div className="flex items-center gap-2 mb-3">
                                       <div className="w-5 h-5 rounded bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center font-outfit"><span className="text-[9px] font-black text-yellow-400">T{i+1}</span></div>
                                       <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-outfit">Padrão de Conversão</span>
                                    </div>
                                    <p className="text-[12px] font-bold text-white bg-black/40 p-3 rounded-lg border border-white/5 select-all cursor-pointer font-inter leading-relaxed">{l.replace(/^[-\d\.]+\s*/, '').replace(/^-\s*/, '')}</p>
                                 </div>
                               )) : (
                                 <p className="text-[10px] text-gray-500 italic p-4 font-inter underline decoration-dashed underline-offset-4">Analise este canal novamente para liberar os padrões.</p>
                               )}
                            </div>
                         </DashboardCard>
                         <DashboardCard title="Títulos Prontos" icon={Flame} color="orange-400" onCopy={() => copyToClipboard(result.sections?.[15], 's15')} sectionId="s15">
                             <div className="space-y-3">
                                {result.sections?.[15] ? result.sections?.[15].split('\n').filter(l => l.trim().length > 3).map((l, i) => (
                                  <div key={i} className="group/item relative bg-black/40 border border-white/5 rounded-xl p-4 hover:bg-orange-500/5 transition-all cursor-pointer" onClick={() => copyToClipboard(l.replace(/^[-\d\.]+\s*/, '').replace(/^-\s*/, ''), 'title-' + i)}>
                                     <div className="flex justify-between items-center gap-3">
                                        <p className="text-[11px] font-black text-white leading-tight font-outfit">{l.replace(/^[-\d\.]+\s*/, '').replace(/^-\s*/, '')}</p>
                                        <div className="p-1.5 rounded-lg bg-white/5 text-gray-500 group-hover/item:text-orange-400 transition-all font-inter">{copiedSection === 'title-' + i ? <Check className="w-3.5 h-3.5" /> : <MousePointer2 className="w-3.5 h-3.5" />}</div>
                                     </div>
                                  </div>
                                )) : (
                                  <p className="text-[10px] text-gray-500 italic p-4 font-inter">Recarregue os dados para carregar sugestões.</p>
                                )}
                             </div>
                         </DashboardCard>
                         <DashboardCard title="Blueprint Dark Master" icon={ShieldCheck} color="yellow-400" className="xl:col-span-2" onCopy={() => copyToClipboard(result.sections?.[12], 's12')} sectionId="s12">
                            <div className="bg-black/60 rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5 font-outfit uppercase tracking-tight">
                               <div className="px-5 py-3 bg-yellow-400/5 flex items-center justify-between border-b border-white/5">
                                  <span className="text-[10px] font-black text-yellow-400 tracking-widest flex items-center gap-2">
                                     <Zap className="w-3.5 h-3.5" /> SURGICAL EXECUTION PROTOCOL
                                  </span>
                                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                               </div>
                               <div className="p-0">
                                  {result.sections?.[12]?.split('\n').filter(l => l.trim().length > 3).map((l, i) => (
                                    <div key={i} className="flex gap-4 p-5 hover:bg-white/[0.02] transition-colors group/step">
                                       <div className="text-[10px] font-black text-gray-600 group-hover/step:text-yellow-400 transition-colors pt-0.5">0{i+1}</div>
                                       <p className="text-[13px] font-black text-white leading-relaxed flex-1">
                                          {l.replace(/^[-\d\.]+\s*/, '')}
                                       </p>
                                    </div>
                                  ))}
                               </div>
                            </div>
                            <div className="mt-6 p-5 border border-dashed border-white/10 rounded-xl bg-white/5 relative group/prompt overflow-hidden">
                               <div className="flex justify-between items-center mb-3">
                                  <p className="text-[9px] font-black text-yellow-500 uppercase flex items-center gap-2 font-outfit tracking-[0.1em]"><Wand2 className="w-3.5 h-3.5" /> PROMPT MESTRE VEO 3.1:</p>
                                  <button 
                                    onClick={generateConceptPreview}
                                    disabled={isPreviewing}
                                    className="px-2 py-1 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded-lg text-[8px] font-black uppercase hover:bg-neon-cyan/20 transition-all flex items-center gap-1.5"
                                  >
                                    {isPreviewing ? <Loader2 className="w-2.5 h-2.5 animate-spin"/> : <Sparkles className="w-2.5 h-2.5"/>}
                                    {isPreviewing ? 'GERANDO...' : 'VISUALIZAR'}
                                  </button>
                               </div>
                               <p className="text-[11px] text-gray-400 font-medium leading-relaxed italic select-all cursor-pointer hover:text-white transition-colors relative z-10 font-inter">{result.sections?.[11]}</p>
                               
                               <AnimatePresence>
                                 {previewImage && (
                                   <motion.div 
                                     initial={{ opacity: 0, height: 0 }}
                                     animate={{ opacity: 1, height: 'auto' }}
                                     exit={{ opacity: 0, height: 0 }}
                                     className="mt-4 relative group/pvw overflow-hidden"
                                   >
                                      <img src={previewImage} alt="Preview" className="w-full aspect-video rounded-lg border border-neon-cyan/50 object-cover shadow-[0_0_20px_rgba(0,243,255,0.1)]" />
                                      <button 
                                        onClick={() => setPreviewImage(null)}
                                        className="absolute top-2 right-2 p-1 bg-black/80 text-white rounded-full border border-white/10"
                                      >
                                        <XCircle className="w-3 h-3" />
                                      </button>
                                   </motion.div>
                                 )}
                               </AnimatePresence>
                             </div>

                             <div className="mt-4">
                                <button 
                                  onClick={exportToScript}
                                  className="w-full py-3.5 bg-yellow-400 text-dark rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-[0_5px_15px_rgba(250,204,21,0.2)]"
                                >
                                  <Wand2 className="w-4 h-4"/> MODELAR ROTEIRO (IR PARA SCRIPT)
                                </button>
                             </div>
                          </DashboardCard>
                          <DashboardCard title="Pivôs de Dominação" icon={RefreshCw} color="orange-400" onCopy={() => copyToClipboard(result.sections?.[10], 's10')} sectionId="s10">
                             <div className="flex flex-col gap-3">
                                {result.sections?.[10]?.split('\n').filter(l => l.length > 5).map((l, i) => (
                                  <div key={i} className="bg-black/40 p-4 rounded-xl border border-white/5 flex gap-4 text-[11px] font-medium leading-tight font-inter">
                                     <div className="w-6 h-6 rounded-lg bg-orange-400/10 flex items-center justify-center shrink-0"><span className="text-[10px] font-black text-orange-400 font-outfit">{i+1}</span></div>
                                     <span className="text-gray-400 py-0.5">{l.replace(/^[-\d\.]+\s*/, '')}</span>
                                  </div>
                                ))}
                             </div>
                          </DashboardCard>
                      </StrategyPillar>

                      {/* PILAR 4: EXPANSÃO */}
                      <StrategyPillar title="Pilar 4: Expansão Global" icon={Globe} color="indigo-400">
                         <DashboardCard title="Análise de ROI (Potencial de Lucro)" icon={TrendingUp} color="emerald-400">
                             <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-3">
                                   <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                      <p className="text-[8px] font-black text-gray-500 uppercase mb-1 tracking-widest">CPM MÉDIO DO NICHO</p>
                                      <p className="text-xl font-black text-white font-outfit">${calculateROI().cpm}</p>
                                      <p className="text-[8px] text-gray-600">Por 1k views (Estimado)</p>
                                   </div>
                                   <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                                      <p className="text-[8px] font-black text-emerald-500 uppercase mb-1 tracking-widest">LUCRO POR VÍDEO VIRAL</p>
                                      <p className="text-xl font-black text-emerald-400 font-outfit">${calculateROI().potential}</p>
                                      <p className="text-[8px] text-emerald-500/60">Estimado p/ performance atual</p>
                                   </div>
                                </div>
                                <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                                   <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-gray-500 font-black uppercase tracking-tighter">Potencial c/ 1M views/mês:</span>
                                      <span className="text-emerald-400 font-black">${(1000 * calculateROI().cpm).toFixed(0)}</span>
                                   </div>
                                   <div className="h-[1px] bg-white/5 w-full"></div>
                                   <p className="text-[8px] text-gray-600 italic">* Valores baseados no mercado internacional (USD). O CPM real pode variar significativamente conforme o nicho e país.</p>
                                </div>
                             </div>
                          </DashboardCard>
                         <DashboardCard title="Mercados de Lucro" icon={MapPin} color="indigo-400" onCopy={() => copyToClipboard(result.sections?.[9], 's9')} sectionId="s9">
                            <div className="grid grid-cols-1 gap-3 mb-4">
                               {result.sections.countries?.map((country, i) => (
                                <button 
                                  key={i}
                                  onClick={() => {
                                     setSelectedLanguage(country);
                                     translateChannelNames(country);
                                  }}
                                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between group/c relative overflow-hidden ${selectedLanguage?.name === country.name ? 'bg-neon-cyan/10 border-neon-cyan shadow-[0_0_20px_rgba(34,211,238,0.1)]' : 'bg-black/40 border-white/5 hover:border-white/10'}`}
                                >
                                   <div className="flex items-center gap-3 relative z-10">
                                      <span className="text-xl group-hover/c:scale-125 transition-transform">{country.flag}</span>
                                      <div className="text-left">
                                         <p className="text-[10px] font-black text-white uppercase tracking-widest">{country.name}</p>
                                         <div className="flex items-center gap-1.5 mt-0.5">
                                            <ShieldCheck className="w-2.5 h-2.5 text-neon-cyan" />
                                            <span className="text-[7px] font-black text-neon-cyan/70 uppercase tracking-tighter">99% SEGURO</span>
                                         </div>
                                      </div>
                                   </div>
                                   <ChevronRight className={`w-4 h-4 transition-all ${selectedLanguage?.name === country.name ? 'text-neon-cyan translate-x-1' : 'text-gray-600'}`} />
                                </button>
                               ))}
                            </div>
                            {localizedChannelNames.length > 0 && (
                               <div className="mt-6 pt-4 border-t border-white/5">
                                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-3 font-outfit opacity-60">Localização Estratégica:</p>
                                  <div className="flex flex-wrap gap-2">
                                     {localizedChannelNames.slice(0, 3).map((name, i) => (
                                       <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white uppercase tracking-wider font-outfit">{name}</span>
                                     ))}
                                  </div>
                               </div>
                            )}
                         </DashboardCard>
                         <DashboardCard title="Polinização de Nichos" icon={Languages} color="neon-purple" className="xl:col-span-2" onCopy={() => copyToClipboard(result.sections?.[11], 's11')} sectionId="s11">
                            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 leading-relaxed font-medium text-gray-400 text-[13px] font-inter">
                               {result.sections?.[11]?.split('\n').map((p, i) => (
                                 <p key={i} className={i > 0 ? 'mt-3' : ''}>{p}</p>
                               ))}
                            </div>
                         </DashboardCard>
                      </StrategyPillar>
                    </div>

                    <ViralHacker result={result} configs={configs} selectedLanguage={selectedLanguage} setSelectedLanguage={setSelectedLanguage} translateChannelNames={translateChannelNames} />
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
export default ChannelModelerTab;
