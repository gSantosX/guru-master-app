import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Search, 
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
  Brain,
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { callAI } from '../utils/aiUtils';
import { resolveApiUrl } from '../utils/apiUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useCloudStorage } from '../hooks/useCloudStorage';
import { usePersistence } from '../contexts/PersistenceContext';

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

function getInstantNiche(topic, language) {
  const baseTopic = topic ? topic.trim() : "Mistérios da História Oculta";
  
  const keywords = baseTopic.toLowerCase();
  let categoryMultiplier = 1.5;
  let nicheName = `Canal de ${baseTopic}`;
  
  if (keywords.includes("curiosidade") || keywords.includes("fato") || keywords.includes("mistério") || keywords.includes("história")) {
    nicheName = `Curiosidades & Fatos Macabros Inexplorados`;
    categoryMultiplier = 1.3;
  } else if (keywords.includes("finança") || keywords.includes("dinheiro") || keywords.includes("cripto") || keywords.includes("invest")) {
    nicheName = `Finanças Pessoais e Segredos de Micro-Investimentos`;
    categoryMultiplier = 2.4;
  } else if (keywords.includes("saúde") || keywords.includes("corpo") || keywords.includes("mente") || keywords.includes("medita")) {
    nicheName = `Biohacking Mental e Rotinas de Sono Profundo`;
    categoryMultiplier = 1.8;
  } else {
    nicheName = `Mistérios do Infra-Nicho de ${baseTopic}`;
    categoryMultiplier = 1.6;
  }

  return {
    nicheName: nicheName,
    viralPotential: 9,
    saturationScore: 3,
    productionDifficulty: 2,
    categoryMultiplier: categoryMultiplier,
    trendMomentum: "Nascente (Oceano Azul)",
    strategyDescription: `Criação automatizada de vídeos em formato de mini-documentários ou fatos rápidos focados no sub-tema de ${baseTopic}. A produção será baseada em roteirização por IA, vozes cinemáticas e cortes dinâmicos de imagens de arquivo e animações rápidas.`,
    gapAnalysis: `A maioria dos canais concorrentes foca em abordagens genéricas e superficiais. O gap tático aqui é explorar sub-tópicos hiper-específicos com forte apelo de curiosidade mórbida ou ganho financeiro prático imediato, utilizando loops abertos nos primeiros 5 segundos.`,
    channelArchetype: "Mini-Documentários Rápidos de 5-7 min",
    monetizationStrategy: `Parceria com plataformas de info-produtos (Clickbank/Hotmart) vendendo e-books e guias especializados ocultos no primeiro comentário fixado, além de patrocínios de ferramentas do nicho.`,
    toolsRequired: ["ElevenLabs (Voz ultra-realista)", "Midjourney (Imagens cinematográficas)", "CapCut (Edição dinâmica)"],
    targetAudience: "Jovens e adultos obcecados por mistérios ou auto-aperfeiçoamento, que adoram consumir conteúdo rápido de alta qualidade visual.",
    channelNames: [`Segredos de ${baseTopic}`, `${baseTopic} Sem Filtros`, `O Efeito ${baseTopic}`],
    videoThemes: [
      `A Verdade Oculta que Ninguém te Conta sobre ${baseTopic}`,
      `Como o algoritmo escondeu este segredo de ${baseTopic}`,
      `3 Coisas que você deveria saber sobre ${baseTopic} antes de ser tarde`
    ],
    titleStructures: [
      `O Lado Sombrio de ${baseTopic} que a Mídia Esconde`,
      `Por Que 99% das Pessoas Falham em ${baseTopic} (E Como Evitar)`,
      `O Segredo de 3 Mil Anos sobre ${baseTopic} Revelado`
    ],
    thumbnailIdeas: [
      `Imagem com contraste absurdo mostrando um elemento oculto e uma seta vermelha apontando de leve`,
      `Rosto expressivo gerado por IA com expressão de espanto com fundo escuro e texto gigante neon`
    ],
    thumbnailStyle: {
      primaryColor: "#a855f7",
      secondaryColor: "#06b6d4",
      mood: "Cinematográfico Misterioso",
      keyElement: "Contraste e Texturas Escuras"
    },
    competitors: [
      { name: "Canal Alpha", strength: "Edição rápida", weakness: "Falta de profundidade nos ganchos emocionais" },
      { name: "Canal Beta", strength: "Miniaturas chamativas", weakness: "Vozes robóticas genéricas de baixa qualidade" }
    ],
    isRefinement: true
  };
}

