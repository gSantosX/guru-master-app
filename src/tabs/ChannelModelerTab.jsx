import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, ExternalLink, TrendingUp, BarChart2, Sparkles, Brain, Youtube, Clock, Eye, Video, Activity, Copy, Check, ChevronLeft, RefreshCw, Globe, Wand2, Download, ChevronDown } from 'lucide-react';
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

const FINANCE_SUBJECTS = [
  "Renda Passiva & Dividendos",
  "Criptomoedas & Bitcoin",
  "Investimentos para Iniciantes",
  "Ações & Bolsa de Valores",
  "Economia Doméstica & Poupança",
  "Cartões de Crédito & Milhas",
  "Mentalidade Financeira & Riqueza",
  "Planejamento de Aposentadoria",
  "Tesouro Direto & Renda Fixa",
  "Outro Assunto (Personalizado)"
];

const VISUAL_STYLES = [
  "Padrão do Canal",
  "Dark & Misterioso",
  "Clean & Corporativo",
  "Minimalista & Elegante",
  "Vibrante & Neon",
  "Futurista & Tech",
  "Ilustrado / 3D Pop",
  "Outro Estilo (Personalizado)"
];

const getInstantRecommendations = (channel) => {
  return {
    subjects: [
      { name: "Renda Passiva & Dividendos", chance: "alta" },
      { name: "Investimentos para Iniciantes", chance: "alta" },
      { name: "Criptomoedas & Bitcoin", chance: "media" },
      { name: "Economia Doméstica & Poupança", chance: "media" }
    ],
    visualStyles: [
      { name: "Dark & Misterioso", chance: "alta" },
      { name: "Vibrante & Neon", chance: "alta" },
      { name: "Clean & Corporativo", chance: "media" },
      { name: "Minimalista & Elegante", chance: "media" }
    ],
    languages: [
      { name: "Português (Brasil)", chance: "alta" },
      { name: "Inglês (US)", chance: "alta" },
      { name: "Espanhol (América Latina)", chance: "media" }
    ]
  };
};

