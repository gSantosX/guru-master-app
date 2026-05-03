import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, ExternalLink, TrendingUp, BarChart2, Sparkles, Brain, Youtube, Clock, Eye, Video, Activity, Copy, Check, ChevronLeft, RefreshCw, Globe, Loader2, Wand2 } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { resolveApiUrl, buildYouTubeUrl } from '../utils/apiUtils';
import { callAI } from '../utils/aiUtils';
import { t } from '../utils/i18n';
import { usePersistence } from '../contexts/PersistenceContext';

export const ChannelMonitoringTab = ({ isActive, setActiveTab }) => {
  const { configs } = useSystemStatus();
  const [channels, setChannels] = useState(() => {
    const saved = localStorage.getItem('guru_monitored_channels');
    return saved ? JSON.parse(saved) : [];
  });
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisType, setAnalysisType] = useState(null); // 'titles' or 'niche'
  const [showCountSelector, setShowCountSelector] = useState(false);
  const [requestedTitleCount, setRequestedTitleCount] = useState(10);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedTitleIndex, setCopiedTitleIndex] = useState(null);
  const [translations, setTranslations] = useState({}); // { [idx]: string }
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationLang, setTranslationLang] = useState('');
  const { setScriptState } = usePersistence();

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

  const translateTitles = async (titlesRaw) => {
    if (isTranslating) return;
    setIsTranslating(true);
    setTranslations({});
    setTranslationLang('');
    try {
      const gptKeys = configs.gpt_key;
      const geminiKeys = configs.gemini_key;
      const grokKeys = configs.grok_key || localStorage.getItem('guru_grok_key');

      if (!gptKeys && !geminiKeys && !grokKeys) throw new Error('API key not configured');

      const titleLines = titlesRaw
        .split('\n')
        .map(l => l.replace(/^[\d\-\*\•\)\.\s]+/, '').replace(/^["']+|["']+$/g, '').trim())
        .filter(l => l.length > 3);

      const prompt = `You are an expert multilingual translator.

Task: Detect the language of the following titles.
Rule: 
- If the language is NOT Brazilian Portuguese, translate ALL titles to Brazilian Portuguese (PT-BR).
- If the language IS Brazilian Portuguese, do NOT translate them (return an empty list for translations).

Titles to translate:
${titleLines.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Return a JSON object with exactly this structure:
{
  "detected_language": "[language name in Portuguese, e.g. Inglês, Espanhol, Português, etc.]",
  "is_portuguese": [true/false],
  "translations": [
    "translated title 1",
    "translated title 2",
    ...
  ]
}

Rules:
- Keep the same meaning, emotional impact and CTR power
- Adapt idioms naturally — do NOT translate literally if it sounds unnatural
- Return ONLY the JSON object, no markdown, no explanations`;

      const result = await callAI(prompt);
      const clean = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);

      if (parsed.is_portuguese) {
        setTranslationLang('Títulos já estão em Português.');
        setTranslations({});
      } else {
        const map = {};
        (parsed.translations || []).forEach((tr, i) => { map[i] = tr; });
        setTranslations(map);
        setTranslationLang(`${parsed.detected_language || '?'} → Português`);
      }
    } catch (err) {
      console.error('Translation error:', err);
      setTranslationLang('Erro ao traduzir. Tente novamente.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateFromSuggestedTitle = (title) => {
    // 1. Copy to clipboard for safety
    copyToClipboard(title);
    
    // 2. Update persistent script state
    setScriptState(prev => ({
      ...prev,
      titulo: title,
      generatedScript: null, // Clear previous script if any
      statusMessage: ''
    }));
    
    // 3. Switch tab
    if (setActiveTab) {
      setActiveTab('create-script');
    }
  };

  // Automatic search logic
  useEffect(() => {
    const info = extractChannelIdOrHandle(newUrl);
    if (!info) return;

    // Debounce to avoid too many API calls while typing
    const timer = setTimeout(() => {
      // Only auto-add if it looks like a full URL or a specific handle
      if (newUrl.includes('youtube.com/') || newUrl.startsWith('@')) {
        handleAddChannel();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [newUrl]);

  const isRefreshingRef = React.useRef(false);

  const refreshAllChannelsQuietly = async () => {
    if (channels.length === 0 || isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    
    try {
      // Update each channel one by one
      for (let i = 0; i < channels.length; i++) {
        try {
          const freshData = await fetchChannelData({ type: 'id', value: channels[i].id });
          setChannels(prev => prev.map(c => c.id === freshData.id ? freshData : c));
        } catch (err) {
          console.error(`Failed to refresh channel ${channels[i].title}:`, err);
        }
      }
    } finally {
      // Cooldown of 10 seconds to prevent API spam on multiple rapid clicks
      setTimeout(() => { isRefreshingRef.current = false; }, 10000);
    }
  };

  // Refresh all channels on component mount removed to save quota
  // useEffect(() => {
  //   if (isActive) {
  //     refreshAllChannelsQuietly();
  //   }
  // }, [isActive]);

  useEffect(() => {
    localStorage.setItem('guru_monitored_channels', JSON.stringify(channels));
  }, [channels]);

  const resultRef = React.useRef(null);

  // Auto-scroll to result
  useEffect(() => {
    if (analysisResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [analysisResult]);

  // Auto-refresh data when opening channel
  useEffect(() => {
    if (selectedChannel) {
       // We only trigger refresh if it's the first time in this "session" or explicitly requested
       // But user said "always when clicks", so we trigger it.
       // To avoid infinite loops (since setSelectedChannel(data) triggers this effect),
       // we skip if isAnalyzing is already true (refresh is in progress)
       if (!isAnalyzing) {
         handleRefreshChannel();
       }
    }
  }, [selectedChannel?.id]); // Only trigger when ID changes to avoid loops

  const extractChannelIdOrHandle = (url) => {
    if (!url) return null;
    // Handles: @handle
    if (url.startsWith('@')) return { type: 'handle', value: url };
    // URLs: https://www.youtube.com/@handle
    const handleMatch = url.match(/youtube\.com\/(@[\w.-]+)/);
    if (handleMatch) return { type: 'handle', value: handleMatch[1] };
    // URLs: https://www.youtube.com/channel/UC...
    const idMatch = url.match(/youtube\.com\/channel\/([\w-]+)/);
    if (idMatch) return { type: 'id', value: idMatch[1] };
    // Just the ID
    if (url.startsWith('UC') && url.length > 20) return { type: 'id', value: url };
    
    return null;
  };

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
      
      // Check Cache first (unless forced)
      const cacheKey = `yt_channel_${info.value}`;
      if (!force) {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 2 * 60 * 60 * 1000) {
              console.log("Using cached YouTube data for", info.value);
              return parsed.data;
            }
          } catch (e) {}
        }
      }
      
      // If handle, first find the channel ID
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

      // Fetch channel details
      const channelRes = await fetch(buildYouTubeUrl('channels', { part: 'snippet,statistics', id: channelId }));
      const channelData = await channelRes.json();
      checkYouTubeError(channelData, 'channels');
      
      if (!channelData.items || channelData.items.length === 0) {
        throw new Error('Canal não encontrado pelo ID. Tente com o link direto do YouTube.');
      }

      const snippet = channelData.items[0].snippet;
      const stats = channelData.items[0].statistics;

      // Fetch trending/viral videos (by view count)
      const viralRes = await fetch(buildYouTubeUrl('search', { part: 'snippet', channelId, order: 'viewCount', type: 'video', maxResults: '5' }));
      const viralData = await viralRes.json();
      checkYouTubeError(viralData, 'search viral');

      // Fetch latest videos (by date)
      const latestRes = await fetch(buildYouTubeUrl('search', { part: 'snippet', channelId, order: 'date', type: 'video', maxResults: '5' }));
      const latestData = await latestRes.json();
      checkYouTubeError(latestData, 'search latest');
      
      // Fetch statistics for all these videos
      const videoIds = [
        ...(viralData.items || []).map(v => v.id.videoId),
        ...(latestData.items || []).map(v => v.id.videoId)
      ].filter(Boolean).join(',');

      let videoStats = {};
      if (videoIds) {
        const statsRes = await fetch(buildYouTubeUrl('videos', { part: 'statistics', id: videoIds }));
        const statsData = await statsRes.json();
        checkYouTubeError(statsData, 'videos stats');
        (statsData.items || []).forEach(v => {
          videoStats[v.id] = v.statistics.viewCount;
        });
      }

      // --- AUDIENCE FEEDBACK SCAN (Nouveau) ---
      let audienceFeedback = [];
      try {
        // Call 1: Global Channel Comments (most relevant)
        const globalCommentsRes = await fetch(buildYouTubeUrl('commentThreads', { allThreadsRelatedToChannelId: channelId, part: 'snippet', maxResults: '20', order: 'relevance' }));
        const globalCommentsData = await globalCommentsRes.json();
        (globalCommentsData.items || []).forEach(item => {
          audienceFeedback.push({
            text: item.snippet.topLevelComment.snippet.textDisplay,
            likeCount: item.snippet.topLevelComment.snippet.likeCount,
            type: 'global'
          });
        });

        // Call 2: Viral Comments (surgical critique)
        const topViralId = viralData.items?.[0]?.id?.videoId;
        if (topViralId) {
          const viralCommentsRes = await fetch(buildYouTubeUrl('commentThreads', { videoId: topViralId, part: 'snippet', maxResults: '20', order: 'relevance' }));
          const viralCommentsData = await viralCommentsRes.json();
          (viralCommentsData.items || []).forEach(item => {
            audienceFeedback.push({
              text: item.snippet.topLevelComment.snippet.textDisplay,
              likeCount: item.snippet.topLevelComment.snippet.likeCount,
              type: 'viral_critique'
            });
          });
        }
      } catch (e) {
        console.warn("Failed to fetch audience feedback:", e);
      }

      const result = {
        id: channelId,
        title: snippet.title,
        description: snippet.description,
        thumbnail: snippet.thumbnails.medium.url,
        customUrl: snippet.customUrl,
        subscriberCount: stats.subscriberCount,
        viewCount: stats.viewCount,
        videoCount: stats.videoCount,
        viralVideos: (viralData.items || []).map(v => ({
          id: v.id.videoId,
          title: v.snippet.title,
          publishedAt: v.snippet.publishedAt,
          thumbnail: v.snippet.thumbnails.medium.url,
          viewCount: videoStats[v.id.videoId] || 0
        })),
        latestVideos: (latestData.items || []).map(v => ({
          id: v.id.videoId,
          title: v.snippet.title,
          publishedAt: v.snippet.publishedAt,
          thumbnail: v.snippet.thumbnails.medium.url,
          viewCount: videoStats[v.id.videoId] || 0
        })),
        audienceFeedback: audienceFeedback
      };

      // Save to cache
      sessionStorage.setItem(`yt_channel_${info.value}`, JSON.stringify({
        timestamp: Date.now(),
        data: result
      }));

      return result;
    } catch (err) {
      console.error('Fetch error:', err);
      throw err;
    }
  };

  const handleAddChannel = async () => {
    const info = extractChannelIdOrHandle(newUrl);
    if (!info) {
      alert(t('channels.invalid_url'));
      return;
    }

    setIsAdding(true);
    try {
      const data = await fetchChannelData(info);
      if (channels.find(c => c.id === data.id)) {
        alert('Este canal já está sendo monitorado.');
      } else {
        setChannels([...channels, data]);
        setNewUrl('');
      }
    } catch (err) {
      alert(t('channels.fetch_error') + ': ' + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRefreshChannel = async (force = true) => {
    if (!selectedChannel) return;
    setIsAnalyzing(true);
    try {
      const data = await fetchChannelData({ type: 'id', value: selectedChannel.id }, force);
      setChannels(prev => prev.map(c => c.id === data.id ? data : c));
      setSelectedChannel(data);
    } catch (err) {
      alert('Erro ao atualizar dados: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeChannel = (id, e) => {
    e.stopPropagation();
    setChannels(channels.filter(c => c.id !== id));
    if (selectedChannel?.id === id) setSelectedChannel(null);
  };

  const runAnalysis = async (type, count = 10) => {
    let brainContext = "";
    try {
      const brainRes = await fetch(resolveApiUrl('/api/brain/context?niche=Geral'));
      const brainData = await brainRes.json();
      brainContext = brainData.experience;
    } catch (err) { console.error('Brain Fetch Error', err); }
    if (!selectedChannel) return;
    setIsAnalyzing(true);
    
    // Refresh data before analysis to ensure real-time accuracy
    try {
      const freshData = await fetchChannelData({ type: 'id', value: selectedChannel.id });
      setChannels(prev => prev.map(c => c.id === freshData.id ? freshData : c));
      setSelectedChannel(freshData);
    } catch (err) {
      console.warn('Silent refresh fail before analysis:', err);
    }
    
    setAnalysisType(type);
    setAnalysisResult(null);
    setShowCountSelector(false);

    const activeAi = configs.active_ai;
    const gptKeys = configs.gpt_key;
    const geminiKeys = configs.gemini_key;
    const grokKeys = configs.grok_key;

    if (!gptKeys && !geminiKeys && !grokKeys) {
      alert(`Erro: Nenhuma chave de API configurada. Vá em Configurações.`);
      setIsAnalyzing(false);
      return;
    }

    const viralText = (selectedChannel.viralVideos || []).map(v => `- ${v.title}`).join('\n');
    const latestText = (selectedChannel.latestVideos || []).map(v => `- ${v.title}`).join('\n');
    const audienceText = (selectedChannel.audienceFeedback || [])
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 30)
      .map(c => `[${c.type.toUpperCase()}] (${c.likeCount} likes): ${c.text}`)
      .join('\n');
    
    let prompt = '';

    if (type === 'titles') {
      prompt = `Você é um ESPECIALISTA ELITE em CTR, Algoritmos do YouTube e Psicologia do Clique.

CANAL EM ANÁLISE: "${selectedChannel.title}"

VÍDEOS MAIS POPULARES (Já provaram funcionar):
${viralText || 'Dados não disponíveis'}

VOZ DA AUDIÊNCIA (O que os inscritos estão comentando, pedindo e criticando):
${audienceText || 'Sem comentários recentes disponíveis.'}

---
## MISSÃO: Gerar ${count} títulos NOVOS de altíssimo CTR para este canal

## REGRA DE OURO (SITUAÇÃO DE MERCADO):
Identifique as CRÍTICAS nos comentários dos vídeos virais. Se o público reclamou de algo, ou pediu uma abordagem diferente, USE ISSO como gancho. 
Exemplo: Se criticaram que o vídeo viral foi "curto demais", crie um título focado em profundidade ("A análise completa que eles omitiram").

CANAL EM ANÁLISE: "${selectedChannel.title}"

VÍDEOS MAIS POPULARES DO CANAL (os que já provaram funcionar):
${viralText || 'Dados não disponíveis'}

VÍDEOS MAIS RECENTES DO CANAL:
${latestText || 'Dados não disponíveis'}

${brainContext ? `INTELIGÊNCIA TÁTICA ACUMULADA (memória de análises anteriores):
${brainContext}
` : ''}
---
## MISSÃO: Gerar ${count} títulos NOVOS de altíssimo CTR para este canal

## IDIOMA OBRIGATÓRIO (REQUISITO CRÍTICO)
Gere os títulos EXATAMENTE no mesmo idioma que o canal utiliza nos vídeos listados (se o canal é em Inglês, gere em Inglês; se é Alemão, em Alemão; se é Espanhol, em Espanhol, etc). NUNCA traduza os títulos para o Português se o canal original for estrangeiro.

## ANATOMIA OBRIGATÓRIA DE CADA TÍTULO
Cada título deve conter TODOS os elementos:
1. ESPECIFICIDADE: Número, dado concreto, nome ou contexto preciso — nunca genérico
2. LACUNA COGNITIVA: Informação suficiente para criar curiosidade, insuficiente para satisfazê-la
3. EMOÇÃO PRIMÁRIA: Uma por título — medo de perda, curiosidade, esperança, indignação ou surpresa
4. COMPRIMENTO: Entre 40 e 75 caracteres — ideal para feed do YouTube e Shorts
5. PALAVRA DE ABERTURA FORTE: A primeira palavra deve ser a mais impactante da frase

## VARIAÇÃO OBRIGATÓRIA DE GANCHOS
Distribua os ${count} títulos usando obrigatoriamente estas estruturas (varie entre elas):
- REVELAÇÃO: [O que estava oculto] + [Quem escondia] + [Implicação]
- NÚMERO/DADO: [Quantidade específica] + [Resultado] + [Contexto surpreendente]
- CONFLITO: [Crença comum] vs [Verdade contrária]
- URGÊNCIA PESSOAL: [Você] + [Situação atual] + [Consequência]
- TRANSFORMAÇÃO: [Ponto A específico] → [Ponto B surpreendente] + [Tempo]
- INVESTIGAÇÃO: [Pergunta perturbadora] + [Promessa de resposta inesperada]

## ANÁLISE DO CANAL PARA PERSONALIZAÇÃO
Baseado nos títulos que já performaram neste canal:
- Identifique o padrão de LINGUAGEM que funciona (formal/informal, técnica/popular)
- Identifique os TEMAS que mais engajam neste nicho
- Crie títulos que exploram ÂNGULOS que o canal AINDA NÃO usou
- NUNCA repita estruturas já usadas nos vídeos populares listados acima

## BLACKLIST — PROIBIDO
❌ Marcação Markdown: Proibido o uso de asteriscos (**), negrito, itálico, aspas ou qualquer outra formatação especial nos títulos. Retorne 100% texto limpo.
❌ Estruturas gastas: "A verdade que ninguém te conta", "O segredo que escondem", "Você não vai acreditar"
❌ Adjetivos vazios: "incrível", "surpreendente", "chocante" (sem substância)
❌ Títulos genéricos que servem para qualquer canal

Identifique as CRÍTICAS nos comentários dos vídeos virais. Se o público reclamou de algo, ou pediu uma abordagem diferente, USE ISSO como combustível para o CTR.
Exemplo: Se criticaram que o vídeo viral foi "curto demais", crie um título focado em profundidade ("A análise completa que eles omitiram").
Se pediram por um tema específico, crie 2 títulos focados APENAS nessa solicitação.

RETORNO ESPERADO:
Retorne APENAS a lista numerada. Sem introduções. Sem asteriscos. Texto 100% limpo e pronto para uso (ex: 1. Como a Rota Proibida Esconde 14 Mortes).`;

    } else {
      prompt = `Você é um MENTOR ESTRATÉGICO SÊNIOR de YouTube — especialista em análise de canais, crescimento orgânico e replicação de estratégias virais.

CANAL EM ANÁLISE: "${selectedChannel.title}"

VÍDEOS MAIS POPULARES (o que já provou funcionar):
${viralText || 'Dados não disponíveis'}

VÍDEOS MAIS RECENTES:
${latestText || 'Dados não disponíveis'}

${brainContext ? `CONTEXTO ESTRATÉGICO ACUMULADO:
${brainContext}
` : ''}
---
Sua resposta deve ter EXATAMENTE estas 6 partes EM PORTUGUÊS (PT-BR) — sem introdução, sem conclusão:

**1. DIAGNÓSTICO DO NICHO**
Em 1-2 frases: Qual é o posicionamento real deste canal? O que ele vende emocionalmente?

**2. FÓRMULA DE SUCESSO**
Identifique 2-3 padrões específicos de título ou tema que os vídeos virais têm em comum.

**3. VOZ DA AUDIÊNCIA (CRÍTICAS & DESEJOS)**
RESUMA em bullet points o que o público tanto comenta:
- O que eles pediram para o próximo vídeo?
- Do que eles reclamaram ou criticaram nos vídeos virais?
- Quais dúvidas são recorrentes nos comentários?

**4. LACUNA DE OPORTUNIDADE**
Que ângulos este canal AINDA NÃO explorou, mas que a audiência está pedindo nos comentários?

**5. DICA DE OURO REPLICÁVEL**
Uma estratégia concreta baseada no feedback da audiência para o usuário aplicar.

**6. ARMADILHA A EVITAR**
O erro que a audiência mais critica neste tipo de canal.

REGRAS DE FORMATO:
- TUDO EM PORTUGUÊS (PT-BR)
- Use **NEGRITO** para títulos de seção
- Cada seção máximo 3-4 linhas`;

    }

    try {
      const result = await callAI(prompt);
      
      if (!result || result.trim().length === 0) {
        throw new Error('A IA retornou uma resposta vazia. Tente novamente ou verifique sua chave API.');
      }
      
      // alert(`Análise recebida com sucesso! Tamanho: ${result.length} caracteres.`);
      setAnalysisResult(result);
      // Auto-Learn Pattern
      fetch(resolveApiUrl('/api/brain/learn'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: 'Geral',
          report: result,
          metadata: { channel_name: selectedChannel.title, type: analysisType }
        })
      }).catch(err => console.error('Learning Fail', err));
    } catch (err) {
      alert('Erro na análise: ' + err.message);
    } finally {
      setIsAnalyzing(false);
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
    <div className="flex flex-col h-full w-full max-w-[1600px] mx-auto overflow-hidden" onClickCapture={refreshAllChannelsQuietly}>
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
                {t('sidebar.channel_monitoring') || 'Vigilância de Canais'}
              </h2>
              <p className="text-gray-400 mt-3 font-bold text-sm uppercase tracking-[0.2em] border-l-4 border-neon-cyan pl-4 ml-2 italic">
                {t('channels.subtitle') || 'Monitoramento Tático e Engenharia Reversa de Concorrência'}
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
                  onClick={() => handleAddChannel()}
                  disabled={isAdding || !newUrl}
                  className="px-6 py-3 bg-neon-cyan text-dark font-black rounded-2xl hover:bg-white transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.2)] font-mono"
                >
                  {isAdding ? <div className="w-5 h-5 border-2 border-dark/20 border-t-dark rounded-full animate-spin" /> : <Plus className="w-5 h-5" />}
                  <span className="hidden sm:inline">Adicionar</span>
                </button>
              </div>

            {channels.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-white/5 border border-white/5 rounded-[40px] border-dashed">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                  <Youtube className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Nenhum canal monitorado</h3>
                <p className="text-gray-500 max-w-xs font-medium">Cole a URL de um canal acima para começar a monitorar e gerar insights.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {channels.map(channel => (
                    <motion.div
                      key={channel.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => {
                        const original = channels.find(c => c.id === channel.id);
                        setSelectedChannel(original);
                        setAnalysisResult(null);
                        setShowCountSelector(false);
                      }}
                      className="bg-white/5 border border-white/5 rounded-2xl p-6 group hover:border-neon-cyan/40 transition-all cursor-pointer relative overflow-hidden shadow-xl hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-lg group-hover:border-neon-cyan/50 transition-all">
                          <img src={channel.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setChannels(channels.filter(c => c.id !== channel.id));
                          }}
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
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
              <div className="flex items-center justify-between mb-12">
                <button 
                  onClick={() => setSelectedChannel(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all font-black text-xs uppercase tracking-widest border border-white/5"
                >
                  <Plus className="w-4 h-4 rotate-45" /> Voltar para lista
                </button>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleRefreshChannel}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest border border-white/5 disabled:opacity-50 font-mono"
                  >
                    {isAnalyzing ? <LoadingSpinner size="sm" /> : <Clock className="w-3 h-3" />}
                    {isAnalyzing ? 'Atualizando...' : 'Atualizar Dados'}
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
                   { label: 'Inscritos Reais', val: formatNumber(selectedChannel.subscriberCount), icon: Youtube, color: 'text-neon-cyan' },
                   { label: 'Visualizações', val: formatNumber(selectedChannel.viewCount), icon: Eye, color: 'text-neon-pink' },
                   { label: 'Total de Vídeos', val: selectedChannel.videoCount, icon: Video, color: 'text-neon-purple' }
                 ].map((s, i) => (
                   <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 group hover:bg-white/[0.07] transition-all">
                      <s.icon className={`w-5 h-5 ${s.color} opacity-50 group-hover:opacity-100 transition-all`} />
                      <p className="text-2xl font-black text-white">{s.val}</p>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{s.label}</p>
                   </div>
                 ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
                <section>
                  <h3 className="text-xs font-black text-gray-400 mb-6 flex items-center gap-2 uppercase tracking-[0.3em] pb-4 border-b border-white/5">
                    <TrendingUp className="w-4 h-4 text-neon-cyan" /> Vídeos em Alta
                  </h3>
                  <div className="space-y-4">
                    {selectedChannel.viralVideos?.slice(0, 4).map((v, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-xl group hover:border-neon-cyan/30 transition-all">
                        <div className="w-24 h-14 rounded-xl overflow-hidden shrink-0 border border-white/5">
                          <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-gray-200 line-clamp-1 group-hover:text-neon-cyan transition-colors">{v.title}</h4>
                          <div className="flex items-center gap-3 mt-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                            <span className="flex items-center gap-1 text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded-full"><Eye className="w-3 h-3" /> {formatNumber(v.viewCount)}</span>
                            <span>{new Date(v.publishedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <a href={`https://youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className="p-2 text-gray-600 hover:text-white transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
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
                      <div key={i} className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-xl group hover:border-neon-purple/30 transition-all">
                        <div className="w-24 h-14 rounded-xl overflow-hidden shrink-0 border border-white/5">
                          <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                         <div className="flex-1 min-w-0">
                           <h4 className="text-sm font-bold text-gray-200 line-clamp-1 group-hover:text-neon-purple transition-colors">{v.title}</h4>
                           <div className="flex items-center gap-3 mt-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                             <span className="flex items-center gap-1 text-neon-purple bg-neon-purple/10 px-2 py-0.5 rounded-full"><Eye className="w-3 h-3" /> {formatNumber(v.viewCount)}</span>
                             <span>{new Date(v.publishedAt).toLocaleDateString()}</span>
                           </div>
                         </div>
                        <a href={`https://youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className="p-2 text-gray-600 hover:text-white transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="mb-10">
                <header className="mb-8 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                      <Brain className="text-neon-purple w-6 h-6" /> Guru Mentoria IA
                    </h3>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest mt-1">Growth Specialist & Insights</p>
                  </div>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <button 
                    onClick={() => {
                      setAnalysisType('titles');
                      setShowCountSelector(true);
                      setAnalysisResult(null);
                    }}
                    disabled={isAnalyzing}
                    className="flex flex-col items-center justify-center p-6 bg-white/5 border-2 border-neon-cyan/10 rounded-2xl hover:bg-neon-cyan/5 hover:border-neon-cyan transition-all group gap-4 text-center disabled:opacity-50"
                  >
                    <div className="w-16 h-16 rounded-xl bg-neon-cyan/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Youtube className="w-8 h-8 text-neon-cyan" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-white">Gerar Títulos Virais</p>
                      <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">Baseado em performance real</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => runAnalysis('niche')}
                    disabled={isAnalyzing}
                    className="flex flex-col items-center justify-center p-6 bg-white/5 border-2 border-neon-purple/10 rounded-2xl hover:bg-neon-purple/5 hover:border-neon-purple transition-all group gap-4 text-center disabled:opacity-50 relative"
                  >
                    <div className="w-16 h-16 rounded-xl bg-neon-purple/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {isAnalyzing && analysisType === 'niche' ? <div className="w-8 h-8 border-2 border-neon-purple/20 border-t-neon-purple rounded-full animate-spin" /> : <Brain className="w-8 h-8 text-neon-purple" />}
                    </div>
                    <div>
                      <p className="text-lg font-black text-white">Dicas e Estratégia</p>
                      <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">Análise estratégica profunda</p>
                    </div>
                  </button>
                </div>

                <AnimatePresence>
                  {showCountSelector && (
                    <motion.div 
                      key="selector"
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mb-10 p-6 bg-white/5 border border-neon-cyan/20 rounded-2xl"
                    >
                      <p className="text-xs font-black text-neon-cyan uppercase tracking-widest mb-4 flex items-center gap-2">
                         Quantos títulos deseja gerar?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[5, 10, 15, 20].map(count => (
                          <button
                            key={count}
                            onClick={() => runAnalysis('titles', count)}
                            className="px-6 py-3 rounded-xl bg-dark border border-white/10 text-white font-black hover:border-neon-cyan hover:text-neon-cyan transition-all"
                          >
                            {count} Títulos
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {(isAnalyzing || analysisResult !== null) && (
                    <motion.div 
                      key="result"
                      ref={resultRef}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="bg-black/40 border-2 border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-2 h-full bg-neon-cyan" />
                      
                      {isAnalyzing ? (
                        <LoadingSpinner message="Consultando Guru IA..." size="lg" className="py-16" />
                      ) : (
                        <div className="animate-fade-in">
                          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                            <h4 className="text-xl font-black text-white flex items-center gap-3">
                               <Sparkles className="w-5 h-5 text-neon-cyan" /> 
                               {analysisType === 'titles' ? 'Títulos Sugeridos' : 'Plano Estratégico'}
                            </h4>
                            <div className="flex items-center gap-2">
                              {analysisType === 'titles' && (
                                <button
                                  onClick={() => translateTitles(String(analysisResult || ''))}
                                  disabled={isTranslating}
                                  title="Traduzir todos os títulos"
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                                    isTranslating
                                      ? 'bg-neon-purple/10 border-neon-purple/40 text-neon-purple'
                                      : Object.keys(translations).length > 0
                                        ? 'bg-neon-purple/20 border-neon-purple text-neon-purple'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-neon-purple hover:border-neon-purple/40 hover:bg-neon-purple/5'
                                  }`}
                                >
                                  {isTranslating
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <><Globe className="w-3 h-3" /> {Object.keys(translations).length > 0 ? 'Traduzido' : 'Traduzir'}</>}
                                </button>
                              )}
                              <button 
                                onClick={() => copyToClipboard(String(analysisResult || ""))}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all transform active:scale-95
                                  ${isCopied 
                                    ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                                    : 'bg-white/10 border-white/10 text-white hover:bg-white hover:text-dark shadow-xl'
                                  }`}
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {isCopied ? 'Copiado!' : 'Copiar Análise Completa'}
                              </button>
                            </div>
                          </div>
                          {translationLang && analysisType === 'titles' && (
                            <div className="mb-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                              <Globe className="w-3 h-3 text-neon-purple" />
                              <span className="text-neon-purple">{translationLang}</span>
                            </div>
                          )}
                          
                          {analysisType === 'titles' ? (
                            <div className="space-y-4">
                              {String(analysisResult || "").split('\n').map((title, idx) => {
                                const titleText = title.replace(/^[\d\-\*\•\)\.\s]+/, '').replace(/^["']+|["']+$/g, '').trim();
                                if (!titleText) return null;
                                return (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="flex flex-col p-4 bg-white/5 border border-white/10 rounded-xl group hover:border-neon-cyan/40 transition-all"
                                  >
                                    <div className="flex items-center justify-between">
                                      <p className="text-base font-bold text-gray-200 pr-4 leading-relaxed flex-1">
                                        <span className="text-neon-cyan font-black mr-4 text-lg">{idx + 1}</span>
                                        {titleText}
                                      </p>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <button 
                                          onClick={() => handleGenerateFromSuggestedTitle(titleText)}
                                          title="Gerar Roteiro com este título"
                                          className="h-10 px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-neon-purple/10 text-neon-purple hover:bg-neon-purple hover:text-white border border-neon-purple/20 transform active:scale-95"
                                        >
                                          <Wand2 className="w-3.5 h-3.5" />
                                          <span className="hidden sm:inline">Gerar Roteiro</span>
                                        </button>
                                        <button 
                                          onClick={() => copyToClipboard(titleText, idx)}
                                          className={`h-10 px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transform active:scale-95
                                            ${copiedTitleIndex === idx 
                                              ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                                              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
                                            }
                                          `}
                                        >
                                          {copiedTitleIndex === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                          {copiedTitleIndex === idx ? 'Copiado' : 'Copiar'}
                                        </button>
                                      </div>
                                    </div>
                                    <AnimatePresence>
                                      {translations[idx] && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: 'auto' }}
                                          exit={{ opacity: 0, height: 0 }}
                                          className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2 overflow-hidden"
                                        >
                                          <Globe className="w-3 h-3 text-neon-purple mt-0.5 shrink-0" />
                                          <span className="text-sm text-neon-purple/80 font-medium italic leading-snug">{translations[idx]}</span>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </motion.div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-white font-sans text-lg leading-loose">
                              <div className="whitespace-pre-wrap">
                                {String(analysisResult || "").split('\n').map((line, i) => {
                                  const parts = line.split(/(\*\*.*?\*\*)/g);
                                  const isAudienceSection = line.includes('VOZ DA AUDIÊNCIA') || line.includes('CRÍTICAS IDENTIFICADAS');
                                  return (
                                    <div key={i} className={`mb-4 ${isAudienceSection ? 'bg-neon-purple/5 p-4 rounded-xl border border-neon-purple/20' : ''}`}>
                                      {parts.map((part, j) => {
                                        if (part.startsWith('**') && part.endsWith('**')) {
                                          const label = part.slice(2, -2);
                                          return (
                                            <div key={j} className="flex items-center gap-2 mb-2">
                                              {isAudienceSection && <Activity className="w-4 h-4 text-neon-purple" />}
                                              <strong className={`font-black uppercase tracking-widest text-[11px] ${isAudienceSection ? 'text-neon-purple' : 'text-neon-cyan'}`}>
                                                {label}
                                              </strong>
                                            </div>
                                          );
                                        }
                                        return <span key={j} className={isAudienceSection ? 'text-gray-300' : ''}>{part}</span>;
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
