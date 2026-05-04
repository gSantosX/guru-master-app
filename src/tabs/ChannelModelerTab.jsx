import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, ExternalLink, TrendingUp, BarChart2, Sparkles, Brain, Youtube, Clock, Eye, Video, Activity, Copy, Check, ChevronLeft, RefreshCw, Globe, Loader2, Wand2, Download } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { resolveApiUrl, buildYouTubeUrl } from '../utils/apiUtils';
import { callAI } from '../utils/aiUtils';
import { t } from '../utils/i18n';
import { usePersistence } from '../contexts/PersistenceContext';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const GLOBAL_LANGUAGES = [
  "Português (Brasil)",
  "Português (Portugal)",
  "Inglês (US)",
  "Inglês (UK)",
  "Espanhol (América Latina)",
  "Espanhol (Espanha)",
  "Francês",
  "Alemão",
  "Japonês",
  "Coreano",
  "Russo",
  "Italiano",
  "Holandês",
  "Polonês",
  "Turco",
  "Árabe",
  "Hindi",
  "Bengali",
  "Indonésio",
  "Tailandês",
  "Vietnamita",
  "Chinês (Mandarim)",
  "Chinês (Cantonês)",
  "Sueco",
  "Dinamarquês",
  "Finlandês",
  "Norueguês",
  "Tcheco",
  "Ucraniano",
  "Grego",
  "Hebraico",
  "Filipino (Tagalog)"
];