const CustomSelect = ({ 
  label, 
  value, 
  onChange, 
  options, 
  customValue, 
  onCustomChange, 
  customPlaceholder, 
  customOptionLabel = "Outro (Personalizado)" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = options.find(opt => opt.name === value) || { name: value, chance: null };
  const currentChance = currentOption.chance;
  const isHighChance = currentChance === 'alta';

  return (
    <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-dark border text-gray-300 text-sm rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer transition-all duration-300 ${
          isHighChance 
            ? 'border-green-500/80 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.2)] text-green-300 hover:bg-green-500/10' 
            : 'border-white/10 hover:border-white/20 hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="truncate">{value}</span>
          {currentChance === 'alta' && (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-green-500/20 text-green-400 border border-green-500/30 shrink-0">
              alta chance
            </span>
          )}
          {currentChance === 'media' && (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
              média chance
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-black/95 border border-white/10 rounded-xl overflow-hidden z-50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] max-h-60 overflow-y-auto custom-scrollbar">
          {options.map((opt) => {
            const optName = opt.name;
            const optChance = opt.chance;
            const isSelected = optName === value;

            let chanceBadge = null;
            let itemClass = "text-gray-300 hover:bg-white/5";

            if (optChance === 'alta') {
              chanceBadge = (
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  alta chance
                </span>
              );
              itemClass = isSelected 
                ? "bg-green-500/10 text-green-300 border-l-2 border-green-500 font-bold" 
                : "text-green-400/90 hover:bg-green-500/5 hover:text-green-300";
            } else if (optChance === 'media') {
              chanceBadge = (
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  média chance
                </span>
              );
              itemClass = isSelected 
                ? "bg-purple-500/10 text-purple-300 border-l-2 border-purple-500 font-bold" 
                : "text-purple-400/90 hover:bg-purple-500/5 hover:text-purple-300";
            } else {
              if (isSelected) {
                itemClass = "bg-white/10 text-white font-bold";
              }
            }

            return (
              <div
                key={optName}
                onClick={() => {
                  onChange(optName);
                  setIsOpen(false);
                }}
                className={`px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer transition-colors ${itemClass}`}
              >
                <span className="truncate">{optName}</span>
                {chanceBadge}
              </div>
            );
          })}
        </div>
      )}

      {onCustomChange && value === customOptionLabel && (
        <input
          type="text"
          placeholder={customPlaceholder}
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          className="mt-1 w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:border-neon-cyan focus:outline-none text-white font-bold"
        />
      )}
    </div>
  );
};

// Heuristic helpers for instant pre-fill
const getInstantStrategy = (channel) => {
  const channelName = channel?.title || 'Canal';
  const viralTitle = (channel?.viralVideos || [])[0]?.title || 'Conteúdo Principal';
  return `**1. DIAGNÓSTICO DO NICHO**
Posicionamento focado em ${channelName}. Retenção via curiosidade intelectual e ganchos de alto impacto visual.

**2. FÓRMULA DE SUCESSO**
- Padrão 1: Títulos dinâmicos focados em curiosidade ou polêmica (ex: "${viralTitle}").
- Padrão 2: Narrativas rápidas com quebras de padrão a cada 3 segundos nos ganchos.

**3. VOZ DA AUDIÊNCIA (CRÍTICAS & DESEJOS)**
- Crítica: Ritmo acelerado demais em partes complexas.
- Desejo: Aprofundar as referências históricas/técnicas no roteiro.

**4. ESTRATÉGIA CORRIGIDA (CRITIQUE PATCHING)**
Replicar a estrutura de mistério/revelação do concorrente, mas adicionando pausas explicativas curtas (10s) nos pontos de maior complexidade indicados pelos comentários, eliminando a frustração da audiência.

**5. LACUNA DE OPORTUNIDADE**
Abordar o tema de forma mais didática e com storytelling linear, suprindo a falta de profundidade criticada no canal de origem.

**6. DICA DE OURO & ARMADILHA**
- Ouro: Iniciar com loop aberto conectando a crítica principal ao clímax do vídeo.
- Armadilha: Introduções genéricas ou enrolação nos primeiros 15 segundos.

**7. SUBNICHOS RECOMENDADOS**
1. Análises cirúrgicas focadas em segredos não revelados.
2. Cortes rápidos otimizados para TikTok/Reels com legenda dinâmica.

**8. ADAPTAÇÃO DE IDENTIDADE VISUAL & MASCOTES**
- Estilo Atual: Dark/Misterioso com avatares minimalistas em tons de roxo e preto.
- Sugestão 1 (Mascote Animal): Usar um Corvo ou Lobo estilizado em neon ciano.
- Sugestão 2 (Mascote Humano): Personagem 3D ou ilustração em estilo Cyberpunk (ex: hacker misterioso).
- Sugestão 3 (Tema Abstrato): Geometria sagrada ou símbolos antigos brilhantes sob fundo escuro.`;
};

const getInstantCountryAnalysis = (channel) => {
  return `**🎯 MERCADO VENCEDOR: Estados Unidos**
**🗣️ IDIOMA RECOMENDADO: Inglês (US)**
Alta audiência ativa e maior RPM global.

**💡 COMO ADAPTAR PARA ESTE MERCADO:**
- Traduzir identidade e usar paleta de cores minimalista de alta performance.
- Adaptar piadas locais e referências da cultura norte-americana.

**🌍 MENÇÕES HONROSAS:**
- Espanha: Grande escala hispana.
- Alemanha: Retenção e RPM elevados.`;
};

const getInstantTitles = (channel, count = 10, targetLang = 'Português (Brasil)', topic = 'Renda Passiva & Dividendos', visualStyle = 'Padrão do Canal') => {
  const channelName = channel?.title || 'Canal';
  const viralTitles = (channel?.viralVideos || []).map(v => v.title).filter(Boolean);
  
  let mainWord = channelName;
  if (viralTitles.length > 0) {
    const words = viralTitles[0].split(/\s+/).filter(w => w.length > 4 && !['como', 'sobre', 'para', 'porque'].includes(w.toLowerCase()));
    if (words.length > 0) {
      mainWord = words[0].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    }
  }

  let keyword = topic;
  if (!keyword || keyword === 'Outro Assunto (Personalizado)') {
    keyword = mainWord;
  }

  const styleText = visualStyle === 'Padrão do Canal' ? 'original' : visualStyle;

  let lang = 'pt';
  const targetLower = targetLang.toLowerCase();
  if (targetLower.includes('inglês') || targetLower.includes('english')) {
    lang = 'en';
  } else if (targetLower.includes('espanhol') || targetLower.includes('spanish') || targetLower.includes('espanha')) {
    lang = 'es';
  } else if (targetLower.includes('francês') || targetLower.includes('french')) {
    lang = 'fr';
  } else if (targetLower.includes('alemão') || targetLower.includes('german')) {
    lang = 'de';
  } else if (targetLower.includes('italiano') || targetLower.includes('italian')) {
    lang = 'it';
  }

  const templates = {
    pt: [
      `Como [KEYWORD] Revelou o Maior Mistério de 2026`,
      `O Lado Oculto de [KEYWORD] Que Ninguém Ousa Mostrar`,
      `A Verdade Sobre [KEYWORD] Que Está Assustando Produtores`,
      `5 Erros Fatais em [KEYWORD] Que Estão Destruindo Canais`,
      `Por Que Eles Estão Escondendo Isso de Você em [KEYWORD]?`,
      `Como Mudar Tudo Usando Apenas [KEYWORD] Esta Semana`,
      `O Guia Secreto de [KEYWORD] Que Funciona em 3 Dias`,
      `O Que Acontece se Você Ignorar [KEYWORD] Hoje?`,
      `A Decisão de 1 Milhão com [KEYWORD] (Passo a Passo)`,
      `Esta é a Única Forma Correta de Dominar [KEYWORD]`
    ],
    en: [
      `How [KEYWORD] Revealed the Biggest Mystery of 2026`,
      `The Hidden Side of [KEYWORD] They Don't Want You to See`,
      `The Truth About [KEYWORD] That is Scaring Creators`,
      `5 Fatal Mistakes in [KEYWORD] That Ruin Channels`,
      `Why Are They Hiding This [KEYWORD] Strategy From You?`,
      `How to Change Everything Using Only [KEYWORD] This Week`,
      `The Secret [KEYWORD] Guide That Works in 3 Days`,
      `What Happens If You Ignore [KEYWORD] Today?`,
      `The $1 Million Decision with [KEYWORD] (Step-by-Step)`,
      `This Is the Only Correct Way to Master [KEYWORD]`
    ],
    es: [
      `Cómo [KEYWORD] Reveló el Mayor Misterio de 2026`,
      `El Lado Oculto de [KEYWORD] Que Nadie Quiere Mostrar`,
      `La Verdad Sobre [KEYWORD] Que Asusta a los Creadores`,
      `5 Errores Fatales en [KEYWORD] Que Destruyen Canales`,
      `¿Por Qué Te Ocultan Esta Estrategia de [KEYWORD]?`,
      `Cómo Cambiar Todo Usando Solo [KEYWORD] Esta Semana`,
      `La Guía Secreta de [KEYWORD] Que Funciona en 3 Días`,
      `¿Qué Pasa Si Ignoras [KEYWORD] Hoy Mismo?`,
      `La Decisión de 1 Milñón con [KEYWORD] (Paso a Paso)`,
      `Esta es la Única Forma Correta de Dominar [KEYWORD]`
    ],
    fr: [
      `Comment [KEYWORD] a révélé le plus grand mystère de 2026`,
      `La face cachée de [KEYWORD] qu'ils ne veulent pas que vous voyiez`,
      `La vérité sur [KEYWORD] qui effraie les créateurs`,
      `5 erreurs fatales dans [KEYWORD] qui ruinent les chaînes`,
      `Pourquoi vous cachent-ils cette stratégie de [KEYWORD] ?`,
      `Comment tout changer en utilisant uniquement [KEYWORD] cette semaine`,
      `Le guide secret de [KEYWORD] qui fonctionne en 3 jours`,
      `Que se passe-t-il si vous ignorez [KEYWORD] aujourd'hui ?`,
      `La décision à 1 million de dollars avec [KEYWORD] (étape par étape)`,
      `C'est la seule façon correcte de maîtriser [KEYWORD]`
    ],
    de: [
      `Wie [KEYWORD] das größte Geheimnis von 2026 enthüllte`,
      `Die verborgene Seite von [KEYWORD], die Sie nicht sehen sollen`,
      `Die Wahrheit über [KEYWORD], die Schöpfer erschreckt`,
      `5 fatale Fehler in [KEYWORD], die Kanäle ruinieren`,
      `Warum verschweigen sie Ihnen diese [KEYWORD]-Strategie?`,
      `Wie Sie diese Woche alles ändern, indem Sie nur [KEYWORD] verwenden`,
      `Der geheime [KEYWORD]-Leitfaden, der in 3 Tagen funktioniert`,
      `Was passiert, wenn Sie [KEYWORD] heute ignorieren?`,
      `Die 1-Million-Dollar-Entscheidung mit [KEYWORD] (Schritt für Schritt)`,
      `Dies ist der einzig richtige Weg, um [KEYWORD] zu meistern`
    ],
    it: [
      `Come [KEYWORD] ha rivelato il più grande mistero del 2026`,
      `Il lato nascosto di [KEYWORD] che non vogliono farti vedere`,
      `La verità su [KEYWORD] que sta spaventando i creatori`,
      `5 errori fatali in [KEYWORD] che rovinano i canali`,
      `Perché ti nascondono questa estratégia su [KEYWORD]?`,
      `Come cambiare tudo usando solo [KEYWORD] questa settimana`,
      `La guida segreta di [KEYWORD] que funciona em 3 dias`,
      `Cosa succede se ignori [KEYWORD] oggi?`,
      `La decisione da 1 milione con [KEYWORD] (passo depois de passo)`,
      `Questo é l'unico modo corretto per dominare [KEYWORD]`
    ]
  };

  const differentials = {
    pt: [
      "Inicie quebrando a expectativa nos primeiros 5 segundos.",
      "Mostre um contraste visual 'Antes vs Depois' logo na thumbnail e nos primeiros segundos.",
      "Crie um loop aberto revelando que um detalhe bobo mudou tudo.",
      "Insira uma pergunta retórica provocativa antes de rodar a vinheta ou intro.",
      "Use zoom dinâmico na palavra-chave no primeiro segundo do vídeo.",
      "Aponte um erro comum que 90% das pessoas cometem e corrija de imediato.",
      "Apresente uma estatística chocante ou prova visual inegável de início.",
      "Faça um desafio rápido para prender a atenção até o final do vídeo.",
      "Mostre o resultado final surpreendente e prometa revelar o método em breve.",
      "Conecte a dor da audiência diretamente com a solução prática do vídeo."
    ],
    en: [
      "Start by breaking expectations in the first 5 seconds.",
      "Show a visual 'Before vs After' contrast in the thumbnail and initial seconds.",
      "Create an open loop revealing that a tiny detail changed everything.",
      "Insert a provocative rhetorical question before the intro.",
      "Use dynamic zoom on the keyword in the first second of the video.",
      "Point out a common mistake 90% of people make and fix it immediately.",
      "Present a shocking statistic or undeniable visual proof at the start.",
      "Pose a quick challenge to hold attention until the end of the video.",
      "Show the surprising final result and promise to reveal the method shortly.",
      "Connect the audience's pain point directly to the practical solution."
    ],
    es: [
      "Comience rompiendo la expectativa en los primeiros 5 segundos.",
      "Muestre un contraste visual 'Antes vs Después' en la miniatura y los primeiros segundos.",
      "Cree un bucle aberto revelando que un detalle tonto cambió todo.",
      "Inserte una pregunta retórica provocativa antes de la introducción.",
      "Use zoom dinámico en la palabra clave en el primer segundo del video.",
      "Señale un error común que el 90% de la gente comete y corríjalo de inmediato.",
      "Presente una estadística impactante o prova visual inegável al início.",
      "Haga un desafío rápido para mantener la atención hasta el final del video.",
      "Muestre el resultado final sorprendente y prometa revelar el método pronto.",
      "Conecte el dolor de la audiencia directamente con la solución prática."
    ],
    fr: [
      "Commencez par briser les attentes dès les 5 premières secondes.",
      "Montrez un contraste visuel 'Avant vs Après' dès le début.",
      "Créez une boucle ouverte révélant qu'un infime détail a tout changé.",
      "Insira uma question rhétorique provocante avant l'intro.",
      "Utilisez un zoom dynamique sur le mot-clé dans la première seconde.",
      "Signalez une erreur courante commise par 90% des gens et corrigez-la.",
      "Présentez une statistique choquante ou une preuve visuelle incontestable.",
      "Proposez un défi rapide pour maintenir l'attention jusqu'à la fin.",
      "Montrez le résultat final surprenant et promettez de révéler la méthode.",
      "Connectez directement la douleur du public à la solution pratique."
    ],
    de: [
      "Brechen Sie in den ersten 5 Sekunden die Erwartungshaltung.",
      "Zeigen Sie sofort einen visuellen 'Vorher-Nachher'-Kontrast.",
      "Erstellen Sie einen offenen Loop: Ein kleines Detail hat alles verändert.",
      "Stellen Sie eine provokante rhetorische Frage vor dem Intro.",
      "Nutzen Sie einen dynamischen Zoom auf das Keyword in Sekunde eins.",
      "Weisen Sie auf einen Fehler hin, den 90% machen, und lösen Sie ihn auf.",
      "Präsentieren Sie einen schockierenden Fakt oder visuellen Beweis zu Beginn.",
      "Stellen Sie eine schnelle Challenge, um die Aufmerksamkeit zu halten.",
      "Zeigen Sie das überraschende Endergebnis und versprechen Sie die Methode.",
      "Verbinden Sie den Schmerz der Zuschauer direkt mit der praktischen Lösung."
    ],
    it: [
      "Inizia rompendo le aspettative nei primi 5 secondi.",
      "Mostra un contrasto visivo 'Prima vs Dopo' nei primi secondi.",
      "Crea un loop aberto revelando que un piccolo detalhe mudou tudo.",
      "Inserisci una domanda retorica provocatoria prima della sigla.",
      "Usa lo zoom dinamico sulla palavra chiave nel primo secondo.",
      "Indica un errore comune commesso dal 90% delle persone e correggilo.",
      "Presenta una statistica shock o una prova visiva innegabile all'inizio.",
      "Fai una sfida veloce per manterre l'attenzione fino alla fine.",
      "Mostra il resultado final sorprendente e prometti di svelare o método.",
      "Collega o problema do público diretamente à solução prática."
    ]
  };

  const selectedTemplates = templates[lang] || templates.pt;
  const selectedDiffs = differentials[lang] || differentials.pt;
  return Array.from({ length: count }, (_, i) => {
    const template = selectedTemplates[i % selectedTemplates.length];
    const diff = selectedDiffs[i % selectedDiffs.length];
    const title = template.replace('[KEYWORD]', keyword);
    return `${i + 1}. ${title} | Diferencial: ${diff} (Estética: ${styleText})`;
  }).join('\n');
};

const SECTION_METADATA = {
  1: { icon: Brain, color: 'text-neon-purple' },
  2: { icon: TrendingUp, color: 'text-neon-cyan' },
  3: { icon: Activity, color: 'text-neon-pink' },
  4: { icon: Sparkles, color: 'text-yellow-400' },
  5: { icon: BarChart2, color: 'text-green-400' },
  6: { icon: Clock, color: 'text-orange-400' },
  7: { icon: Youtube, color: 'text-red-500' },
  8: { icon: Wand2, color: 'text-indigo-400' },
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

export const ChannelModelerTab = ({ isActive, setActiveTab }) => {
  const { configs, showToast } = useSystemStatus();
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
  const [isRefiningStrategy, setIsRefiningStrategy] = useState(false);

  // Section 2: Country Analysis
  const [isAnalyzingCountry, setIsAnalyzingCountry] = useState(false);
  const [countryResult, setCountryResult] = useState(null);
  const [isRefiningCountry, setIsRefiningCountry] = useState(false);

  // Section 3: Titles Generation
  const [isAnalyzingTitles, setIsAnalyzingTitles] = useState(false);
  const [titlesResult, setTitlesResult] = useState(null);
  const [isRefiningTitles, setIsRefiningTitles] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('Português (Brasil)');
  const [selectedTopic, setSelectedTopic] = useState('Renda Passiva & Dividendos');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedVisualStyle, setSelectedVisualStyle] = useState('Padrão do Canal');
  const [customVisualStyle, setCustomVisualStyle] = useState('');

  // Custom success-chance recommendations
  const [recommendations, setRecommendations] = useState(() => getInstantRecommendations(null));
  const [isAnalyzingRecommendations, setIsAnalyzingRecommendations] = useState(false);
  
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
      showToast('Erro ao gerar PDF.', 'error');
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
    if (!info) { showToast(t('channels.invalid_url'), 'error'); return; }
    setIsAdding(true);
    try {
      const data = await fetchChannelData(info);
      if (channels.find(c => c.id === data.id)) {
        showToast('Este canal já foi adicionado ao modelador.', 'warning');
        const c = channels.find(x => x.id === data.id);
        setSelectedChannel(c);
        resetAnalyses(c);
      } else {
        setChannels(prev => [data, ...prev.filter(c => c.id !== data.id)].slice(0, 9));
        setNewUrl('');
        setSelectedChannel(data);
        resetAnalyses(data);
      }
    } catch (err) { showToast(t('channels.fetch_error') + ': ' + err.message, 'error'); } finally { setIsAdding(false); }
  };

  const resetAnalyses = (channel = null) => {
    setStrategyResult(null);
    setCountryResult(null);
    setTitlesResult(null);
    const targetChannel = channel || selectedChannel;
    if (targetChannel) {
      const instantRecs = getInstantRecommendations(targetChannel);
      setRecommendations(instantRecs);
      
      const firstHighChanceSubject = instantRecs.subjects.find(s => s.chance === 'alta') || instantRecs.subjects[0];
      if (firstHighChanceSubject) setSelectedTopic(firstHighChanceSubject.name);
      
      const firstHighChanceStyle = instantRecs.visualStyles.find(s => s.chance === 'alta') || instantRecs.visualStyles[0];
      if (firstHighChanceStyle) setSelectedVisualStyle(firstHighChanceStyle.name);
      
      const firstHighChanceLang = instantRecs.languages.find(l => l.chance === 'alta') || instantRecs.languages[0];
      if (firstHighChanceLang) setSelectedLanguage(firstHighChanceLang.name);
    }
  };

  const handleRefreshChannel = async (force = true) => {
    if (!selectedChannel) return;
    try {
      const data = await fetchChannelData({ type: 'id', value: selectedChannel.id }, force);
      setChannels(prev => prev.map(c => c.id === data.id ? data : c));
      setSelectedChannel(data);
    } catch (err) { showToast('Erro ao atualizar dados: ' + err.message, 'error'); }
  };

  const getAnalysisContext = () => {
    const viralText = (selectedChannel.viralVideos || []).map(v => `- ${v.title}`).join('\n');
    const latestText = (selectedChannel.latestVideos || []).map(v => `- ${v.title}`).join('\n');
    const audienceText = (selectedChannel.audienceFeedback || []).sort((a, b) => b.likeCount - a.likeCount).slice(0, 30).map(c => `[${c.type.toUpperCase()}] (${c.likeCount} likes): ${c.text}`).join('\n');
    return { viralText, latestText, audienceText };
  };

  const runCountryAnalysis = async () => {
    if (!selectedChannel) return;
    
    // Set instant prefill result
    const instant = getInstantCountryAnalysis(selectedChannel);
    setCountryResult(instant);
    setIsRefiningCountry(true);
    
    // Auto-select language based on the instant result
    const langMatch = instant.match(/\*\*🗣️ IDIOMA RECOMENDADO:\s*(.*?)\*\*/i);
    if (langMatch && langMatch[1]) {
      setSelectedLanguage(langMatch[1].trim());
    }

    (async () => {
      try {
        const termPrompt = `Baseado no canal "${selectedChannel.title}" que fala sobre: ${selectedChannel.description}. Forneça APENAS 1 TERMO DE PESQUISA (uma palavra ou frase curta em INGLÊS) que seja o núcleo deste canal para fazer uma busca no YouTube e medir a concorrência global. RETORNE APENAS O TERMO.`;
        const searchTerm = await callAI(termPrompt, { model: 'gemini-2.5-flash' });
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
1. Identifique qual país (dentre os listados) apresenta a MAIOR OPORTUNIDADE para replicar o conteúdo do canal.
2. Entregue um relatório extremamente direto e resumido contendo o país vencedor, idioma recomendado, 2 dicas rápidas de adaptação e 2 menções honrosas com justificativas curtíssimas.

Formato OBRIGATÓRIO (PT-BR) - SEJA EXTREMAMENTE DIRETO E RESUMIDO (máximo 1 frase por item):
**🎯 MERCADO VENCEDOR: [Nome do País]**
**🗣️ IDIOMA RECOMENDADO: [Idioma falado, ex: Inglês (US), Espanhol, etc]**
[Uma única frase curta explicando o porquê]

**💡 COMO ADAPTAR PARA ESTE MERCADO:**
- [Dica 1 em 1 frase curta]
- [Dica 2 em 1 frase curta]

**🌍 MENÇÕES HONROSAS:**
- [País 2]: [Frase curtíssima]
- [País 3]: [Frase curtíssima]`;

        const analysis = await callAI(analysisPrompt, { model: 'gemini-2.5-flash' });
        if (analysis) {
          setCountryResult(analysis);
          // Auto-select language based on the refined result
          const langMatchRefined = analysis.match(/\*\*🗣️ IDIOMA RECOMENDADO:\s*(.*?)\*\*/i);
          if (langMatchRefined && langMatchRefined[1]) {
            setSelectedLanguage(langMatchRefined[1].trim());
          }
          showToast("IA: Análise internacional refinada!", "success");
        }
      } catch (err) {
        console.error(err);
        showToast("Aviso: Falha ao refinar análise internacional.", "warning");
      } finally {
        setIsRefiningCountry(false);
      }
    })();
  };

  const runRecommendationsAnalysis = async () => {
    if (!selectedChannel) return;
    
    setIsAnalyzingRecommendations(true);
    
    const prompt = `Você é um analista estratégico especializado em canais de finanças do YouTube e otimização de CTR.
Analise o canal "${selectedChannel.title}" e sua descrição: "${selectedChannel.description}".

Com base nos dados fornecidos do canal, faça uma análise estratégica detalhada para propor o seguinte:
1. De 3 a 5 assuntos de finanças (específicos do nicho financeiro) que teriam maior chance de sucesso para vídeos deste canal.
2. De 3 a 5 estilos visuais adaptados para thumbnails/vídeos deste canal que sejam alinhados à identidade dele.
3. De 1 a 3 idiomas de destino para os quais o canal poderia expandir.

Para cada recomendação, você deve atribuir uma probabilidade/chance de sucesso ("alta" ou "media"). 
A maior chance de sucesso (ou recomendação número 1 de cada categoria) DEVE receber a classificação "alta".

Retorne a resposta estritamente no formato JSON abaixo, sem blocos de código markdown ou texto extra:
{
  "subjects": [
    { "name": "Nome do Assunto de Finanças", "chance": "alta" },
    ...
  ],
  "visualStyles": [
    { "name": "Nome do Estilo Visual", "chance": "alta" },
    ...
  ],
  "languages": [
    { "name": "Nome do Idioma", "chance": "alta" },
    ...
  ]
}

Lista de idiomas possíveis para referência: Português (Brasil), Inglês (US), Espanhol (América Latina), Espanhol (Espanha), Francês, Alemão, Japonês, Coreano, etc.
Lista de estilos visuais possíveis para referência: Dark & Misterioso, Clean & Corporativo, Minimalista & Elegante, Vibrante & Neon, Futurista & Tech, Ilustrado / 3D Pop, etc.`;

    try {
      const response = await callAI(prompt, { model: 'gemini-2.5-flash' });
      if (response) {
        // Tentar limpar e fazer o parse da resposta
        const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanResponse);
        
        if (parsed.subjects && parsed.visualStyles && parsed.languages) {
          setRecommendations(parsed);
          
          // Auto-selecionar o primeiro de alta chance para cada um
          const firstHighChanceSubject = parsed.subjects.find(s => s.chance === 'alta') || parsed.subjects[0];
          if (firstHighChanceSubject) setSelectedTopic(firstHighChanceSubject.name);
          
          const firstHighChanceStyle = parsed.visualStyles.find(s => s.chance === 'alta') || parsed.visualStyles[0];
          if (firstHighChanceStyle) setSelectedVisualStyle(firstHighChanceStyle.name);
          
          const firstHighChanceLang = parsed.languages.find(l => l.chance === 'alta') || parsed.languages[0];
          if (firstHighChanceLang) setSelectedLanguage(firstHighChanceLang.name);
        }
      }
    } catch (err) {
      console.error("Failed parsing recommendations analysis:", err);
    } finally {
      setIsAnalyzingRecommendations(false);
    }
  };

  const runStrategyAnalysis = async () => {
    if (!selectedChannel) return;
    
    // Auto-trigger country analysis in parallel
    runCountryAnalysis();

    // Auto-trigger recommendations analysis in parallel
    runRecommendationsAnalysis();

    // Set instant prefill result
    const instant = getInstantStrategy(selectedChannel);
    setStrategyResult(instant);
    setIsRefiningStrategy(true);

    const { viralText, latestText, audienceText } = getAnalysisContext();
    const prompt = `Você é um MENTOR ESTRATÉGICO SÊNIOR de YouTube — especialista em análise de canais, crescimento orgânico e replicação de estratégias virais.

CANAL EM ANÁLISE: "${selectedChannel.title}"
VÍDEOS MAIS POPULARES (o que já provou funcionar):
${viralText || 'Dados não disponíveis'}
VÍDEOS MAIS RECENTES:
${latestText || 'Dados não disponíveis'}
VOZ DA AUDIÊNCIA (Comentários):
${audienceText || 'Sem comentários.'}

Sua resposta deve ter EXATAMENTE estas 8 partes EM PORTUGUÊS (PT-BR) — sem introdução, sem conclusão. Toda a análise deve ser um resumo cirúrgico, direto ao ponto e extremamente resumido:
**1. DIAGNÓSTICO DO NICHO**
Posicionamento real do canal em 1 frase curta.
**2. FÓRMULA DE SUCESSO**
2-3 padrões específicos e diretos de título/tema comuns nos vídeos virais.
**3. VOZ DA AUDIÊNCIA (CRÍTICAS & DESEJOS)**
Resumo em tópicos curtíssimos das principais críticas e desejos da audiência nos comentários.
**4. ESTRATÉGIA CORRIGIDA (CRITIQUE PATCHING)**
Proposta de correção estratégica cirúrgica: como modelar o canal fazendo o mínimo de alterações possíveis, corrigindo apenas as dores e objeções apontadas pelos comentários.
**5. LACUNA DE OPORTUNIDADE**
O que o canal não explorou que a audiência quer ver.
**6. DICA DE OURO & ARMADILHA**
Uma dica replicável direta e um erro crítico a ser evitado.
**7. SUBNICHOS RECOMENDADOS**
2-3 ideias práticas e curtas de subnichos derivados desta temática.
**8. ADAPTAÇÃO DE IDENTIDADE VISUAL & MASCOTES**
Identifique resumidamente o estilo visual do canal analisado e dê 3 novas sugestões diretas de adaptação de estilo/mascote equivalente (ex: se usam um boneco/mascote fictício, sugira um animal estilizado, um avatar cyberpunk ou uma figura humana alternativa) que preserve a mesma essência de design.

REGRAS CRÍTICAS:
- Seja extremamente cirúrgico, curto e objetivo.
- Use **NEGRITO** apenas para os títulos de seção exatos listados acima.`;

    (async () => {
      try {
        const result = await callAI(prompt, { model: 'gemini-2.5-flash' });
        if (!result) throw new Error('Resposta vazia da IA.');
        setStrategyResult(result);
        showToast("IA: Análise estratégica refinada!", "success");
      } catch (err) {
        console.error(err);
        showToast("Aviso: Falha ao refinar análise estratégica.", "warning");
      } finally {
        setIsRefiningStrategy(false);
      }
    })();
  };

  const runTitlesAnalysis = async () => {
    if (!selectedChannel) return;
    
    const topicToUse = selectedTopic === 'Outro Assunto (Personalizado)' ? customTopic : selectedTopic;
    const styleToUse = selectedVisualStyle === 'Outro Estilo (Personalizado)' ? customVisualStyle : selectedVisualStyle;
    
    // Set instant prefill result
    const instant = getInstantTitles(selectedChannel, 10, selectedLanguage, topicToUse, styleToUse);
    setTitlesResult(instant);
    setIsRefiningTitles(true);

    const { viralText, latestText, audienceText } = getAnalysisContext();
    const prompt = `Você é um ESPECIALISTA ELITE em CTR, Algoritmos do YouTube e Psicologia do Clique.
CANAL EM ANÁLISE: "${selectedChannel.title}"
VÍDEOS MAIS POPULARES:
${viralText || 'N/A'}
VOZ DA AUDIÊNCIA:
${audienceText || 'N/A'}

${strategyResult ? `INSIGHTS DA ESTRATÉGIA:\n${strategyResult}\n` : ''}

MISSÃO: Gerar 10 títulos NOVOS de altíssimo CTR em ${selectedLanguage}.
Você deve se inspirar na fórmula psicológica de sucesso e no estilo de títulos do canal analisado, mas adaptando e direcionando a geração para:
- ASSUNTO PRINCIPAL DO VÍDEO: "${topicToUse || 'Finanças'}"
- ESTILO VISUAL / ESTÉTICA DA THUMBNAIL E VÍDEO: "${styleToUse || 'Padrão do Canal'}"

REGRAS CRÍTICAS:
- Formato OBRIGATÓRIO por linha: "Número. Título do Vídeo | Diferencial: Uma dica curtíssima de retenção/roteiro + sugestão visual coerente com estética ${styleToUse || 'do canal'}".
- Exemplo: "1. Título Impactante Focado em ${topicToUse || 'Assunto'} | Diferencial: Comece abrindo um loop visual nos primeiros 5s usando estética no estilo ${styleToUse || 'do canal'}."
- Não use formatação markdown de negrito ou itálico no título. Apenas a lista numerada pura.
- O título deve ser extremamente chamativo (CTR alto), focado no assunto fornecido, e o diferencial deve ser cirúrgico e curto.
- Retorne APENAS a lista numerada no formato solicitado.`;

    (async () => {
      try {
        const result = await callAI(prompt, { model: 'gemini-2.5-flash' });
        if (result) {
          setTitlesResult(result);
          showToast("IA: Títulos refinados!", "success");
        }
      } catch (err) {
        console.error(err);
        showToast("Aviso: Falha ao refinar títulos.", "warning");
      } finally {
        setIsRefiningTitles(false);
      }
    })();
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
                        resetAnalyses(channel);
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
                    {isDownloadingPdf ? <LoadingSpinner size="xs" message="" /> : <><Download className="w-3 h-3" /> Baixar PDF</>}
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

              {/* SECTION 1: MODELING ANALYSIS (STRATEGY & GLOBAL) */}
              <div className="mb-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight uppercase italic">
                      <Brain className="text-neon-purple w-7 h-7" /> Análise de Modelagem
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-mono">Engenharia Reversa e Posicionamento de Canal</p>
                  </div>
                  {(isRefiningStrategy || isRefiningCountry) && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-neon-purple/20 text-neon-purple border border-neon-purple/30 animate-pulse self-start sm:self-center">
                      <LoadingSpinner size="xs" message="" />
                      Sincronizando IA...
                    </span>
                  )}
                </div>

                {isAnalyzingStrategy && !strategyResult ? (
                   <LoadingSpinner 
                     title="Modelador de Canais"
                     message="Mapeando padrão do canal..." 
                     size="lg" 
                     icon={Youtube}
                     className="py-10" 
                   />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Strategy blocks 1-8 */}
                    {parseStrategySections(strategyResult).map((sec) => {
                      const meta = SECTION_METADATA[sec.num] || { icon: Sparkles, color: 'text-white' };
                      const IconComponent = meta.icon;
                      const glowColor = meta.color === 'text-yellow-400' ? 'from-yellow-400 to-amber-600' : 
                                        meta.color === 'text-neon-purple' ? 'from-neon-purple to-purple-800' : 
                                        meta.color === 'text-neon-cyan' ? 'from-neon-cyan to-cyan-800' : 
                                        meta.color === 'text-neon-pink' ? 'from-neon-pink to-pink-800' : 
                                        meta.color === 'text-green-400' ? 'from-green-400 to-emerald-800' : 
                                        meta.color === 'text-orange-400' ? 'from-orange-400 to-orange-800' : 
                                        meta.color === 'text-red-500' ? 'from-red-500 to-red-800' : 
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
                                    <div key={lIdx} className="pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-neon-purple mt-1.5">
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

                    {/* Section 9: Integrated Global/Country Analysis */}
                    <div 
                      className="bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex flex-col justify-between"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-neon-cyan to-blue-800" />
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 rounded-xl bg-white/5 text-neon-cyan group-hover:scale-110 transition-transform duration-300">
                            <Globe className="w-5 h-5" />
                          </div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
                            9. ANÁLISE GLOBAL
                          </h4>
                        </div>

                        {isAnalyzingCountry && !countryResult ? (
                          <div className="py-6 flex flex-col items-center justify-center text-center">
                            <LoadingSpinner size="sm" message="Medindo demanda..." />
                          </div>
                        ) : countryResult ? (
                          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {countryResult.split('\n').map((line, i) => {
                              const parts = line.split(/(\*\*.*?\*\*)/g);
                              return (
                                <div key={i} className="mb-2">
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
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <p className="text-gray-500 text-xs mb-3">Identifique em qual país existe baixa concorrência e alta demanda.</p>
                            <button 
                              onClick={runCountryAnalysis}
                              className="px-4 py-1.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 rounded-xl hover:bg-neon-cyan hover:text-dark transition-all text-[10px] font-black uppercase tracking-wider"
                            >
                              Verificar Oportunidades
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: TITLE GENERATOR */}
              <div className="mb-10 bg-white/5 border-2 border-white/10 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-white w-6 h-6" />
                    <div>
                      <h3 className="text-xl font-black text-white">Gerador de Títulos Virais</h3>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">Adaptado com tema e estilo personalizados</p>
                    </div>
                    {isRefiningTitles && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white animate-pulse border border-white/20">
                        <LoadingSpinner size="xs" message="" />
                        Refinando...
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={runTitlesAnalysis}
                    disabled={isRefiningTitles || isAnalyzingTitles}
                    className="px-6 py-2.5 bg-white text-dark font-black rounded-xl hover:bg-gray-200 transition-all text-xs flex items-center gap-2 self-end sm:self-center"
                  >
                    {isRefiningTitles || isAnalyzingTitles ? <LoadingSpinner size="xs" message="" /> : <><Wand2 className="w-4 h-4" /> Gerar 10 Títulos</>}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Campo de Assunto */}
                  <CustomSelect
                    label="Assunto (Nicho de Finanças)"
                    value={selectedTopic}
                    onChange={setSelectedTopic}
                    options={[
                      ...(recommendations.subjects || []),
                      ...FINANCE_SUBJECTS.filter(topic => !(recommendations.subjects || []).some(s => s.name === topic) && topic !== 'Outro Assunto (Personalizado)').map(topic => ({ name: topic, chance: null })),
                      { name: 'Outro Assunto (Personalizado)', chance: null }
                    ]}
                    customValue={customTopic}
                    onCustomChange={setCustomTopic}
                    customPlaceholder="Digite o assunto personalizado..."
                    customOptionLabel="Outro Assunto (Personalizado)"
                  />

                  {/* Campo de Estilo Visual */}
                  <CustomSelect
                    label="Estilo Visual da Thumb/Vídeo"
                    value={selectedVisualStyle}
                    onChange={setSelectedVisualStyle}
                    options={[
                      ...(recommendations.visualStyles || []),
                      ...VISUAL_STYLES.filter(style => !(recommendations.visualStyles || []).some(s => s.name === style) && style !== 'Outro Estilo (Personalizado)').map(style => ({ name: style, chance: null })),
                      { name: 'Outro Estilo (Personalizado)', chance: null }
                    ]}
                    customValue={customVisualStyle}
                    onCustomChange={setCustomVisualStyle}
                    customPlaceholder="Digite o estilo visual personalizado..."
                    customOptionLabel="Outro Estilo (Personalizado)"
                  />

                  {/* Idioma da Geração */}
                  <CustomSelect
                    label="Idioma de Destino"
                    value={selectedLanguage}
                    onChange={setSelectedLanguage}
                    options={[
                      ...(recommendations.languages || []),
                      ...GLOBAL_LANGUAGES.filter(lang => !(recommendations.languages || []).some(l => l.name === lang)).map(lang => ({ name: lang, chance: null }))
                    ]}
                  />
                </div>

                {isAnalyzingTitles && !titlesResult ? (
                   <LoadingSpinner 
                     title="Gerador de Títulos"
                     message="Escrevendo títulos de alto CTR..." 
                     size="lg" 
                     icon={Sparkles}
                     className="py-10" 
                   />
                ) : titlesResult ? (
                   <div className="space-y-3">
                     {titlesResult.split('\n').map((title, idx) => {
                        const titleText = title.replace(/^[\d\-\*\•\)\.\s]+/, '').replace(/^["']+|["']+$/g, '').trim();
                        if (!titleText) return null;
                        const parts = titleText.split('|');
                        const mainTitle = parts[0].trim();
                        const differential = parts[1] ? parts[1].replace(/^\s*Diferencial:\s*/i, '').trim() : '';
                        return (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-start md:items-center justify-between p-4 bg-black/40 border border-white/5 rounded-xl hover:border-white/20 transition-all gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-bold text-gray-200 leading-relaxed">
                                <span className="text-white/50 mr-3">{idx + 1}.</span>
                                {mainTitle}
                              </p>
                              {differential && (
                                <p className="text-xs text-neon-cyan mt-1.5 flex items-start gap-1.5 italic font-medium">
                                  <span className="text-neon-cyan shrink-0 mt-0.5">💡</span>
                                  <span>Diferencial: {differential}</span>
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button 
                                onClick={() => handleGenerateFromSuggestedTitle(mainTitle)}
                                className="px-3 py-1.5 rounded-lg bg-neon-purple/10 text-neon-purple border border-neon-purple/20 text-[10px] font-black uppercase tracking-widest hover:bg-neon-purple hover:text-white transition-all"
                              >
                                Usar
                              </button>
                              <button 
                                onClick={() => copyToClipboard(mainTitle, idx)}
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
