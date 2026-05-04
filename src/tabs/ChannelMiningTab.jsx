import React, { useState, useEffect } from 'react';
import { 
  Youtube, 
  Search, 
  Loader2, 
  Globe, 
  TrendingUp, 
  Video, 
  Users, 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  Layers, 
  PlayCircle,
  X,
  Sparkles,
  Brain,
  History,
  ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { t } from '../utils/i18n';
import { resolveApiUrl, buildYouTubeUrl } from '../utils/apiUtils';
import { usePersistence } from '../contexts/PersistenceContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { callAI } from '../utils/aiUtils';

const NICHES = [
  "Finanças", "História", "Mistérios", "Crimes Reais", "Espiritualidade", 
  "Motivação", "Saúde", "Tecnologia", "Curiosidades", "Documentários",
  "Gameplay", "Culinária", "Viagens", "Pets", "Moda", "Educação"
];

const NICHE_TRANSLATIONS = {
  "Finanças": { pt: "Finanças", en: "Finance", es: "Finanzas", fr: "Finances", de: "Finanzen", it: "Finanza", hi: "वित", ja: "金融" },
  "História": { pt: "História", en: "History", es: "Historia", fr: "Histoire", de: "Geschichte", it: "Storia", hi: "इतिहास", ja: "歴史" },
  "Mistérios": { pt: "Mistérios", en: "Mysteries", es: "Misterios", fr: "Mystères", de: "Mysterien", it: "Misteri", hi: "रहस्य", ja: "ミステリー" },
  "Crimes Reais": { pt: "Crimes Reais", en: "True Crime", es: "Crímenes Reales", fr: "Crimes réels", de: "Wahre Verbrechen", it: "Veri Crimini", hi: "वास्तविक अपराध", ja: "実録犯罪" },
  "Espiritualidade": { pt: "Espiritualidade", en: "Spirituality", es: "Espiritualidad", fr: "Spiritualité", de: "Spiritualität", it: "Spiritualità", hi: "आध्यात्मिकता", ja: "スパイチュリティ" },
  "Motivação": { pt: "Motivação", en: "Motivation", es: "Motivación", fr: "Motivation", de: "Motivation", it: "Motivazione", hi: "प्रेरणा", ja: "モチベーション" },
  "Saúde": { pt: "Saúde", en: "Health", es: "Salud", fr: "Santé", de: "Gesundheit", it: "Salute", hi: "स्वास्थ्य", ja: "健康" },
  "Tecnologia": { pt: "Tecnologia", en: "Technology", es: "Tecnología", fr: "Technologie", de: "Technologie", it: "Tecnologia", hi: "तकनीक", ja: "テクノロジー" },
  "Curiosidades": { pt: "Curiosidades", en: "Curiosities", es: "Curiosidades", fr: "Curiosités", de: "Kuriositäten", it: "Curiosità", hi: "जिज्ञासा", ja: "好奇心" },
  "Documentários": { pt: "Documentários", en: "Documentaries", es: "Documentales", fr: "Documentaires", de: "Dokumentarfilme", it: "Documentari", hi: "वृत्तचित्र", ja: "ドキュメンタリー" },
  "Gameplay": { pt: "Gameplay", en: "Gameplay", es: "Gameplay", fr: "Gameplay", de: "Gameplay", it: "Gameplay", hi: "गेमप्ले", ja: "ゲームプレイ" },
  "Culinária": { pt: "Culinária", en: "Cooking", es: "Cocina", fr: "Cuisine", de: "Kochen", it: "Cucina", hi: "पाक कला", ja: "料理" },
  "Viagens": { pt: "Viagens", en: "Travel", es: "Viajes", fr: "Voyage", de: "Reisen", it: "Viaggi", hi: "यात्रा", ja: "旅行" },
  "Pets": { pt: "Pets", en: "Pets", es: "Mascotas", fr: "Animaux", de: "Haustiere", it: "Animali", hi: "पालतू जानवर", ja: "ペット" },
  "Moda": { pt: "Moda", en: "Fashion", es: "Moda", fr: "Mode", de: "Mode", it: "Moda", hi: "फैशन", ja: "ファッション" },
  "Educação": { pt: "Educação", en: "Education", es: "Educación", fr: "Éducation", de: "Bildung", it: "Educazione", hi: "शिक्षा", ja: "教育" }
};

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

const AGE_OPTIONS = [
  { label: "Qualquer Idade", value: 0 },
  { label: "Menos de 1 Mês", value: 1 },
  { label: "Menos de 3 Meses", value: 3 },
  { label: "Menos de 5 Meses", value: 5 },
  { label: "Menos de 1 Ano", value: 12 }
];

export const ChannelMiningTab = ({ setActiveTab }) => {
  const { configs } = useSystemStatus();
  const { miningState, setMiningState } = usePersistence();
  const { channels, niche: selectedNiche, isSearching, maxAgeMonths = 0 } = miningState;

  const setSelectedNiche = (val) => setMiningState(prev => ({ ...prev, niche: val }));
  const setChannels = (val) => setMiningState(prev => ({ ...prev, channels: val }));
  const setIsSearching = (val) => setMiningState(prev => ({ ...prev, isSearching: val }));
  const setMaxAgeMonths = (val) => setMiningState(prev => ({ ...prev, maxAgeMonths: val }));

  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [copiedId, setCopiedId] = useState(null);
  
  // Title Generation States
  const [showTitleGenerator, setShowTitleGenerator] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [generatedResults, setGeneratedResults] = useState(null);
  const [generationStep, setGenerationStep] = useState('');
  const [knowledge, setKnowledge] = useState(() => {
    try {
      const saved = localStorage.getItem('guru_title_knowledge');
      const parsed = saved ? JSON.parse(saved) : { themes: [], structures: [], count: 0 };
      return {
        themes: Array.isArray(parsed.themes) ? parsed.themes : [],
        structures: Array.isArray(parsed.structures) ? parsed.structures : [],
        count: typeof parsed.count === 'number' ? parsed.count : 0
      };
    } catch {
      return { themes: [], structures: [], count: 0 };
    }
  });

  const saveKnowledge = (newKnowledge) => {
    setKnowledge(newKnowledge);
    localStorage.setItem('guru_title_knowledge', JSON.stringify(newKnowledge));
  };

  // Helper: lança erro legível quando a API do YouTube retorna um erro
  const checkYouTubeError = (data, context = '') => {
    if (data?.error) {
      const msg = data.error.message || 'Erro desconhecido';
      const code = data.error.code || data.error.status || '';
      if (code === 401 || msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('invalid')) {
        throw new Error('Chave do YouTube inválida ou não configurada. Acesse Configurações → Suas Chaves Pessoais.');
      }
      if (code === 403 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exceeded')) {
        throw new Error('Cota do YouTube esgotada. Aguarde até amanhã ou use outra chave.');
      }
      if (code === 400 || msg.toLowerCase().includes('keyinvalid') || msg.toLowerCase().includes('bad request')) {
        throw new Error('Chave do YouTube inválida. Configure em Configurações → Suas Chaves Pessoais.');
      }
      throw new Error(`YouTube API${context ? ` (${context})` : ''}: ${msg}`);
    }
  };

  const handleSearch = async () => {
    // Check Cache
    const cacheKey = `mining_${selectedNiche}_${selectedLang.code}_${maxAgeMonths}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 1 * 60 * 60 * 1000) { // 1 hour cache
          console.log("Using cached mining data");
          setChannels(parsed.data.slice(0, 6));
          return;
        }
      } catch (e) {}
    }

    setIsSearching(true);
    setChannels([]);
    
    try {
      // 1. Resolve Niche Search Term
      const langCode = selectedLang.code;
      const nicheTerm = (NICHE_TRANSLATIONS[selectedNiche] && NICHE_TRANSLATIONS[selectedNiche][langCode]) 
                        ? NICHE_TRANSLATIONS[selectedNiche][langCode] 
                        : selectedNiche;

      // 2. Construct Search Query
      // Remove encodeURIComponent since URLSearchParams in buildYouTubeUrl handles it.
      // We look for highly viewed videos published recently to find small channels getting traction.
      const date = new Date();
      date.setDate(date.getDate() - 30);
      const publishedAfter = date.toISOString();

      const query = nicheTerm; // Clean query without forced English words
      const res = await fetch(buildYouTubeUrl('search', {
        part: 'snippet',
        type: 'video',
        q: query,
        relevanceLanguage: langCode,
        regionCode: selectedLang.region,
        maxResults: '50',
        order: 'viewCount',
        publishedAfter: publishedAfter
      }));
      const data = await res.json();
      
      // Verifica erro da API antes de acessar .items
      checkYouTubeError(data, 'search');

      if (!data.items || data.items.length === 0) {
        throw new Error("Nenhum canal encontrado com a amostragem atual. Tente outro nicho ou idioma.");
      }

      // 3. Extract unique Channel IDs
      const channelIds = [...new Set(data.items.map(item => item.snippet.channelId))].slice(0, 40);
      
      // 4. Get detailed channel stats
      const channelsRes = await fetch(buildYouTubeUrl('channels', { part: 'snippet,statistics', id: channelIds.join(',') }));
      const channelsData = await channelsRes.json();

      // Verifica erro antes de acessar .items
      checkYouTubeError(channelsData, 'channels');

      // 5. Transform and filter for SMALL CHANNELS with HIGH PERFORMANCE
      const minedChannels = (channelsData.items || [])
        .map(item => {
          const videoCount = parseInt(item.statistics.videoCount || 0);
          const viewCount = parseInt(item.statistics.viewCount || 0);
          const efficiency = Math.round(viewCount / Math.max(1, videoCount));
          
          const publishedAtDate = new Date(item.snippet.publishedAt);
          const now = new Date();
          const ageInMonths = (now.getFullYear() - publishedAtDate.getFullYear()) * 12 + now.getMonth() - publishedAtDate.getMonth();

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
            ageInMonths: ageInMonths,
            efficiency: efficiency,
            isExplosive: efficiency > 50000
          };
        })
        .filter(channel => {
          if (channel.viewCount < 5000 || channel.subscriberCount >= 150000 || channel.subscriberCount <= 0) return false;
          if (maxAgeMonths > 0 && channel.ageInMonths > maxAgeMonths) return false;
          return true;
        })
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, 6); // Exactly 6 cards

      setChannels(minedChannels);
      
      // Save to Cache
      sessionStorage.setItem(`mining_${selectedNiche}_${selectedLang.code}_${maxAgeMonths}`, JSON.stringify({
        timestamp: Date.now(),
        data: minedChannels
      }));

      if (minedChannels.length === 0) {
        alert(maxAgeMonths > 0 
          ? `Nenhum canal bombando com menos de ${maxAgeMonths} meses foi encontrado neste nicho agora. Tente remover o filtro de Idade ou mudar o Nicho.` 
          : "Não encontramos canais com os critérios atuais para este nicho. Tente outro tema ou idioma!");
      }
    } catch (error) {
      console.error("Mining error:", error);
      alert("Falha na Mineração:\n" + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleModelChannel = (channel) => {
    const url = `https://youtube.com/${channel.customUrl || 'channel/' + channel.id}`;
    localStorage.setItem('guru_auto_model_channel', url);
    setActiveTab('channel-modeler');
  };

  const handleGenerateViralTitles = async (channel) => {
    setSelectedChannel(channel);
    setShowTitleGenerator(true);
    setIsGeneratingTitles(true);
    setGeneratedResults(null);
    setGenerationStep('Buscando vídeos de alta performance...');

    try {
      // 1. Fetch Top 15 Videos for the channel
      const vidsRes = await fetch(buildYouTubeUrl('search', { part: 'snippet', channelId: channel.id, order: 'viewCount', type: 'video', maxResults: '15' }));
      const vidsData = await vidsRes.json();

      // Verifica erro da API antes de acessar .items
      checkYouTubeError(vidsData, 'videos do canal');
      
      const titles = (vidsData.items || []).map(v => v.snippet.title);
      if (titles.length === 0) throw new Error("Nenhum vídeo encontrado para analisar.");

      setGenerationStep('Analisando DNA do canal e padrões vencedores...');

      // 2. Logic: Analyze Theme and Structure with Gemini
      const analysisPrompt = `
        Analise os seguintes títulos de vídeos de sucesso do canal "${channel.title}":
        ${titles.map((t, i) => `${i+1}. ${t}`).join('\n')}

        Com base nesses títulos e no seu conhecimento prévio sobre o que torna um canal viral:
        1. Identifique o TEMA PRINCIPAL que mais desenvolve o canal (o que o público realmente quer ver aqui).
        2. Identifique 3 ESTRUTURAS VENCEDORAS de títulos (ex: "Pergunta Curiosa", "Desafio Impossível", "Lista de Segredos").
        3. Com base nessas estruturas, mas VARIANDO para não repetir, crie 5 NOVOS TÍTULOS VIRAIS que esse canal poderia postar hoje.

        Responda EXCLUSIVAMENTE em formato JSON puro, sem markdown, com a seguinte estrutura:
        {
          "mainTheme": "Descrição curta do tema",
          "structures": ["Estrutura 1", "Estrutura 2", "Estrutura 3"],
          "newTitles": ["Título 1", "Título 2", "Título 3", "Título 4", "Título 5"]
        }
        Previous Knowledge context: ${JSON.stringify(knowledge.structures.slice(-5))}
      `;

      const response = await callAI(analysisPrompt, { model: 'gemini-1.5-pro', gptKey: configs.gpt_key });
      const cleanJson = response.replace(/```json|```/g, '').trim();
      const results = JSON.parse(cleanJson);

      // 3. Store Knowledge
      const updatedKnowledge = {
        themes: [...new Set([...(knowledge.themes || []), results.mainTheme])].slice(-20),
        structures: [...new Set([...(knowledge.structures || []), ...(results.structures || [])])].slice(-30),
        count: (knowledge.count || 0) + 1
      };
      saveKnowledge(updatedKnowledge);

      setGeneratedResults(results);
      setGenerationStep('Concluído!');
    } catch (error) {
      console.error("Title Generation Error:", error);
      alert("Falha na Geração de Títulos:\n" + error.message);
    } finally {
      setIsGeneratingTitles(false);
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
    <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto font-sans overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-6 pb-12 pt-4">
        <header className="mb-4 shrink-0">
          <h2 className="text-3xl md:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan p-[2px] shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
                <Youtube className="w-8 h-8 text-white fill-current" />
              </div>
            </div>
            {t('mining.rising_header') || 'Mineração de Canais'}
          </h2>
          <p className="text-gray-400 mt-3 font-bold text-sm uppercase tracking-[0.2em] border-l-4 border-neon-cyan pl-4 ml-2 italic">
            {t('mining.subtitle') || 'Detectando Rising Stars e Oportunidades Explosivas'}
          </p>
        </header>

        {/* Filters Box */}
        <div className="glass-card p-8 border border-neon-cyan/20 relative overflow-hidden group shrink-0 shadow-[0_0_50px_rgba(0,243,255,0.05)] mb-4">
          <div className="absolute top-0 right-0 w-96 h-96 bg-neon-cyan/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-neon-cyan/10 transition-colors" />
          <div className="flex flex-col md:flex-row gap-6 relative z-10 items-end w-full">
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-neon-cyan" /> {t('mining.lang_label')}
              </label>
              <select 
                value={selectedLang.code}
                onChange={(e) => setSelectedLang(LANGUAGES.find(l => l.code === e.target.value))}
                className="bg-dark/60 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold text-sm focus:outline-none focus:border-neon-cyan/50 hover:bg-dark/80 transition-all cursor-pointer w-full shadow-inner"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-neon-purple" /> {t('mining.niche_label')}
              </label>
              <select 
                value={selectedNiche}
                onChange={(e) => setSelectedNiche(e.target.value)}
                className="bg-dark/60 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold text-sm focus:outline-none focus:border-neon-purple/50 hover:bg-dark/80 transition-all cursor-pointer w-full shadow-inner"
              >
                {NICHES.map(niche => (
                  <option key={niche} value={niche}>{niche}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                <History className="w-4 h-4 text-neon-pink" /> Idade do Canal
              </label>
              <select 
                value={maxAgeMonths}
                onChange={(e) => setMaxAgeMonths(Number(e.target.value))}
                className="bg-dark/60 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold text-sm focus:outline-none focus:border-neon-pink/50 hover:bg-dark/80 transition-all cursor-pointer w-full shadow-inner"
              >
                {AGE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleSearch}
              disabled={isSearching}
              className="flex-shrink-0 md:w-auto w-full px-10 py-4 h-[54px] bg-gradient-to-r from-neon-purple to-neon-cyan text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(0,243,255,0.6)] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> {t('mining.btn_search')}</>}
            </button>
          </div>
        </div>

        <div className="flex flex-col w-full">
          <AnimatePresence mode="wait">
          {isSearching ? (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="h-full flex flex-col items-center justify-center p-20"
             >
               <LoadingSpinner size="lg" />
             </motion.div>
          ) : channels.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12"
            >
              {(Array.isArray(channels) ? [...channels.slice(0, 6), ...Array(Math.max(0, 6 - channels.slice(0, 6).length)).fill(null)] : Array(6).fill(null)).map((channel, i) => (
                channel ? (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleModelChannel(channel)}
                  className="glass-card group relative overflow-hidden border border-white/5 hover:border-neon-cyan/50 hover:shadow-[0_0_30px_rgba(0,243,255,0.2)] transition-all duration-300 flex flex-col h-[480px] bg-dark-lighter/40 cursor-pointer hover:-translate-y-1"
                >
                  {/* Decorative Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-neon-cyan/20 transition-colors" />
                  
                  {/* Banner/Avatar Area */}
                  <div className="h-24 bg-gradient-to-r from-neon-purple/20 via-neon-cyan/20 to-blue-600/20 relative">
                    <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-2xl border-4 border-dark overflow-hidden shadow-2xl transition-transform group-hover:scale-110 duration-500">
                      <img src={channel.thumbnail} alt={channel.title} className="w-full h-full object-cover" />
                    </div>
                    {/* Efficiency & Rising Badge */}
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                      {channel.isExplosive && (
                        <div className="px-3 py-1 bg-neon-pink text-white font-black text-[9px] rounded-full shadow-[0_0_15px_rgba(255,0,110,0.5)] uppercase tracking-tighter flex items-center gap-1 animate-bounce">
                          <Zap className="w-2.5 h-2.5 fill-current" /> {t('mining.explosive_growth')}
                        </div>
                      )}
                      <div className="px-3 py-1 bg-neon-cyan text-dark font-black text-[10px] rounded-full shadow-[0_0_15px_rgba(0,243,255,0.4)] uppercase tracking-tighter">
                        {formatNumber(channel.efficiency)} {t('mining.efficiency').toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pt-10 px-6 flex flex-col flex-1 relative z-10">
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
                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter mb-1">{t('mining.avg_views')}</span>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-neon-cyan" />
                          <span className="text-white font-black text-sm">{formatNumber(channel.efficiency)}</span>
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
                    <div className="pb-6">
                      <div className="flex items-center justify-center gap-2 py-3 bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl text-xs font-black text-neon-cyan uppercase tracking-widest group-hover:bg-neon-cyan group-hover:text-dark transition-all shadow-lg group-hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]">
                        <Brain className="w-4 h-4" /> Modelar Este Canal
                      </div>
                    </div>
                  </div>
                </motion.div>
                ) : (
                  <div key={`empty-${i}`} className="border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center opacity-30 h-[480px]">
                    <Youtube className="w-10 h-10 text-gray-700 mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-700 mb-1">Slot Disponível</p>
                    <p className="text-[10px] text-gray-800">Procurando canais explosivos...</p>
                  </div>
                )
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

      {/* Title Generator Modal */}
      <AnimatePresence>
        {showTitleGenerator && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-dark/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl max-h-full bg-dark/90 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan p-[2px] shadow-lg">
                      <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-white animate-pulse" />
                      </div>
                   </div>
                   <div>
                     <h3 className="text-2xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                       Agente de Títulos Virais
                     </h3>
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Analisando: {selectedChannel?.title}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowTitleGenerator(false)}
                  className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-all group"
                >
                  <X className="w-6 h-6 text-gray-500 group-hover:text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {isGeneratingTitles ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-8">
                    <div className="relative">
                      <div className="absolute inset-0 bg-neon-cyan/20 blur-[50px] animate-pulse rounded-full" />
                      <LoadingSpinner size="lg" message="" />
                    </div>
                    <div className="text-center space-y-3">
                       <div className="flex justify-center gap-1">
                          {[1,2,3].map(i => <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: i*0.2 }} className="w-1.5 h-1.5 bg-neon-cyan rounded-full" />)}
                       </div>
                    </div>
                  </div>
                ) : generatedResults ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left: Agent Insight */}
                    <div className="space-y-8">
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                        <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                          <Brain className="w-6 h-6 text-neon-purple" />
                          <h4 className="text-xs font-black text-white uppercase tracking-widest">Mental Model do Agente</h4>
                        </div>
                        
                        <div className="space-y-6">
                          <div>
                            <p className="text-[9px] font-black text-neon-purple uppercase tracking-widest mb-2 flex items-center gap-2">
                              <Zap className="w-3 h-3 fill-current" /> Tema Central Identificado
                            </p>
                            <p className="text-sm font-bold text-gray-300 italic pl-3 border-l-2 border-neon-purple">
                              "{generatedResults.mainTheme}"
                            </p>
                          </div>

                          <div>
                            <p className="text-[9px] font-black text-neon-cyan uppercase tracking-widest mb-3 flex items-center gap-2">
                              <TrendingUp className="w-3 h-3" /> Estruturas Vencedoras do Canal
                            </p>
                            <div className="space-y-2">
                              {generatedResults.structures.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-xl border border-white/5 text-[11px] font-bold text-gray-400">
                                  <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(0,243,255,0.5)]" />
                                  {s}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <History className="w-3 h-3 text-gray-600" />
                               <span className="text-[9px] font-black text-gray-600 uppercase">Conhecimento Acumulado:</span>
                            </div>
                            <span className="text-[10px] font-mono text-neon-cyan font-black">{knowledge.structures.length} padrões</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: New Titles */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <ListChecks className="w-5 h-5 text-green-400" />
                           <h4 className="text-xs font-black text-white uppercase tracking-widest">Títulos Variados Sugeridos</h4>
                         </div>
                      </div>

                      <div className="space-y-4">
                        {generatedResults.newTitles.map((title, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.08] hover:border-green-500/30 transition-all cursor-pointer relative overflow-hidden"
                            onClick={() => {
                              navigator.clipboard.writeText(title);
                              alert("Título copiado!");
                            }}
                          >
                             <div className="absolute top-0 right-0 w-12 h-12 bg-green-500/5 rounded-full blur-xl group-hover:bg-green-500/10 transition-all" />
                             <div className="flex gap-4">
                               <span className="text-green-500 font-mono text-xs opacity-50">#{idx + 1}</span>
                               <p className="text-sm font-bold text-white leading-relaxed">{title}</p>
                             </div>
                             <div className="mt-4 flex items-center justify-end">
                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest group-hover:text-green-500 transition-colors uppercase">Clique para copiar DNA Estrutural</span>
                             </div>
                          </motion.div>
                        ))}
                      </div>

                      <button 
                        onClick={() => handleGenerateViralTitles(selectedChannel)}
                        className="w-full py-4 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                      >
                        <Sparkles className="w-4 h-4" /> Gerar Outra Variação
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