function getInstantStrategy(nicheName) {
  return `**1. DIAGNÓSTICO DO NICHO**
Este nicho de "${nicheName}" baseia-se na forte psicologia da curiosidade e na busca por respostas rápidas. Ele vende o sentimento de exclusividade e acesso a informações secretas ou facilitadas que poucas pessoas dominam.

**2. FÓRMULA DE SUCESSO**
- **Gancho Inicial Inabalável:** Primeiros 5 segundos com uma pergunta retórica provocativa ou uma revelação chocante.
- **Roteiro em Loops de Curiosidade:** Abrir um loop de história e só fechar no final do vídeo para manter a retenção acima de 60%.
- **Design de Som Imersivo:** Efeitos sonoros sutis (woosh, risers) a cada mudança de cena (que deve ocorrer a cada 3 segundos).

**3. VOZ DA AUDIÊNCIA (O QUE ELES BUSCAM)**
- Querem respostas práticas e rápidas, sem enrolação inicial.
- Buscam conexão emocional (medo de perder algo ou desejo extremo de ganho).
- Sentem falta de narradores com tom de voz confiável e imagens que ilustrem exatamente o que está sendo dito.

**4. LACUNA DE OPORTUNIDADE**
Os canais atuais utilizam banco de imagens genérico e vozes do Azure/Google Cloud saturadas. Criar uma voz polida (ElevenLabs) focada em contar histórias exclusivas (storytelling) em vez de fatos soltos criará um monopólio de audiência imediato.

**5. DICA DE OURO REPLICÁVEL**
Insira um comentário fixado com um link de afiliado ultra segmentado. Por exemplo: se o vídeo fala de produtividade, promova um template notion ou e-book de R$ 27 nos primeiros 10 segundos com uma chamada de ação ("Veja o segredo no comentário fixado").

**6. ARMADILHA A EVITAR**
Fazer introduções longas com vinhetas ou pedir curtidas nos primeiros 2 minutos. Isso destrói a retenção do YouTube de imediato e impede que o algoritmo recomende seu vídeo.`;
}

function getInstantNicheTitles(nicheName, lang) {
  return `1. O Lado Oculto de ${nicheName} que Poucos Conhecem
2. O Erro que 97% das Pessoas Cometem ao Tentar Entender ${nicheName}
3. Por que Você Deve Começar a Prestar Atenção em ${nicheName} Agora Mesmo
4. O Segredo Revelado sobre ${nicheName} que Pode Mudar Seu Canal
5. Como os Maiores Canais Dominam o Mercado de ${nicheName}
6. A Verdade Inconveniente que Ninguém te Conta sobre ${nicheName}
7. 3 Estratégias Práticas de ${nicheName} para Aplicar em Segundos
8. O Guia Secreto de ${nicheName} que o Algoritmo Esconde de Você
9. Como Dominei o Mercado de ${nicheName} Usando Apenas Inteligência Artificial
10. O Que Acontece Se Você Ignorar Essa Nova Tendência de ${nicheName}`;
}

const SECTION_METADATA = {
  1: { icon: Brain, color: 'text-neon-purple' },
  2: { icon: TrendingUp, color: 'text-neon-cyan' },
  3: { icon: Users, color: 'text-neon-pink' },
  4: { icon: Sparkles, color: 'text-yellow-400' },
  5: { icon: BarChart2, color: 'text-green-400' },
  6: { icon: AlertTriangle, color: 'text-orange-400' },
};

