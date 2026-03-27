import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, ExternalLink, TrendingUp, BarChart2, Sparkles, Brain, Youtube, Clock, Eye, Video, Activity, Copy, Check, ChevronLeft, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { resolveApiUrl } from '../utils/apiUtils';
import { callGemini, callGPT, callGrok } from '../utils/aiUtils';
import { t } from '../utils/i18n';

export const ChannelMonitoringTab = ({ isActive }) => {
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

  // Refresh all channels on component mount
  useEffect(() => {
    if (isActive) {
      refreshAllChannelsQuietly();
    }
  }, [isActive]); // Refresh when tab becomes active

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

  const fetchChannelData = async (info) => {
    try {
      let channelId = info.value;
      
      // If handle, first find the channel ID
      if (info.type === 'handle') {
        const searchRes = await fetch(resolveApiUrl(`/api/youtube/search?part=snippet&type=channel&q=${info.value}`));
        const searchData = await searchRes.json();
        if (searchData.items && searchData.items.length > 0) {
          channelId = searchData.items[0].id.channelId;
        } else {
          throw new Error('Channel not found');
        }
      }

      // Fetch channel details
      const channelRes = await fetch(resolveApiUrl(`/api/youtube/channels?part=snippet,statistics&id=${channelId}`));
      const channelData = await channelRes.json();
      
      if (!channelData.items || channelData.items.length === 0) {
        throw new Error('Channel details not found');
      }

      const snippet = channelData.items[0].snippet;
      const stats = channelData.items[0].statistics;

      // Fetch trending/viral videos (by view count)
      const viralRes = await fetch(resolveApiUrl(`/api/youtube/search?part=snippet&channelId=${channelId}&order=viewCount&type=video&maxResults=5`));
      const viralData = await viralRes.json();

      // Fetch latest videos (by date)
      const latestRes = await fetch(resolveApiUrl(`/api/youtube/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5`));
      const latestData = await latestRes.json();
      
      // Fetch statistics for all these videos
      const videoIds = [
        ...(viralData.items || []).map(v => v.id.videoId),
        ...(latestData.items || []).map(v => v.id.videoId)
      ].filter(Boolean).join(',');

      let videoStats = {};
      if (videoIds) {
        const statsRes = await fetch(resolveApiUrl(`/api/youtube/videos?part=statistics&id=${videoIds}`));
        const statsData = await statsRes.json();
        (statsData.items || []).forEach(v => {
          videoStats[v.id] = v.statistics.viewCount;
        });
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
        }))
      };
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

  const handleRefreshChannel = async () => {
    if (!selectedChannel) return;
    setIsAnalyzing(true);
    try {
      const data = await fetchChannelData({ type: 'id', value: selectedChannel.id });
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
    const apiKey = activeAi === 'Gemini' ? configs.gemini_key : (activeAi === 'GPT' ? configs.gpt_key : configs.grok_key);

    if (!apiKey || apiKey.length < 5) {
      alert(`Erro: A chave do ${activeAi} não está configurada. Vá em Configurações.`);
      setIsAnalyzing(false);
      return;
    }

    const viralText = (selectedChannel.viralVideos || []).map(v => `- ${v.title}`).join('\n');
    const latestText = (selectedChannel.latestVideos || []).map(v => `- ${v.title}`).join('\n');
    
    let prompt = '';

    if (type === 'titles') {
      prompt = `Aja como um especialista em SEO e viralização de vídeos no YouTube. 
Analise os vídeos do canal "${selectedChannel.title}":
POPULARES: ${viralText}
RECENTES: ${latestText}

Sua tarefa:
Gere ${count} NOVOS títulos de vídeos altamente otimizados. Use "Clickbait Ético", curiosidade e urgência.
IMPORTANTE: 
1. Não repita a estrutura entre os títulos. 
2. Varie as abordagens e temas baseados no tema central do canal.
3. Use novos ângulos e ganchos que o canal ainda não explorou.

Retorne APENAS a lista numerada (1. Título, 2. Título...). Sem texto antes ou depois.`;
    } else {
      prompt = `Aja como um mentor experiente de YouTube explicando para um TOTAL INICIANTE.
Analise a estratégia do canal "${selectedChannel.title}".

DADOS DO CANAL:
Vídeos Populares:
${viralText || 'Não disponível'}

Vídeos Recentes:
${latestText || 'Não disponível'}

Seja extremamente DIRETO e RESUMIDO. Use linguagem simples (sem termos técnicos complexos).
Sua resposta deve ter 4 partes:
1. FOCO PRINCIPAL: O que esse canal faz de melhor? (1 frase)
2. SEGREDO DO SUCESSO: Por que as pessoas clicam? (2 tópicos curtos)
3. DICA DE OURO: Como o usuário pode aplicar isso no próprio canal? (1 frase curta)
4. O QUE EVITAR: Um erro comum nesse nicho.

IMPORTANTE: 
- Use **NEGRITO** nas frases e palavras mais importantes.
- Use no MÁXIMO 2 emojis em toda a resposta.
- Não use introduções ou conclusões. Vá direto ao ponto.`;
    }

    try {
      let result = '';
      if (activeAi === 'Gemini') result = await callGemini(apiKey, prompt);
      else if (activeAi === 'GPT') result = await callGPT(apiKey, prompt);
      else if (activeAi === 'Grok') result = await callGrok(apiKey, prompt);
      
      if (!result || result.trim().length === 0) {
        throw new Error('A IA retornou uma resposta vazia. Tente novamente ou verifique sua chave API.');
      }
      
      // alert(`Análise recebida com sucesso! Tamanho: ${result.length} caracteres.`);
      setAnalysisResult(result);
    } catch (err) {
      alert('Erro na análise: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [isCopied, setIsCopied] = useState(false);
  const [copiedTitleIndex, setCopiedTitleIndex] = useState(null);

  const copyToClipboard = (text, index = null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (index !== null) {
      setCopiedTitleIndex(index);
      setTimeout(() => setCopiedTitleIndex(null), 2000);
    } else {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
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
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-2xl md:text-4xl font-black text-white flex items-center gap-3 tracking-tight">
                  <span className="p-2 bg-neon-cyan/10 rounded-2xl border border-neon-cyan/20">
                    <Activity className="text-neon-cyan w-6 h-6 md:w-8 md:h-8" />
                  </span>
                  {t('sidebar.channel_monitoring')}
                </h2>
                <p className="text-gray-400 mt-2 font-medium text-sm md:text-base border-l-2 border-neon-cyan pl-3 ml-2">{t('channels.subtitle')}</p>
              </div>

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
            </header>

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
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                          <img src={channel.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setChannels(channels.filter(c => c.id !== channel.id));
                          }}
                          className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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
                            <button 
                              onClick={() => {
                                const text = String(analysisResult || "");
                                navigator.clipboard.writeText(text);
                                setIsCopied(true);
                                setTimeout(() => setIsCopied(false), 2000);
                              }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                isCopied ? 'bg-green-500 text-dark' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {isCopied ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                          
                          {analysisType === 'titles' ? (
                            <div className="space-y-4">
                              {String(analysisResult || "").split('\n').map((title, idx) => {
                                const titleText = title.replace(/^[\d\-\*\•\)\.\s]+/, '').replace(/^["']+|["']+$/g, '').trim();
                                if (!titleText) return null;
                                return (
                                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl group hover:border-neon-cyan/40 transition-all">
                                    <p className="text-base font-bold text-gray-200 pr-6 leading-relaxed">
                                      <span className="text-neon-cyan font-black mr-4 text-lg">{idx + 1}</span>
                                      {titleText}
                                    </p>
                                    <button 
                                      onClick={() => copyToClipboard(titleText, idx)}
                                      className={`shrink-0 h-10 px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest
                                        ${copiedTitleIndex === idx 
                                          ? 'bg-green-500 text-dark' 
                                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                        }
                                      `}
                                    >
                                      {copiedTitleIndex === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                      {copiedTitleIndex === idx ? 'Copiado' : 'Copiar'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-white font-sans text-lg leading-loose">
                              <div className="whitespace-pre-wrap">
                                {String(analysisResult || "").split('\n').map((line, i) => {
                                  const parts = line.split(/(\*\*.*?\*\*)/g);
                                  return (
                                    <div key={i} className="mb-4">
                                      {parts.map((part, j) => {
                                        if (part.startsWith('**') && part.endsWith('**')) {
                                          return <strong key={j} className="text-neon-cyan font-black">{part.slice(2, -2)}</strong>;
                                        }
                                        return <span key={j}>{part}</span>;
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