export const ChannelModelerTab = ({ isActive, setActiveTab }) => {
  const { configs } = useSystemStatus();
  const { user } = useAuth();
  
  // Chave isolada por usuário para histórico privado
  const channelsKey = `guru_modeled_channels_${(user?.email || 'guest').toLowerCase()}`;
  
  // Historical Modeling Channels (Max 9)
  const [channels, setChannels] = useState(() => {
    const saved = localStorage.getItem(channelsKey);
    return saved ? JSON.parse(saved) : [];
  });

  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  
  // Section 1: Strategy (Auto)
  const [isAnalyzingStrategy, setIsAnalyzingStrategy] = useState(false);
  const [strategyResult, setStrategyResult] = useState(null);

  // Section 2: Country Analysis
  const [isAnalyzingCountry, setIsAnalyzingCountry] = useState(false);
  const [countryResult, setCountryResult] = useState(null);

  // Section 3: Titles Generation
  const [isAnalyzingTitles, setIsAnalyzingTitles] = useState(false);
  const [titlesResult, setTitlesResult] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('Português (Brasil)');
  
  // Utilities
  const [isCopied, setIsCopied] = useState(false);
  const [copiedTitleIndex, setCopiedTitleIndex] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const { setScriptState } = usePersistence();

  const containerRef = useRef(null);

  // Constants
  const COUNTRIES = [
    { code: 'US', name: 'Estados Unidos' },
    { code: 'BR', name: 'Brasil' },
    { code: 'ES', name: 'Espanha' },
    { code: 'FR', name: 'França' },
    { code: 'IN', name: 'Índia' },
    { code: 'DE', name: 'Alemanha' },
    { code: 'RU', name: 'Rússia' },
    { code: 'JP', name: 'Japão' },
    { code: 'GB', name: 'Reino Unido' },
    { code: 'KR', name: 'Coreia do Sul' },
    { code: 'MX', name: 'México' },
    { code: 'ID', name: 'Indonésia' },
    { code: 'IT', name: 'Itália' },
    { code: 'TR', name: 'Turquia' },
    { code: 'CA', name: 'Canadá' }
  ];

  const copyToClipboard = (text, index = null) => {
    navigator.clipboard.writeText(text);
    if (index !== null) {
      setCopiedTitleIndex(index);
      setTimeout(() => setCopiedTitleIndex(null), 2000);
    } else {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleGenerateFromSuggestedTitle = (title) => {
    copyToClipboard(title);
    setScriptState(prev => ({
      ...prev,
      titulo: title,
      generatedScript: null,
      statusMessage: ''
    }));
    if (setActiveTab) setActiveTab('create-script');
  };

  const generatePDF = async () => {
    if (!containerRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0A0A0A' // dark background
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      
      pdf.save(`Modelagem_${selectedChannel?.title || 'Canal'}.pdf`);
    } catch (err) {
      console.error('PDF Error:', err);
      alert('Erro ao gerar PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  useEffect(() => {
    const info = extractChannelIdOrHandle(newUrl);
    if (!info) return;
    const timer = setTimeout(() => {
      if (newUrl.includes('youtube.com/') || newUrl.startsWith('@')) handleAddChannel();
    }, 1500);
    return () => clearTimeout(timer);
  }, [newUrl]);

  useEffect(() => {
    localStorage.setItem(channelsKey, JSON.stringify(channels));
  }, [channels, channelsKey]);

  // Recarrega os canais quando o usuário mudar de conta
  useEffect(() => {
    const saved = localStorage.getItem(channelsKey);
    setChannels(saved ? JSON.parse(saved) : []);
    resetAnalyses();
    setSelectedChannel(null);
  }, [channelsKey]);

  // Auto trigger strategy when a channel is selected and no strategy exists yet
  useEffect(() => {
    if (selectedChannel && !strategyResult && !isAnalyzingStrategy) {
      runStrategyAnalysis();
    }
  }, [selectedChannel]);

  // Auto-load channel from other tabs (Mining)
  useEffect(() => {
    if (isActive) {
      const autoModelUrl = localStorage.getItem('guru_auto_model_channel');
      if (autoModelUrl) {
        setNewUrl(autoModelUrl);
        localStorage.removeItem('guru_auto_model_channel');
      }
    }
  }, [isActive]);

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

  // Helper: lança erro legível caso a resposta do YouTube contenha error
  const checkYouTubeError = (data, context = '') => {
    if (data?.error) {
      const msg = data.error.message || 'Erro desconhecido';
      const code = data.error.code || data.error.status || '';
      if (code === 401 || msg.includes('API key') || msg.includes('UNAUTHENTICATED')) {
        throw new Error('Chave do YouTube não configurada. Acesse Configurações → Chave do YouTube.');
      }
      if (code === 403 || msg.includes('quota') || msg.includes('quotaExceeded') || msg.includes('forbidden')) {
        throw new Error('Cota do YouTube esgotada. Aguarde até amanhã ou use outra chave API.');
      }
      throw new Error(`YouTube API: ${msg}${context ? ` (${context})` : ''}`);
    }
  };

  const fetchChannelData = async (info, force = false) => {
    try {
      let channelId = info.value;
      const cacheKey = `yt_channel_${info.value}`;
      if (!force) {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 2 * 60 * 60 * 1000) return parsed.data;
          } catch (e) {}
        }
      }

      if (info.type === 'handle') {
        const searchRes = await fetch(buildYouTubeUrl('channels', { part: 'snippet', forHandle: info.value }));
        const searchData = await searchRes.json();
        checkYouTubeError(searchData, 'channels handle');
        if (searchData.items && searchData.items.length > 0) {
          channelId = searchData.items[0].id;
        } else {
          throw new Error('Canal não encontrado. Verifique o link ou @handle e tente novamente.');
        }
      }

      const channelRes = await fetch(buildYouTubeUrl('channels', { part: 'snippet,statistics', id: channelId }));
      const channelData = await channelRes.json();
      checkYouTubeError(channelData, 'channels');
      if (!channelData.items || channelData.items.length === 0) throw new Error('Canal não encontrado pelo ID. Tente com o link direto do YouTube.');

      const snippet = channelData.items[0].snippet;
      const stats = channelData.items[0].statistics;

      const viralRes = await fetch(buildYouTubeUrl('search', { part: 'snippet', channelId, order: 'viewCount', type: 'video', maxResults: '5' }));
      const viralData = await viralRes.json();
      checkYouTubeError(viralData, 'search viral');

      const latestRes = await fetch(buildYouTubeUrl('search', { part: 'snippet', channelId, order: 'date', type: 'video', maxResults: '5' }));
      const latestData = await latestRes.json();
      checkYouTubeError(latestData, 'search latest');
      
      const videoIds = [...(viralData.items || []).map(v => v.id.videoId), ...(latestData.items || []).map(v => v.id.videoId)].filter(Boolean).join(',');

      let videoStats = {};
      if (videoIds) {
        const statsRes = await fetch(buildYouTubeUrl('videos', { part: 'statistics', id: videoIds }));
        const statsData = await statsRes.json();
        checkYouTubeError(statsData, 'videos stats');
        (statsData.items || []).forEach(v => { videoStats[v.id] = v.statistics.viewCount; });
      }

      let audienceFeedback = [];
      try {
        const globalCommentsRes = await fetch(buildYouTubeUrl('commentThreads', { allThreadsRelatedToChannelId: channelId, part: 'snippet', maxResults: '20', order: 'relevance' }));
        const globalCommentsData = await globalCommentsRes.json();
        (globalCommentsData.items || []).forEach(item => {
          audienceFeedback.push({ text: item.snippet.topLevelComment.snippet.textDisplay, likeCount: item.snippet.topLevelComment.snippet.likeCount, type: 'global' });
        });

        const topViralId = viralData.items?.[0]?.id?.videoId;
        if (topViralId) {
          const viralCommentsRes = await fetch(buildYouTubeUrl('commentThreads', { videoId: topViralId, part: 'snippet', maxResults: '20', order: 'relevance' }));
          const viralCommentsData = await viralCommentsRes.json();
          (viralCommentsData.items || []).forEach(item => {
            audienceFeedback.push({ text: item.snippet.topLevelComment.snippet.textDisplay, likeCount: item.snippet.topLevelComment.snippet.likeCount, type: 'viral_critique' });
          });
        }
      } catch (e) { console.warn("Failed to fetch audience feedback:", e); }

      const result = {
        id: channelId,
        title: snippet.title,
        description: snippet.description,
        thumbnail: snippet.thumbnails.medium.url,
        customUrl: snippet.customUrl,
        subscriberCount: stats.subscriberCount,
        viewCount: stats.viewCount,
        videoCount: stats.videoCount,
        viralVideos: (viralData.items || []).map(v => ({ id: v.id.videoId, title: v.snippet.title, publishedAt: v.snippet.publishedAt, thumbnail: v.snippet.thumbnails.medium.url, viewCount: videoStats[v.id.videoId] || 0 })),
        latestVideos: (latestData.items || []).map(v => ({ id: v.id.videoId, title: v.snippet.title, publishedAt: v.snippet.publishedAt, thumbnail: v.snippet.thumbnails.medium.url, viewCount: videoStats[v.id.videoId] || 0 })),
        audienceFeedback: audienceFeedback
      };

      sessionStorage.setItem(`yt_channel_${info.value}`, JSON.stringify({ timestamp: Date.now(), data: result }));
      return result;
    } catch (err) { throw err; }
  };

  const handleAddChannel = async () => {
    const info = extractChannelIdOrHandle(newUrl);
    if (!info) { alert(t('channels.invalid_url')); return; }
    setIsAdding(true);
    try {
      const data = await fetchChannelData(info);
      if (channels.find(c => c.id === data.id)) {
        alert('Este canal já foi adicionado ao modelador.');
        const c = channels.find(x => x.id === data.id);
        setSelectedChannel(c);
        resetAnalyses();
      } else {
        setChannels(prev => [data, ...prev.filter(c => c.id !== data.id)].slice(0, 9));
        setNewUrl('');
        setSelectedChannel(data);
        resetAnalyses();
      }
    } catch (err) { alert(t('channels.fetch_error') + ': ' + err.message); } finally { setIsAdding(false); }
  };

  const resetAnalyses = () => {
    setStrategyResult(null);
    setCountryResult(null);
    setTitlesResult(null);
  };

  const handleRefreshChannel = async (force = true) => {
    if (!selectedChannel) return;
    try {
      const data = await fetchChannelData({ type: 'id', value: selectedChannel.id }, force);
      setChannels(prev => prev.map(c => c.id === data.id ? data : c));
      setSelectedChannel(data);
    } catch (err) { alert('Erro ao atualizar dados: ' + err.message); }
  };

  const getAnalysisContext = () => {
    const viralText = (selectedChannel.viralVideos || []).map(v => `- ${v.title}`).join('\n');
    const latestText = (selectedChannel.latestVideos || []).map(v => `- ${v.title}`).join('\n');
    const audienceText = (selectedChannel.audienceFeedback || []).sort((a, b) => b.likeCount - a.likeCount).slice(0, 30).map(c => `[${c.type.toUpperCase()}] (${c.likeCount} likes): ${c.text}`).join('\n');
    return { viralText, latestText, audienceText };
  };

  const runStrategyAnalysis = async () => {
    if (!selectedChannel) return;
    setIsAnalyzingStrategy(true);
    setStrategyResult(null);

    const { viralText, latestText, audienceText } = getAnalysisContext();
    const prompt = `Você é um MENTOR ESTRATÉGICO SÊNIOR de YouTube — especialista em análise de canais, crescimento orgânico e replicação de estratégias virais.

CANAL EM ANÁLISE: "${selectedChannel.title}"
VÍDEOS MAIS POPULARES (o que já provou funcionar):
${viralText || 'Dados não disponíveis'}
VÍDEOS MAIS RECENTES:
${latestText || 'Dados não disponíveis'}
VOZ DA AUDIÊNCIA (Comentários):
${audienceText || 'Sem comentários.'}

Sua resposta deve ter EXATAMENTE estas 6 partes EM PORTUGUÊS (PT-BR) — sem introdução, sem conclusão:
**1. DIAGNÓSTICO DO NICHO**
Em 1-2 frases: Qual é o posicionamento real deste canal? O que ele vende emocionalmente?
**2. FÓRMULA DE SUCESSO**
Identifique 2-3 padrões específicos de título ou tema que os vídeos virais têm em comum.
**3. VOZ DA AUDIÊNCIA (CRÍTICAS & DESEJOS)**
RESUMA em bullet points o que o público tanto comenta: O que pedem? Do que reclamam? Dúvidas?
**4. LACUNA DE OPORTUNIDADE**
Que ângulos este canal AINDA NÃO explorou, mas que a audiência está pedindo nos comentários?
**5. DICA DE OURO REPLICÁVEL**
Uma estratégia concreta baseada no feedback da audiência para o usuário aplicar.
**6. ARMADILHA A EVITAR**
O erro que a audiência mais critica neste tipo de canal.

REGRAS: Use **NEGRITO** para os títulos da seção.`;

    try {
      const result = await callAI(prompt, { model: 'gemini-1.5-pro' });
      if (!result) throw new Error('Resposta vazia da IA.');
      setStrategyResult(result);
    } catch (err) {
      console.error(err);
      setStrategyResult(`Erro na análise estratégica: ${err.message}`);
    } finally {
      setIsAnalyzingStrategy(false);
    }
  };

  const runCountryAnalysis = async () => {
    if (!selectedChannel) return;
    setIsAnalyzingCountry(true);
    setCountryResult(null);

    try {
      const termPrompt = `Baseado no canal "${selectedChannel.title}" que fala sobre: ${selectedChannel.description}. Forneça APENAS 1 TERMO DE PESQUISA (uma palavra ou frase curta em INGLÊS) que seja o núcleo deste canal para fazer uma busca no YouTube e medir a concorrência global. RETORNE APENAS O TERMO.`;
      const searchTerm = await callAI(termPrompt, { model: 'gemini-1.5-pro' });
      const cleanTerm = searchTerm.replace(/["']/g, '').trim();

      const countryData = {};
      const searchPromises = COUNTRIES.map(async (country) => {
        try {
          const res = await fetch(buildYouTubeUrl('search', { q: cleanTerm, part: 'snippet', type: 'video', maxResults: 3, regionCode: country.code, relevanceLanguage: 'en' }));
          const data = await res.json();
          countryData[country.name] = (data.items || []).map(item => item.snippet.title);
        } catch (e) {
          console.error(`Error searching for ${country.name}`, e);
          countryData[country.name] = ['Falha ao obter dados'];
        }
      });

      await Promise.all(searchPromises);

      const analysisPrompt = `Você é um ESPECIALISTA EM MERCADOS INTERNACIONAIS do YouTube.
Nicho/Conceito analisado: "${cleanTerm}" (Canal Base: ${selectedChannel.title})

Fizemos uma busca por este conceito nos principais mercados do YouTube e encontramos os seguintes vídeos no topo (uma amostra do que está bombando ou faltando):
${Object.entries(countryData).map(([country, titles]) => `[${country}]:\n${titles.join('\n')}`).join('\n\n')}

MISSÃO:
1. Analise as tendências dos títulos retornados por país.
2. Identifique qual país (dentre os listados) apresenta a MAIOR OPORTUNIDADE para replicar o conteúdo do canal "${selectedChannel.title}". (Dê preferência a mercados onde os títulos parecem mais fracos/genéricos ou onde a ideia ainda não foi saturada).
3. Entregue um relatório apontando o país vencedor e sugestões de adaptação cultural para ele. Deixe "menções honrosas" para 2 outros países.

Formato OBRIGATÓRIO (PT-BR):
**🎯 MERCADO VENCEDOR: [Nome do País]**
**🗣️ IDIOMA RECOMENDADO: [Idioma falado, ex: Inglês (US), Espanhol, Francês, Alemão, Japonês, Coreano, Russo]**
[Explicação de por que este país é a melhor oportunidade baseada nos dados e demanda local]

**💡 COMO ADAPTAR PARA ESTE MERCADO:**
- [Estratégia 1]
- [Estratégia 2]

**🌍 MENÇÕES HONROSAS:**
- [País 2]: [Breve motivo]
- [País 3]: [Breve motivo]`;

      const analysis = await callAI(analysisPrompt, { model: 'gemini-1.5-pro' });
      setCountryResult(analysis);
      
      // Auto-select language based on the result
      const langMatch = analysis.match(/\*\*🗣️ IDIOMA RECOMENDADO:\s*(.*?)\*\*/i);
      if (langMatch && langMatch[1]) {
        setSelectedLanguage(langMatch[1].trim());
      }
    } catch (err) {
      console.error(err);
      setCountryResult(`Erro ao analisar países: ${err.message}`);
    } finally {
      setIsAnalyzingCountry(false);
    }
  };

  const runTitlesAnalysis = async () => {
    if (!selectedChannel) return;
    setIsAnalyzingTitles(true);
    setTitlesResult(null);

    const { viralText, latestText, audienceText } = getAnalysisContext();
    const prompt = `Você é um ESPECIALISTA ELITE em CTR, Algoritmos do YouTube e Psicologia do Clique.
CANAL EM ANÁLISE: "${selectedChannel.title}"
VÍDEOS MAIS POPULARES:
${viralText || 'N/A'}
VOZ DA AUDIÊNCIA:
${audienceText || 'N/A'}

${strategyResult ? `INSIGHTS DA ESTRATÉGIA (Use esses dados para guiar a criação dos ganchos, corrigindo erros e atacando as oportunidades):\n${strategyResult}\n` : ''}

MISSÃO: Gerar 10 títulos NOVOS de altíssimo CTR inspirados no canal.
IDIOMA OBRIGATÓRIO: Gere TODOS os títulos em ${selectedLanguage}. 

REGRAS CRÍTICAS:
- Analise críticas/pedidos do público e os insights estratégicos e use como gancho.
- Os títulos devem ter entre 40 e 75 caracteres.
- Não use formatação markdown, apenas números simples (1. Título).
- SEM ADJETIVOS VAZIOS, muita especificidade.

Retorne APENAS a lista numerada.`;

    try {
      const result = await callAI(prompt, { model: 'gemini-1.5-pro' });
      setTitlesResult(result);
    } catch (err) {
      console.error(err);
      setTitlesResult(`Erro ao gerar títulos: ${err.message}`);
    } finally {
      setIsAnalyzingTitles(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    const n = parseInt(num);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };


  return (
    <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto overflow-hidden">
      <AnimatePresence mode="wait">
        {!selectedChannel ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-8 h-full p-4"
          >
            <header className="mb-12">
              <h2 className="text-3xl md:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan p-[2px] shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                  <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
                    <Activity className="w-8 h-8 text-white fill-current" />
                  </div>
                </div>
                {'Modelador de Canais'}
              </h2>
              <p className="text-gray-400 mt-3 font-bold text-sm uppercase tracking-[0.2em] border-l-4 border-neon-cyan pl-4 ml-2 italic">
                {'Engenharia Reversa & Modelagem Estratégica de Canais'}
              </p>
            </header>

            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-80 group">
                <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-neon-cyan transition-colors" />
                <input 
                  type="text" 
                  placeholder={t('channels.add_placeholder')}
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-neon-cyan/50 focus:bg-white/10 transition-all font-bold text-sm"
                />
              </div>
              <button 
                onClick={handleAddChannel}
                disabled={isAdding || !newUrl}
                className="px-6 py-3 bg-neon-cyan text-dark font-black rounded-2xl hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.2)] font-mono"
              >
                {isAdding ? <div className="w-5 h-5 border-2 border-dark/20 border-t-dark rounded-full animate-spin" /> : <Plus className="w-5 h-5" />}
                <span className="hidden sm:inline">Adicionar & Analisar</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...channels, ...Array(Math.max(0, 9 - channels.length)).fill(null)].map((channel, idx) =>
                  channel ? (
                    <motion.div
                      key={channel.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => {
                        setSelectedChannel(channel);
                        resetAnalyses();
                      }}
                      className="bg-white/5 border border-white/5 rounded-2xl p-6 group hover:border-neon-cyan/40 transition-all cursor-pointer relative overflow-hidden shadow-xl hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-lg group-hover:border-neon-cyan/50 transition-all">
                          <img src={channel.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setChannels(channels.filter(c => c.id !== channel.id)); }}
                          className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all active:scale-90"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h3 className="text-xl font-black text-white line-clamp-1 group-hover:text-neon-cyan transition-colors">{channel.title}</h3>
                      <p className="text-neon-cyan font-bold text-xs mt-1 opacity-70">{channel.customUrl}</p>
                      <div className="mt-6 flex items-center gap-6">
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Inscritos</p>
                          <p className="text-lg font-black text-white">{formatNumber(channel.subscriberCount)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Visualizações</p>
                          <p className="text-lg font-black text-white">{formatNumber(channel.viewCount)}</p>
                        </div>
                      </div>
                      <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-6 h-6 text-neon-cyan" />
                      </div>
                    </motion.div>
                  ) : (
                    <div key={`empty-${idx}`} className="border-2 border-dashed border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-30 min-h-[200px]">
                      <Youtube className="w-8 h-8 text-gray-700 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-700">Slot Disponível</p>
                      <p className="text-[9px] text-gray-800 mt-1">{9 - channels.length} restantes</p>
                    </div>
                  )
                )}
              </div>
            </div>

          </motion.div>
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8" ref={containerRef}>
              {/* Header Details */}
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-12 gap-4">
                <button 
                  onClick={() => setSelectedChannel(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all font-black text-xs uppercase tracking-widest border border-white/5"
                >
                  <Plus className="w-4 h-4 rotate-45" /> Voltar para lista
                </button>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={generatePDF}
                    disabled={isDownloadingPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                  >
                    {isDownloadingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3" /> Baixar PDF</>}
                  </button>
                  <button 
                    onClick={handleRefreshChannel}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest border border-white/5 font-mono"
                  >
                    <Clock className="w-3 h-3" />
                    Atualizar Dados
                  </button>
                  <a 
                    href={`https://youtube.com/${selectedChannel.customUrl || 'channel/'+selectedChannel.id}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2.5 bg-white/5 hover:bg-neon-cyan/20 rounded-xl transition-colors text-gray-400 hover:text-neon-cyan border border-white/5"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </div>

              {/* Channel Info */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-8 text-center md:text-left">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-neon-cyan shadow-[0_0_20px_rgba(0,243,255,0.2)] shrink-0">
                  <img src={selectedChannel.thumbnail} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter">{selectedChannel.title}</h2>
                  <p className="text-neon-cyan font-bold mt-2 text-lg opacity-80">{selectedChannel.customUrl}</p>
                  <p className="text-gray-500 mt-4 text-sm font-medium leading-relaxed max-w-2xl line-clamp-2">
                    {selectedChannel.description || 'Nenhuma descrição disponível.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
                 {[
                   { label: 'Inscritos', val: formatNumber(selectedChannel.subscriberCount), icon: Youtube, color: 'text-neon-cyan' },
                   { label: 'Views Totais', val: formatNumber(selectedChannel.viewCount), icon: Eye, color: 'text-neon-pink' },
                   { label: 'Vídeos', val: selectedChannel.videoCount, icon: Video, color: 'text-neon-purple' }
                 ].map((s, i) => (
                   <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                      <s.icon className={`w-5 h-5 ${s.color} opacity-50`} />
                      <p className="text-2xl font-black text-white">{s.val}</p>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{s.label}</p>
                   </div>
                 ))}
              </div>

              {/* Top Videos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
                <section>
                  <h3 className="text-xs font-black text-gray-400 mb-6 flex items-center gap-2 uppercase tracking-[0.3em] pb-4 border-b border-white/5">
                    <TrendingUp className="w-4 h-4 text-neon-cyan" /> Vídeos em Alta
                  </h3>
                  <div className="space-y-4">
                    {selectedChannel.viralVideos?.slice(0, 4).map((v, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-xl">
                        <div className="w-24 h-14 rounded-xl overflow-hidden shrink-0 border border-white/5">
                          <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-gray-200 line-clamp-1">{v.title}</h4>
                          <div className="flex items-center gap-3 mt-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                            <span className="flex items-center gap-1 text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded-full"><Eye className="w-3 h-3" /> {formatNumber(v.viewCount)}</span>
                            <span>{new Date(v.publishedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black text-gray-400 mb-6 flex items-center gap-2 uppercase tracking-[0.3em] pb-4 border-b border-white/5">
                    <Clock className="w-4 h-4 text-neon-purple" /> Últimos Envios
                  </h3>
                  <div className="space-y-4">
                    {selectedChannel.latestVideos?.slice(0, 4).map((v, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-xl">
                        <div className="w-24 h-14 rounded-xl overflow-hidden shrink-0 border border-white/5">
                          <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                         <div className="flex-1 min-w-0">
                           <h4 className="text-sm font-bold text-gray-200 line-clamp-1">{v.title}</h4>
                           <div className="flex items-center gap-3 mt-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                             <span className="flex items-center gap-1 text-neon-purple bg-neon-purple/10 px-2 py-0.5 rounded-full"><Eye className="w-3 h-3" /> {formatNumber(v.viewCount)}</span>
                             <span>{new Date(v.publishedAt).toLocaleDateString()}</span>
                           </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* SECTION 1: AUTO STRATEGY */}
              <div className="mb-10 bg-black/40 border-2 border-white/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-neon-purple" />
                <h3 className="text-xl font-black text-white flex items-center gap-3 mb-6">
                  <Brain className="text-neon-purple w-6 h-6" /> Análise Estratégica
                </h3>
                {isAnalyzingStrategy ? (
                   <LoadingSpinner message="Mapeando padrão do canal..." size="lg" className="py-10" />
                ) : strategyResult ? (
                   <div className="text-white font-sans text-lg leading-loose">
                     <div className="whitespace-pre-wrap">
                       {strategyResult.split('\n').map((line, i) => {
                         const parts = line.split(/(\*\*.*?\*\*)/g);
                         return (
                           <div key={i} className="mb-4">
                             {parts.map((part, j) => {
                               if (part.startsWith('**') && part.endsWith('**')) {
                                 const label = part.slice(2, -2);
                                 return (
                                   <strong key={j} className="font-black uppercase tracking-widest text-[11px] text-neon-purple block mb-1">
                                     {label}
                                   </strong>
                                 );
                               }
                               return <span key={j} className="text-gray-300">{part}</span>;
                             })}
                           </div>
                         );
                       })}
                     </div>
                   </div>
                ) : (
                   <p className="text-gray-500">Falha ao carregar estratégia.</p>
                )}
              </div>

              {/* SECTION 2: COUNTRY ANALYSIS */}
              <div className="mb-10 bg-white/5 border-2 border-neon-cyan/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-white flex items-center gap-3">
                    <Globe className="text-neon-cyan w-6 h-6" /> Análise Global (15 Países)
                  </h3>
                  {!countryResult && !isAnalyzingCountry && (
                    <button 
                      onClick={runCountryAnalysis}
                      className="px-6 py-2 bg-neon-cyan text-dark font-black rounded-xl hover:bg-white transition-all text-xs"
                    >
                      Verificar Oportunidades
                    </button>
                  )}
                </div>
                
                {isAnalyzingCountry ? (
                   <LoadingSpinner message="Buscando concorrência em 15 países pelo YouTube..." size="lg" className="py-10" />
                ) : countryResult ? (
                   <div className="bg-black/30 border border-white/5 p-6 rounded-xl">
                     <div className="text-white font-sans text-base leading-relaxed whitespace-pre-wrap">
                       {countryResult.split('\n').map((line, i) => {
                         const parts = line.split(/(\*\*.*?\*\*)/g);
                         return (
                           <div key={i} className="mb-2">
                             {parts.map((part, j) => {
                               if (part.startsWith('**') && part.endsWith('**')) {
                                 return <strong key={j} className="text-neon-cyan">{part.slice(2, -2)}</strong>;
                               }
                               return <span key={j} className="text-gray-300">{part}</span>;
                             })}
                           </div>
                         );
                       })}
                     </div>
                   </div>
                ) : (
                   <p className="text-gray-400 text-sm">Identifique em qual país existe baixa concorrência e alta demanda para este modelo de canal.</p>
                )}
              </div>

              {/* SECTION 3: TITLE GENERATOR */}
              <div className="mb-10 bg-white/5 border-2 border-white/10 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 border-b border-white/5 pb-6">
                  <h3 className="text-xl font-black text-white flex items-center gap-3">
                    <Sparkles className="text-white w-6 h-6" /> Gerador de Títulos Virais
                  </h3>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <select 
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="bg-dark border border-white/10 text-gray-300 text-sm rounded-xl px-4 py-2 focus:border-neon-cyan flex-1 md:w-48"
                    >
                      {GLOBAL_LANGUAGES.map(lang => (
                         <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <button 
                      onClick={runTitlesAnalysis}
                      disabled={isAnalyzingTitles}
                      className="px-6 py-2 bg-white text-dark font-black rounded-xl hover:bg-gray-200 transition-all text-xs flex items-center gap-2"
                    >
                      {isAnalyzingTitles ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4" /> Gerar 10 Títulos</>}
                    </button>
                  </div>
                </div>

                {isAnalyzingTitles ? (
                   <LoadingSpinner message="Escrevendo títulos de alto CTR..." size="lg" className="py-10" />
                ) : titlesResult ? (
                   <div className="space-y-3">
                     {titlesResult.split('\n').map((title, idx) => {
                        const titleText = title.replace(/^[\d\-\*\•\)\.\s]+/, '').replace(/^["']+|["']+$/g, '').trim();
                        if (!titleText) return null;
                        return (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/40 border border-white/5 rounded-xl hover:border-white/20 transition-all gap-4">
                            <p className="text-base font-bold text-gray-200 leading-relaxed">
                              <span className="text-white/50 mr-3">{idx + 1}.</span>
                              {titleText}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              <button 
                                onClick={() => handleGenerateFromSuggestedTitle(titleText)}
                                className="px-3 py-1.5 rounded-lg bg-neon-purple/10 text-neon-purple border border-neon-purple/20 text-[10px] font-black uppercase tracking-widest hover:bg-neon-purple hover:text-white transition-all"
                              >
                                Usar
                              </button>
                              <button 
                                onClick={() => copyToClipboard(titleText, idx)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white border border-transparent text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                              >
                                {copiedTitleIndex === idx ? 'Copiado!' : 'Copiar'}
                              </button>
                            </div>
                          </div>
                        );
                     })}
                   </div>
                ) : (
                   <p className="text-gray-400 text-sm">Selecione o idioma e gere os títulos baseados nas críticas e acertos da audiência do canal analisado.</p>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