const parseStrategySections = (text) => {
  if (!text) return [];
  const sections = [];
  const regex = /\*\*(\d)\.\s*(.*?)\*\*/g;
  let match;
  const matches = [];
  
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      num: parseInt(match[1]),
      title: match[2].trim(),
      index: match.index,
      length: match[0].length
    });
  }

  if (matches.length === 0) {
    return [{
      num: 1,
      title: "ANÁLISE COMPLETA",
      content: text
    }];
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = current.index + current.length;
    const end = next ? next.index : text.length;
    const content = text.slice(start, end).trim();
    sections.push({
      num: current.num,
      title: current.title,
      content: content
    });
  }

  return sections;
};

export const NicheIdentifierTab = ({ setActiveTab }) => {
  const { configs, showToast } = useSystemStatus();
  const { setWhiskTrigger } = usePersistence();
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefiningNiche, setIsRefiningNiche] = useState(false);
  const [result, setResult] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);
  const [loadingStep, setLoadingStep] = useState('');

  const [isAnalyzingStrategy, setIsAnalyzingStrategy] = useState(false);
  const [strategyResult, setStrategyResult] = useState(null);
  
  const [isAnalyzingTitles, setIsAnalyzingTitles] = useState(false);
  const [titlesResult, setTitlesResult] = useState(null);
  const [selectedLanguageTitle, setSelectedLanguageTitle] = useState('Português (Brasil)');
  const [copiedTitleIndex, setCopiedTitleIndex] = useState(null);

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
    setStrategyResult(null);
    setTitlesResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const redoSearch = () => {
    handleSearch();
  };

  const transferToAutoFlow = () => {
    if(!result) return;
    const bridgeData = `NICHO GERADO:\n${result.nicheName}\n\nTEMAS IDEAIS:\n${result.videoThemes.join(" | ")}\n\nTÍTULOS IDEAIS:\n${result.titleStructures.join(" | ")}`;
    setWhiskTrigger(bridgeData);
    showToast("Dados enviados para a aba Whisk!", "success");
    setActiveTab('whisk');
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

    // Set instant pre-fill results
    const instantResult = getInstantNiche(topic, language);
    setResult(instantResult);
    setStrategyResult(null);
    setTitlesResult(null);

    setIsSearching(true);
    setIsRefiningNiche(true);
    setLoadingStep('Mergulhando na API do YouTube');

    (async () => {
      try {
        const geminiKey = localStorage.getItem('guru_gemini_key')?.trim();
        const gptKey = localStorage.getItem('guru_gpt_key')?.trim();
        if (!geminiKey) throw new Error("Chave Gemini não configurada!");

        // 1. Live Data Ingestion (YouTube API)
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

        const response = await callAI(prompt, { model: 'gemini-2.5-flash', gptKey });
        const cleanJson = response.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        
        setResult(parsed);
        saveToHistory(parsed, language);
        showToast("IA: Nicho refinado!", "success");
      } catch (error) {
        console.error(error);
        showToast("Falha ao refinar nicho: " + error.message, "error");
      } finally {
        setIsSearching(false);
        setIsRefiningNiche(false);
      }
    })();
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

  // Auto trigger strategy when result is generated
  useEffect(() => {
    if (result && !strategyResult && !isAnalyzingStrategy) {
      runStrategyAnalysis();
    }
  }, [result, strategyResult, isAnalyzingStrategy]);

  const runStrategyAnalysis = async () => {
    if (!result) return;
    setIsAnalyzingStrategy(true);
    
    // Prefill Strategy Report
    const prefillStrategy = getInstantStrategy(result.nicheName);
    setStrategyResult(prefillStrategy);

    (async () => {
      const prompt = `Você é um MENTOR ESTRATÉGICO SÊNIOR de YouTube — especialista em análise de nichos, crescimento orgânico e replicação de estratégias virais em oceanos azuis.

NICHO EM ANÁLISE: "${result.nicheName}"
ESTRUTURA BASE: "${result.strategyDescription}"
GAP IDENTIFICADO (FALHA DA CONCORRÊNCIA): "${result.gapAnalysis}"
MONETIZAÇÃO CAMUFLADA: "${result.monetizationStrategy}"
PÚBLICO ALVO: "${result.targetAudience}"

Sua resposta deve ter EXATAMENTE estas 6 partes EM PORTUGUÊS (PT-BR) — sem introdução, sem conclusão:
**1. DIAGNÓSTICO DO NICHO**
Em 1-2 frases: Qual é o posicionamento real deste nicho? O que ele vende emocionalmente para o público alvo?
**2. FÓRMULA DE SUCESSO**
Identifique 2-3 padrões específicos que farão um canal decolar rapidamente neste espaço.
**3. VOZ DA AUDIÊNCIA (O QUE ELES BUSCAM)**
RESUMA em bullet points o que o público deste nicho tanto deseja consumir e o que sentem falta na concorrência atual.
**4. LACUNA DE OPORTUNIDADE**
Que ângulos a concorrência atual AINDA NÃO explorou de forma correta e que nós podemos dominar?
**5. DICA DE OURO REPLICÁVEL**
Uma estratégia concreta baseada na monetização camuflada e retenção para o usuário aplicar imediatamente.
**6. ARMADILHA A EVITAR**
O erro fatal que os iniciantes neste nicho sempre cometem e que você deve fugir a todo custo.

REGRAS: Use **NEGRITO** para os títulos da seção.`;

      try {
        const gptKey = localStorage.getItem('guru_gpt_key')?.trim();
        const res = await callAI(prompt, { model: 'gemini-2.5-flash', gptKey });
        if (!res) throw new Error('Resposta vazia da IA.');
        setStrategyResult(res);
        showToast("IA: Estratégia refinada!", "success");
      } catch (err) {
        console.error(err);
        showToast("Erro ao refinar estratégia: " + err.message, "error");
      } finally {
        setIsAnalyzingStrategy(false);
      }
    })();
  };

  const runTitlesAnalysis = async () => {
    if (!result) return;
    setIsAnalyzingTitles(true);
    
    // Prefill Titles
    const prefillTitles = getInstantNicheTitles(result.nicheName, selectedLanguageTitle);
    setTitlesResult(prefillTitles);

    (async () => {
      const prompt = `Você é um ESPECIALISTA ELITE em CTR, Algoritmos do YouTube e Psicologia do Clique.
NICHO EM ANÁLISE: "${result.nicheName}"
PÚBLICO ALVO: "${result.targetAudience}"
GAP A EXPLORAR: "${result.gapAnalysis}"

${strategyResult ? `INSIGHTS DA ESTRATÉGIA (Use esses dados para guiar a criação dos ganchos):\n${strategyResult}\n` : ''}

MISSÃO: Gerar 10 títulos NOVOS de altíssimo CTR perfeitos para estrear um canal neste nicho.
IDIOMA OBRIGATÓRIO: Gere TODOS os títulos em ${selectedLanguageTitle}. 

REGRAS CRÍTICAS:
- Analise os desejos ocultos do público e use como gancho.
- Os títulos devem ter entre 40 e 75 caracteres.
- Não use formatação markdown para os títulos, apenas a lista numerada padrão (ex: 1. Título).
- SEM ADJETIVOS VAZIOS, muita especificidade. Use a metodologia do medo, curiosidade ou ganância.

Retorne APENAS a lista numerada.`;

      try {
        const gptKey = localStorage.getItem('guru_gpt_key')?.trim();
        const res = await callAI(prompt, { model: 'gemini-2.5-flash', gptKey });
        if (!res) throw new Error('Resposta vazia da IA.');
        setTitlesResult(res);
        showToast("IA: Títulos refinados!", "success");
      } catch (err) {
        console.error(err);
        showToast("Erro ao refinar títulos: " + err.message, "error");
      } finally {
        setIsAnalyzingTitles(false);
      }
    })();
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto font-sans overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-6 pb-12 pt-4">
        <header className="mb-8 shrink-0">
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
                {isSearching ? <LoadingSpinner size="xs" message="" /> : <RadarScanIcon />}
                {isSearching ? loadingStep : "Extrair Mercado"}
             </button>
          </div>
        </div>

        {/* Results View */}
        <AnimatePresence mode="wait">
           {isSearching && !result ? (
              <motion.div 
                 key="loading"
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }}
                 className="glass-card p-32 flex flex-col items-center justify-center border border-white/5 relative overflow-hidden"
              >
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
                 <LoadingSpinner 
                    icon={Compass} 
                    title="Identificador de Nichos" 
                    message={loadingStep || "Realizando Varredura Continental..."} 
                    size="xl" 
                 />
              </motion.div>
           ) : result ? (
              <motion.div 
                 key="results"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="flex flex-col gap-6"
              >
                 <div className="flex justify-end mb-2 gap-2 items-center">
                    {isRefiningNiche && (
                       <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-purple/20 border border-neon-purple/30 rounded-xl text-[10px] font-black text-neon-purple uppercase tracking-widest animate-pulse mr-auto">
                          <LoadingSpinner size="xs" message="" />
                          Refinando Nicho...
                       </div>
                    )}
                    <button 
                      onClick={redoSearch}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all font-black text-xs uppercase tracking-widest border border-white/5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Recalcular Dados
                    </button>
                    <button 
                       onClick={() => handleCopy(JSON.stringify(result, null, 2), "all")}
                       className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all font-black text-xs uppercase tracking-widest border border-white/5"
                    >
                       {copiedSection === "all" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                       Copiar Tudo
                    </button>
                 </div>

                 {/* Top Metrics */}
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-4">
                    {[
                      { label: 'Apetite Viral', val: result.viralPotential + '/10', icon: Flame, color: 'text-neon-cyan' },
                      { label: 'Saturação Real', val: result.saturationScore + '/10', icon: AlertTriangle, color: getSaturationColor(result.saturationScore) },
                      { label: 'Esforço de Prod.', val: (result.productionDifficulty || 2) + '/10', icon: Zap, color: getDifficultyColor(result.productionDifficulty) },
                      { label: 'Oceano de Mercado', val: result.trendMomentum, icon: Target, color: getTrendColor(result.trendMomentum).split(' ')[0] }
                    ].map((s, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                         <s.icon className={`w-5 h-5 ${s.color} opacity-50`} />
                         <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                         <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{s.label}</p>
                      </div>
                    ))}
                 </div>

                 {/* Core Strategy */}
                 <div className="mb-4 bg-black/40 border-2 border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-2 h-full bg-neon-cyan" />
                   
                   <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                      <h3 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter leading-none">
                         {result.nicheName}
                      </h3>
                      <div className="flex flex-wrap gap-3 shrink-0">
                         <div className="inline-flex px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl text-xs font-black text-green-400 uppercase tracking-widest items-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.1)]">
                            <DollarSign className="w-4 h-4" /> Est. Ganho/1M: {calculateRevenue()}
                         </div>
                         <div className="inline-flex px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-gray-400 uppercase tracking-widest items-center">
                            Peso: {result.categoryMultiplier || 1}x
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div>
                         <h4 className="text-[11px] font-black text-neon-cyan uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4" /> A Estrutura Validada
                         </h4>
                         <p className="text-sm font-medium text-gray-300 leading-relaxed bg-white/5 p-5 rounded-xl border border-white/5">
                            {result.strategyDescription}
                         </p>
                      </div>
                      <div>
                         <h4 className="text-[11px] font-black text-neon-pink uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> A Fraqueza (Gap de Mercado)
                         </h4>
                         <p className="text-sm font-medium text-gray-300 leading-relaxed bg-white/5 p-5 rounded-xl border border-white/5 italic">
                            {result.gapAnalysis}
                         </p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-start gap-4 p-5 bg-dark/60 rounded-xl border border-white/5">
                         <Users className="w-10 h-10 text-neon-purple p-2 bg-neon-purple/10 rounded-xl shrink-0" />
                         <div>
                           <span className="block text-[10px] font-black text-neon-purple uppercase tracking-[0.2em] mb-1">Perfil Psicológico (Alvo)</span>
                           <p className="text-xs text-gray-300 font-bold leading-relaxed">{result.targetAudience}</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-green-600/10 to-transparent rounded-xl border border-green-500/20">
                         <DollarSign className="w-10 h-10 text-green-500 p-2 bg-green-500/10 rounded-xl shrink-0" />
                         <div>
                           <span className="block text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Monetização Camuflada</span>
                           <p className="text-xs text-green-100 font-bold leading-relaxed">{result.monetizationStrategy}</p>
                         </div>
                      </div>
                   </div>
                 </div>

                 {/* Strategy & Titles Section */}
                 <div className="grid grid-cols-1 gap-6 mb-4">
                    
                    {/* SECTION 1: AUTO STRATEGY */}
                    <div className="bg-black/40 border-2 border-white/10 rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-neon-purple" />
                      <h3 className="text-xl font-black text-white flex items-center justify-between gap-3 mb-6">
                        <span className="flex items-center gap-3">
                          <Brain className="text-neon-purple w-6 h-6" /> Análise Estratégica Automática
                        </span>
                        {isAnalyzingStrategy && (
                          <span className="flex items-center gap-1.5 px-2 py-1 bg-neon-purple/20 border border-neon-purple/30 rounded-lg text-[9px] font-black text-neon-purple uppercase tracking-widest animate-pulse">
                             <LoadingSpinner size="xs" message="" /> Refinando...
                          </span>
                        )}
                      </h3>
                      
                      {isAnalyzingStrategy && !strategyResult ? (
                         <LoadingSpinner 
                           title="Análise Estratégica"
                           message="Mapeando táticas do nicho..." 
                           size="lg" 
                           icon={Brain}
                           className="py-10" 
                         />
                      ) : strategyResult ? (
                        <div className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                             {parseStrategySections(strategyResult).map((sec) => {
                               const meta = SECTION_METADATA[sec.num] || { icon: Sparkles, color: 'text-white' };
                               const IconComponent = meta.icon;
                               const glowColor = meta.color === 'text-yellow-400' ? 'from-yellow-400 to-amber-600' : 
                                                 meta.color === 'text-neon-purple' ? 'from-neon-purple to-purple-800' : 
                                                 meta.color === 'text-neon-cyan' ? 'from-neon-cyan to-cyan-800' : 
                                                 meta.color === 'text-neon-pink' ? 'from-neon-pink to-pink-800' : 
                                                 meta.color === 'text-green-400' ? 'from-green-400 to-emerald-800' : 
                                                 meta.color === 'text-orange-400' ? 'from-orange-400 to-orange-800' : 
                                                 'from-indigo-400 to-indigo-800';
                               return (
                                 <div 
                                   key={sec.num}
                                   className="bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex flex-col justify-between"
                                 >
                                   <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${glowColor}`} />
                                   <div>
                                     <div className="flex items-center gap-3 mb-4">
                                       <div className={`p-2 rounded-xl bg-white/5 ${meta.color} group-hover:scale-110 transition-transform duration-300`}>
                                         <IconComponent className="w-5 h-5" />
                                       </div>
                                       <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
                                         {sec.title}
                                       </h4>
                                     </div>
                                     <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                       {sec.content.split('\n').map((line, lIdx) => {
                                         if (line.startsWith('- ') || line.startsWith('* ')) {
                                           return (
                                             <div key={lIdx} className={`pl-3 relative before:content-['•'] before:absolute before:left-0 ${meta.color} mt-1.5`}>
                                               {line.substring(2)}
                                             </div>
                                           );
                                         }
                                         return <p key={lIdx} className={lIdx > 0 ? "mt-2" : ""}>{line}</p>;
                                       })}
                                     </div>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                           <div className="pt-4 border-t border-white/10 flex justify-end">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(strategyResult);
                                  showToast('Análise Estratégica copiada!', 'success');
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
                              >
                                <Copy className="w-3.5 h-3.5" /> Copiar Análise
                              </button>
                           </div>
                        </div>
                      ) : (
                        <div className="py-10 text-center text-gray-500 font-bold text-sm">
                           Aguardando dados do nicho para iniciar a análise estratégica.
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: TITLE GENERATOR */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
                       <h4 className="text-sm font-black text-orange-400 uppercase tracking-[0.2em] flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
                          <span className="flex items-center gap-2">
                            <Type className="w-4 h-4" /> Gerador de Títulos Virais
                            {isAnalyzingTitles && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-neon-cyan/20 border border-neon-cyan/30 rounded text-[9px] font-black text-neon-cyan uppercase tracking-widest animate-pulse ml-2">
                                 <LoadingSpinner size="xs" message="" /> Refinando...
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2 w-full md:w-auto">
                            <select
                              value={selectedLanguageTitle}
                              onChange={(e) => setSelectedLanguageTitle(e.target.value)}
                              className="bg-black/40 border border-white/10 text-white text-xs rounded-lg focus:ring-neon-cyan focus:border-neon-cyan block p-2 font-bold w-full md:w-auto"
                            >
                              {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.name}>{lang.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={runTitlesAnalysis}
                              disabled={isAnalyzingTitles || isAnalyzingStrategy || !result}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-neon-cyan hover:bg-cyan-400 text-black rounded-lg font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            >
                              {isAnalyzingTitles ? <LoadingSpinner size="xs" message="" /> : <Wand2 className="w-4 h-4" />}
                              Gerar 10 Títulos
                            </button>
                          </div>
                       </h4>

                       {isAnalyzingTitles && !titlesResult ? (
                          <LoadingSpinner 
                            title="Gerador de Títulos"
                            message="Forjando ganchos impossíveis de ignorar..." 
                            size="lg" 
                            icon={Type}
                            className="py-12 bg-black/20 rounded-xl border border-white/5" 
                          />
                       ) : titlesResult ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             {titlesResult.split('\n').filter(t => t.trim().match(/^\d/)).map((titleLine, i) => {
                               const titleText = titleLine.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '');
                               return (
                                 <div key={i} className="flex gap-3 text-xs md:text-sm font-bold text-gray-200 bg-black/40 p-3.5 rounded-xl border border-white/5 hover:border-neon-cyan/50 transition-colors group items-start">
                                    <span className="text-neon-cyan shrink-0 font-black">{i+1}.</span>
                                    <span className="leading-tight flex-1">{titleText}</span>
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(titleText);
                                        setCopiedTitleIndex(i);
                                        setTimeout(() => setCopiedTitleIndex(null), 2000);
                                        const bridgeData = `NICHO GERADO:\n${result.nicheName}\n\nTÍTULO SELECIONADO:\n${titleText}\n\nPÚBLICO ALVO:\n${result.targetAudience}`;
                                        setWhiskTrigger(bridgeData);
                                        showToast("Título copiado e enviado para o Whisk!", "success");
                                      }}
                                      className="p-1.5 rounded-lg transition-all border flex items-center justify-center shrink-0 hover:bg-white/10 border-transparent hover:border-white/20 text-gray-500 hover:text-white"
                                      title="Copiar para usar no roteiro"
                                    >
                                      {copiedTitleIndex === i ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                 </div>
                               );
                             })}
                          </div>
                       ) : (
                          <div className="py-12 flex flex-col items-center justify-center text-center bg-black/20 rounded-xl border border-white/5">
                            <Sparkles className="w-8 h-8 text-gray-600 mb-3" />
                            <p className="text-gray-500 font-bold text-sm">
                               Clique em "Gerar 10 Títulos" para criar ganchos<br/>baseados no algoritmo e psicologia.
                            </p>
                          </div>
                       )}
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
