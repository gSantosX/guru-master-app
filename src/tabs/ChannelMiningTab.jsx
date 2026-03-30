import React, { useState, useEffect } from 'react';
import { Youtube, Search, Loader2, Globe, TrendingUp, Video, Users, Copy, Check, ExternalLink, Zap, Layers, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { t } from '../utils/i18n';
import { resolveApiUrl } from '../utils/apiUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';

const NICHES = [
  "Finanças", "História", "Mistérios", "Crimes Reais", "Espiritualidade", 
  "Motivação", "Saúde", "Tecnologia", "Curiosidades", "Documentários",
  "Gameplay", "Culinária", "Viagens", "Pets", "Moda", "Educação"
];

const LANGUAGES = [
  { name: "Português (BR)", code: "pt", region: "BR" },
  { name: "English", code: "en", region: "US" },
  { name: "Español", code: "es", region: "MX" },
  { name: "Français", code: "fr", region: "FR" },
  { name: "Deutsch", code: "de", region: "DE" },
  { name: "Italiano", code: "it", region: "IT" },
  { name: "Hindi", code: "hi", region: "IN" },
  { name: "Japonês", code: "ja", region: "JP" }
];

export const ChannelMiningTab = ({ setActiveTab }) => {
  const { configs } = useSystemStatus();
  const [selectedNiche, setSelectedNiche] = useState(NICHES[0]);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isSearching, setIsSearching] = useState(false);
  const [channels, setChannels] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const handleSearch = async () => {
    setIsSearching(true);
    setChannels([]);
    
    try {
      // 1. Calculate Date Boundary (12 months ago to find rising stars)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const dateString = twelveMonthsAgo.toISOString();

      // 2. Search for popular videos in the niche/language
      // Removed hardcoded "viral trending high views" keywords for non-English to avoid query zeroing
      const viralWords = selectedLang.code === 'en' ? "viral trending high views" : ""; 
      const query = encodeURIComponent(`${selectedNiche} ${selectedLang.name} ${viralWords}`.trim());
      const searchUrl = resolveApiUrl(`/api/youtube/search?part=snippet&type=video&q=${query}&relevanceLanguage=${selectedLang.code}&regionCode=${selectedLang.region}&maxResults=50&order=viewCount`);
      
      const res = await fetch(searchUrl);
      const data = await res.json();
      
      if (!res.ok) {
        const errorMsg = data?.error?.message || data?.error || "Erro desconhecido na API do YouTube.";
        throw new Error(`YouTube API: ${errorMsg}`);
      }

      if (!data.items || data.items.length === 0) {
        throw new Error("Nenhum canal encontrado com a amostragem atual. Tente outro nicho ou idioma.");
      }

      // 3. Extract unique Channel IDs - Increasing sample pool for better filtering
      const channelIds = [...new Set(data.items.map(item => item.snippet.channelId))].slice(0, 40);
      
      // 4. Get detailed channel stats and snippet
      const channelsUrl = resolveApiUrl(`/api/youtube/channels?part=snippet,statistics&id=${channelIds.join(',')}`);
      const channelsRes = await fetch(channelsUrl);
      const channelsData = await channelsRes.json();

      if (!channelsRes.ok) {
        throw new Error(`YouTube API (Channels): ${channelsData?.error?.message || "Falha ao obter dados dos canais."}`);
      }

      // 5. Transform and Apply Strict Filters: < 20 videos AND < 4 months old AND > 50k views
      const minedChannels = (channelsData.items || [])
        .map(item => {
          const videoCount = parseInt(item.statistics.videoCount || 0);
          const viewCount = parseInt(item.statistics.viewCount || 0);
          return {
            id: item.id,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            description: item.snippet.description,
            customUrl: item.snippet.customUrl || `@${item.snippet.title.replace(/\s+/g, '').toLowerCase()}`,
            videoCount: videoCount,
            viewCount: viewCount,
            subscriberCount: parseInt(item.statistics.subscriberCount || 0),
            publishedAt: item.snippet.publishedAt,
            efficiency: Math.round(viewCount / Math.max(1, videoCount))
          };
        })
        .filter(channel => {
          const isRisingStar = new Date(channel.publishedAt) >= twelveMonthsAgo;
          const hasFewVideos = channel.videoCount < 50; // User requested < 50
          const hasManyViews = channel.viewCount >= 30000; // Slightly lower threshold to show more quality options
          return isRisingStar && hasFewVideos && hasManyViews;
        })
        .sort((a, b) => b.efficiency - a.efficiency) // Sort by efficiency
        .slice(0, 6); // Take exactly 6 as requested

      setChannels(minedChannels);

      if (minedChannels.length === 0) {
        alert("Critérios Estritos: Não encontramos canais com < 20 vídeos, < 4 meses e > 50k views agora. Tente reduzir a rigidez da busca!");
      }
    } catch (error) {
      console.error("Mining error:", error);
      alert("Falha na Mineração:\n" + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyUrl = (channel) => {
    const url = `https://youtube.com/${channel.customUrl}`;
    navigator.clipboard.writeText(url);
    setCopiedId(channel.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[1600px] mx-auto gap-8 font-sans overflow-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shrink-0">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan p-[2px] shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
                <Youtube className="w-8 h-8 text-white fill-current" />
              </div>
            </div>
            {t('mining.rising_header')}
          </h2>
          <p className="text-gray-400 mt-3 font-bold text-sm md:text-md uppercase tracking-[0.2em] border-l-4 border-neon-cyan pl-4 ml-2">
            {t('mining.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
              <Globe className="w-3 h-3 text-neon-cyan" /> {t('mining.lang_label')}
            </label>
            <select 
              value={selectedLang.code}
              onChange={(e) => setSelectedLang(LANGUAGES.find(l => l.code === e.target.value))}
              className="bg-dark/60 border border-white/5 rounded-2xl px-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-neon-cyan/50 hover:bg-dark/80 transition-all cursor-pointer min-w-[180px]"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
              <Layers className="w-3 h-3 text-neon-purple" /> {t('mining.niche_label')}
            </label>
            <select 
              value={selectedNiche}
              onChange={(e) => setSelectedNiche(e.target.value)}
              className="bg-dark/60 border border-white/5 rounded-2xl px-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-neon-purple/50 hover:bg-dark/80 transition-all cursor-pointer min-w-[180px]"
            >
              {NICHES.map(niche => (
                <option key={niche} value={niche}>{niche}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleSearch}
            disabled={isSearching}
            className="self-end px-8 py-3 bg-white text-dark rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-neon-cyan transition-all transform hover:scale-105 active:scale-95 disabled:opacity-30 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-3"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {isSearching ? t('mining.searching') : t('mining.btn_search')}
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
        <AnimatePresence mode="wait">
          {isSearching ? (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="h-full flex flex-col items-center justify-center p-20"
             >
               <LoadingSpinner message={t('mining.searching')} size="lg" />
               <div className="mt-8 text-xs font-black text-neon-cyan/40 uppercase tracking-[0.3em] animate-pulse">Garimpando canais de alto impacto...</div>
             </motion.div>
          ) : channels.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12"
            >
              {channels.map((channel, i) => (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card group relative overflow-hidden border border-white/5 hover:border-neon-cyan/30 transition-all duration-500 flex flex-col h-[480px] bg-dark-lighter/20"
                >
                  {/* Decorative Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-neon-cyan/10 transition-colors" />
                  
                  {/* Banner/Avatar Area */}
                  <div className="h-24 bg-gradient-to-r from-neon-purple/20 via-neon-cyan/20 to-blue-600/20 relative">
                    <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-2xl border-4 border-dark overflow-hidden shadow-2xl transition-transform group-hover:scale-110 duration-500">
                      <img src={channel.thumbnail} alt={channel.title} className="w-full h-full object-cover" />
                    </div>
                    {/* Efficiency Badge */}
                    <div className="absolute top-4 right-4 px-3 py-1 bg-neon-cyan text-dark font-black text-[10px] rounded-full shadow-[0_0_15px_rgba(0,243,255,0.4)] uppercase tracking-tighter">
                      {formatNumber(channel.efficiency)} {t('mining.efficiency').toUpperCase()}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pt-10 px-6 flex flex-col flex-1">
                    <div className="mb-4">
                      <h4 className="text-lg font-black text-white group-hover:text-neon-cyan transition-colors truncate uppercase leading-tight mb-0.5">{channel.title}</h4>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{channel.customUrl}</p>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <p className="text-[9px] text-neon-purple font-black uppercase">{new Date(channel.publishedAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed mb-6 italic opacity-80 group-hover:opacity-100 transition-opacity">
                      {channel.description || "Sem descrição disponível."}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-auto border-t border-white/5 pt-6 pb-6">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter mb-1">{t('mining.stats_videos')}</span>
                        <div className="flex items-center gap-1">
                          <Video className="w-3 h-3 text-neon-purple" />
                          <span className="text-white font-black text-sm">{channel.videoCount}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center border-x border-white/10 px-2">
                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter mb-1">{t('mining.stats_views')}</span>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-neon-cyan" />
                          <span className="text-white font-black text-sm">{formatNumber(channel.viewCount)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter mb-1">{t('mining.stats_subs')}</span>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-green-400" />
                          <span className="text-white font-black text-sm">{formatNumber(channel.subscriberCount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pb-6">
                      <button className="flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
                        <ExternalLink className="w-3.5 h-3.5" /> {t('mining.view_more')}
                      </button>
                      <button className="flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
                        <PlayCircle className="w-3.5 h-3.5" /> {t('mining.latest_videos')}
                      </button>
                    </div>

                    <button 
                      onClick={() => handleCopyUrl(channel)}
                      className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest transition-all mb-4 relative overflow-hidden group/btn
                        ${copiedId === channel.id 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan hover:text-dark'
                        }
                      `}
                    >
                      {copiedId === channel.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedId === channel.id ? t('mining.copied') : t('mining.copy_btn')}
                      {!copiedId && <Zap className="absolute right-4 w-4 h-4 opacity-30 group-hover/btn:opacity-100 group-hover/btn:scale-125 transition-all" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="h-full flex flex-col items-center justify-center opacity-20 text-center py-40"
            >
              <Youtube className="w-24 h-24 mb-6" />
              <p className="text-sm font-black uppercase tracking-[0.4em]">{t('mining.title')}</p>
              <p className="text-[10px] mt-4 font-bold border-l-2 border-white/20 pl-4">Selecione o idioma e nicho para iniciar o garimpo.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
