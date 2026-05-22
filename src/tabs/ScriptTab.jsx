import React, { useState, useRef, useEffect } from 'react';
import { stackPush } from '../utils/stackUtils';
import { Wand2, Type, Layout, Target, FileText, Download, FileJson, File as FilePdf, Settings, BookOpen, Copy, Check, Sparkles, Languages, Gauge, Heart, Zap, Loader2, Save, Trash2, Share2, Trash, Eye, X, ChevronRight } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { resolveApiUrl } from '../utils/apiUtils';
import { callAI } from '../utils/aiUtils';
import { t } from '../utils/i18n';
import { usePersistence } from '../contexts/PersistenceContext';
import { useCloudStorage } from '../hooks/useCloudStorage';
import { generateVeoContent } from '../utils/veoUtils';

const DNA_GROUPS = {
  "🎬 Documentário": [
    "Investigação Cinematográfica",
    "Dossiê Investigativo",
    "O Lado Oculto (Deep Dive)",
    "Raízes Culturais (Documental)",
    "Relatos de uma Vila Isolada",
    "Sobrevivência Extrema (Relato)",
    "O Diário de um Explorador",
    "Expedição ao Desconhecido",
    "A Ciência por Trás do Fenômeno",
    "Visão Microscópica do Mundo",
  ],
  "📜 História & Civilizações": [
    "Reconstrução Histórica (Timeline)",
    "Ascensão e Queda de Impérios",
    "O Dia que Mudou o Mundo",
    "Crônicas de uma Guerra Esquecida",
    "Arquivos Secretos do Vaticano",
    "Genealogia de uma Família Real",
    "Heranças Malditas da História",
    "Sombras do Império",
    "Ouro Branco: A História do Sal",
    "Cidades Perdidas e Lendas",
    "A Biografia de um Objeto",
    "Paradoxo Temporal",
  ],
  "🌿 Agricultura & Campo": [
    "Ciclo Vital da Terra (Agrícola)",
    "Dossiê de Produção Rural",
    "A Revolução Verde (Evolução)",
    "Do Campo à Mesa (Logística)",
    "A Luta contra a Escassez",
    "Mitos da Roça vs Realidade",
    "Pelas Mãos do Artesão",
    "A Teia da Vida (Ecossistema)",
    "A Dança das Estações",
  ],
  "🔍 Mistérios & Conspiração": [
    "Teoria da Conspiração",
    "O Grande Mistério",
    "Revelação em Camadas (Iceberg)",
    "O Segredo das Pirâmides (Teoria)",
    "A Anatomia de um Golpe",
    "Poder Oculto das Corporações",
    "O Testamento Perdido",
    "Labirinto de Intrigas Políticas",
    "O Vazio Cognitivo (Loops)",
    "Oceanos de Mistério (Profundezas)",
  ],
  "💰 Finanças & Economia": [
    "O Caminho da Liberdade Financeira",
    "Raio-X do Mercado",
    "Ensinamento Financeiro Estruturado",
    "Análise de Portfólio Real",
    "A Geopolítica do Petróleo",
    "O Império do Consumo",
    "A Economia da Fé",
    "Duelo de Titãs (Análise)",
    "O Custo Humano do Ouro",
  ],
  "🎭 Narrativa & Drama": [
    "Linear Tradicional",
    "Jornada do Herói",
    "Cinematográfico Visceral",
    "Círculo Narrativo",
    "Ponto de Inflexão (A Virada)",
    "A Queda do Império",
    "Micro-Histórias Conectadas",
    "Desabafo Visceral",
    "Fragmentos de Memória",
    "O Eco do Passado",
  ],
  "🧠 Educação & Motivação": [
    "Problema e Solução",
    "Antes e Depois",
    "Guia Definitivo Passo-a-passo",
    "Desconstrução de Mitos",
    "O Método Científico",
    "Fatos Curiosos em Cadeia",
    "Debate Múltiplas Visões",
    "A Psicologia das Massas",
    "O Poder da Mente Subconsciente",
  ],
  "🔬 Ciência & Tecnologia": [
    "A Era das Máquinas Inteligentes",
    "Evolução Tecnológica Acelerada",
    "O Mistério da Matéria Escura",
    "A Última Fronteira Espacial",
    "Engenharia da Natureza",
    "A Anatomia de uma Descoberta",
    "Análise de Impacto Global",
    "Simulação de Cenário Distópico",
    "O Preço do Progresso",
  ],
  "⚡ Engajamento & Viral": [
    "Verdade Chocante de Início",
    "Lista em Contagem Regressiva",
    "A Grande Mentira",
    "Choque de Expectativas",
    "Pirâmide Invertida",
    "Ponto vs Contraponto",
    "Efeito Borboleta (Causas)",
    "Efeito Borboleta Inverso",
    "Futuro e Previsões",
  ],
  "🌍 Sociedade & Cultura": [
    "A Receita do Desastre",
    "Narrativa Imersiva (Você)",
    "Perspectiva em Primeira Pessoa",
    "Análise de Caso Real",
    "O Código Genético da Sociedade",
    "Metamorfose Social",
    "Fronteiras Invisíveis",
    "A Lei do Mais Forte (Natureza)",
    "O Legado dos Ancestrais",
    "O Vazio da Solidão (Humano)",
    "O Renascimento de uma Ideia",
    "O Despertar de um Gigante",
    "O Protocolo da Crise",
  ],
  "⚔️ Crime & Investigação": [
    "Anatomia de um Crime Perfeito",
    "A Batalha Final (Estratégia)",
    "O Código de Ética Samurai",
    "Dossiê Investigativo",
  ],
};
const DNA_OPTIONS = Object.values(DNA_GROUPS).flat();


const ALMA_OPTIONS = [
  "Amigável e Casual", "Sarcástica e Ácida", "Acolhedora e Empática", "Épica e Cinematográfica",
  "Misteriosa e Sombria", "Didática e Leve", "Autoritária e Confiante", "Inspiradora e Poética",
  "Cética e Provocadora", "Entusiasta e Vibrante", "Zen e Relaxante", "Confessional e Íntima",
  "Reflexão Bíblica Profunda", "Análise Teológica Contempl.", "Ensinamentos Bíblicos Aprof.",
  "Estudo Devocional Narrado", "Educacional Espiritual", "Pragmática e Analítica",
  "Visionária e Estratégica", "Paternalista e Educativa", "Investigadora Obcecada", 
  "Jornalística e Urgente", "Sombria e Macabra (Dark)", "Fria e Calculista",
  "Mentora Severa (Hard Truth)", "Sátira e Cinismo", "Altamente Eufórica", 
  "Questionadora Inquisitiva", "Melancólica e Nostálgica", "Especialista Tech", 
  "Conselheiro Sussurrado", "Persuasão Magnética", "Transformacional Raiz",
  "Sabedoria Anciã", "Razão Minimalista", "Documental Frio e Analítico", 
  "Autoridade Histórica Clássica", "Reportagem Investigativa Densa",
  "Sussurros de Conspiração", "Autoridade Técnica Absoluta", "Entusiasmo Contagiante", "Ironia Sofisticada", "Mentor Provocativo",
  "Rústica e Terrena (Agrícola)", "Nostálgica e Campesina", "Técnica e Especializada", "Resiliente e Perseverante",
  "Sábia e Ancestral", "Documental de Natureza", "Investigativa e Implacável", "Melodramática e Intensa",
  "Filosófica e Questionadora", "Utopista e Sonhadora", "Sombria e Gótica", "Futurista e Tecnológica",
  "Espiritual e Transcedental", "Épica e Lendária", "Militarista e Disciplinada", "Sarcástica e Satírica",
  "Aventurada e Audaz", "Trágica e Comovente", "Inspiradora e Motivacional", "Gélida e Distante",
  "Apaixonada e Fervorosa", "Crítica e Mordaz", "Engraçada e Irreverente", "Científica e Rigorosa",
  "Mística e Enigmática", "Urgente e Alarmista", "Pacífica e Meditativa", "Paternal e Protetora",
  "Rebelde e Revolucionária", "Sofisticada e Elegante", "Brutalista e Crua", "Infantil e Lúdica",
  "Agressiva e Dominante", "Submissa e Cautelosa", "Eufórica e Contagiante", "Melancólica e Profunda",
  "Cinematográfica Noir", "Jornalismo de Guerra", "Narrador de Fábulas", "Voz da Consciência",
  "Explorador Curioso", "Detetive de Histórias", "Sobrevivente Calejado", "Guru de Autoconhecimento",
  "Político Persuasivo", "Criança Curiosa", "Velho do Restelo (Sábio)", "Inteligência Artificial Fria",
  "Poeta Maldito", "Entonação Profética", "Analista de Dados Frio", "Coach de Alta Performance",
  "Narrador de Suspense", "Voz de Documentário BBC", "Explorador de Fronteiras", "Mestre de Cerimônias"
];

const CTA_OPTIONS = [
  "Viral (Engajamento)", "Conversão (Inscrição)", "Venda (Produto)", "Curiosidade (Próximo Vídeo)",
  "Desafio (Interação)", "Comunidade (Membro)", "Espiritual (Reflexão)", "Sutil (Invisível)", "Sem CTA"
];

const NICHO_OPTIONS = [
  "Documentário", "História", "Finanças", "Mistérios", "Crimes reais", "Espiritualidade",
  "Motivação", "Educação", "Curiosidades", "Histórias emocionantes", "Relacionamentos",
  "Saúde", "Tecnologia", "Agricultura", "Outro"
];

const IDIOMA_OPTIONS = [
  "Português (BR)", "Português (PT)", "Inglês", "Espanhol", "Francês", "Alemão", 
  "Italiano", "Japonês", "Chinês", "Russo", "Árabe", "Coreano", "Hindi"
];

const FORMATO_OPTIONS = ["Por Partes", "Texto Corrido", "Lista"];

const NATUREZA_OPTIONS = ["Dados Reais (usar pesquisa web)", "Ficção (criatividade pura)"];

const SAFETY_OPTIONS = ["Formato Seguro (Safety)", "Formato Meio Seguro (Médio Risco)", "Formato Livre (Sem Filtro)"];
const INTELLECT_OPTIONS = ["Pouco Intelectual", "Médio Intelectual", "Intelectual Alto"];
const FORMALITY_OPTIONS = ["Baixo", "Médio", "Alto"];

export const ScriptTab = ({ setActiveTab }) => {
  const { configs, showToast } = useSystemStatus();
  const { scriptState, setScriptState, setImagePromptTrigger } = usePersistence();
  const [cloudScripts, setCloudScripts] = useCloudStorage('scripts', []);

  // Helper: chama AI para geração de roteiro usando o modelo TOP (Pro).
  const callScriptAI = async (prompt, opts = {}) => {
    return await callAI(prompt, { ...opts, model: 'gemini-2.5-flash' });
  };
  
  const {
    titulo, dna, alma, cta, nicho, idioma, formato, natureza, 
    safety, intellect, formality, tamanho, isGenerating, 
    generatedScript, generationProgress, statusMessage, lastSavedId
  } = scriptState;

  // Generic state updater
  const updateScriptState = (updates) => {
    setScriptState(prev => ({ ...prev, ...updates }));
  };

  const setTitulo = (val) => updateScriptState({ titulo: val });
  const setDna = (val) => updateScriptState({ dna: val });
  const setAlma = (val) => updateScriptState({ alma: val });
  const setCta = (val) => updateScriptState({ cta: val });
  const setNicho = (val) => updateScriptState({ nicho: val });
  const setIdioma = (val) => updateScriptState({ idioma: val });
  const setFormato = (val) => updateScriptState({ formato: val });
  const setNatureza = (val) => updateScriptState({ natureza: val });
  const setSafety = (val) => updateScriptState({ safety: val });
  const setIntellect = (val) => updateScriptState({ intellect: val });
  const setFormality = (val) => updateScriptState({ formality: val });
  const setTamanho = (val) => updateScriptState({ tamanho: val });
  const setIsGenerating = (val) => updateScriptState({ isGenerating: val });
  const setGeneratedScript = (val) => updateScriptState({ generatedScript: val });
  const setGenerationProgress = (val) => updateScriptState({ generationProgress: val });
  const setStatusMessage = (val) => updateScriptState({ statusMessage: val });
  const setLastSavedId = (val) => updateScriptState({ lastSavedId: val });

  const [isCopied, setIsCopied] = useState(false);
  const [isAnalyzingTitle, setIsAnalyzingTitle] = useState(false);
  const [showFullScript, setShowFullScript] = useState(false);
  const [dnaOpen, setDnaOpen] = useState(false);
  const dnaRef = useRef(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dnaRef.current && !dnaRef.current.contains(e.target)) setDnaOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scriptViewerRef = useRef(null);

  const handleAnalyzeTitle = async () => {
    if (!titulo) return;
    setIsAnalyzingTitle(true);
    try {
      const prompt = `Analise: "${titulo}". Responda APENAS um JSON: {"dna":"OPCAO","alma":"OPCAO","nicho":"OPCAO","idioma":"OPCAO"}. 
      DNA: ${DNA_OPTIONS.join('|')}
      Alma: ${ALMA_OPTIONS.join('|')}
      Nicho: ${NICHO_OPTIONS.join('|')}
      Idioma: ${IDIOMA_OPTIONS.join('|')}`;

      // Usa o sistema universal inteligente sem forçar modelo depreciado
      const response = await callScriptAI(prompt, { 
        temperature: 0.1,
        isPromptTask: true
      });
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         const result = JSON.parse(jsonMatch[0]);
         if (result.dna && DNA_OPTIONS.includes(result.dna)) setDna(result.dna);
         if (result.alma && ALMA_OPTIONS.includes(result.alma)) setAlma(result.alma);
         if (result.nicho && NICHO_OPTIONS.includes(result.nicho)) setNicho(result.nicho);
         if (result.idioma && IDIOMA_OPTIONS.includes(result.idioma)) setIdioma(result.idioma);
         showToast("IA: Configurações otimizadas com sucesso!", "success");
      }
    } catch (e) {
      console.error('Erro na análise profunda:', e);
      showToast(e?.message || "Erro ao analisar título. Verifique a chave API.", "error");
    } finally {
      setIsAnalyzingTitle(false);
    }
  };

  useEffect(() => {
    const seedStr = localStorage.getItem('guru_script_seed');
    if (seedStr) {
      try {
        const seed = JSON.parse(seedStr);
        if (seed.title) setTitulo(seed.title);
        if (seed.niche) setNicho(seed.niche);
        if (seed.dna) setDna(seed.dna);
        localStorage.removeItem('guru_script_seed');
      } catch (e) {
        console.error('Seed error', e);
      }
    }
  }, []);

  const cleanScript = (text) => {
    return text
      .replace(/\[.*?\]/g, '') // Remove technical markers in brackets
      .replace(/\(.*?\)/g, '') // Remove technical markers in parentheses
      // Remove common labels like "Narrador:", "Cena 1:", etc.
      .replace(/^(Narrador|Ação|Nota|Parte|Parágrafo|Cena|Texto|Locução|Narrator|Action|Note|Part|Paragraph|Scene|Text|Voiceover|Título|Title|Intro|Hook|Outro|Conclusão)\s*\d*\s*[:\-]\s*/gim, '')
      // Remove any line starting with "Something: " (dialogue style)
      .replace(/^\s*[\w\u00C0-\u00FF\s]+:\s*/gm, '')
      // Remove numbering at the start of lines (1., 2-, etc.)
      .replace(/^\d+[\.\-\)]\s+/gm, '')
      // Remove Markdown headers (# Header)
      .replace(/^#+\s+/gm, '')
      // Remove asterisks used for emphasis/bolding that might look like markers
      .replace(/\*{1,3}/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress(5);
    setStatusMessage('Iniciando geração...');
    setGeneratedScript(null);

    const targetChars = tamanho;
    const minChars = targetChars - 2000;
    const maxChars = targetChars + 2000;
    const targetWords = Math.ceil(targetChars / 6);

    const systemPrompt = `Você é um roteirista profissional especializado em canais Dark.
Sua missão é criar um roteiro MAGISTRAL, PROFISSIONAL e ALTAMENTE ENGAJADOR.

--- PROTOCOLO DE CONFORMIDADE DE TAMANHO (LEI ABSOLUTA) ---
- ALVO EXATO: ${targetChars} caracteres.
- MARGEM RÍGIDA: Entre ${minChars} e ${maxChars} caracteres. NÃO negocie isso.
- ESTIMATIVA: Cerca de ${targetWords} palavras.
- Se o tema acabar cedo: aprofunde análises, adicione exemplos reais, contexto histórico, detalhes sensoriais.
- Não pare até atingir o volume solicitado com QUALIDADE TOTAL.

--- PROTOCOLO ZERO-MARKING (CRÍTICO) ---
- O texto DEVE ser PURO. Sem [Cenas], sem (Narrador), sem "Parte 1", sem títulos internos.
- Nada de numeração de parágrafos ou frases.
- O texto deve estar PRONTO PARA NARRAR, sem interrupções técnicas.
- Fluxo contínuo com ganchos (loops) entre as seções.

Título: ${titulo}
Nicho: ${nicho}
DNA: ${dna} | Alma: ${alma} | CTA: ${cta}
Idioma: ${idioma} | Intelecto: ${intellect} | Formalidade: ${formality}`;

    const userPrompt = `Escreva o roteiro completo para: "${titulo}". 
Desenvolva o tema de forma coesa, mantendo o nível de qualidade do início ao fim. 
Finalize com o CTA: ${cta}.
RESPONDA APENAS COM O TEXTO DA NARRAÇÃO.`;

    try {
      setGenerationProgress(20);
      setStatusMessage('Planejando Milestones de Volume...');

      const fullPrompt = `${systemPrompt}\n\nUSER REQUEST:\n${userPrompt}`;
      const estimatedTokens = Math.min(8192, Math.ceil((targetChars / 2.5) + 1000));

      let response = await callScriptAI(fullPrompt, {
        model: configs.active_model,
        maxOutputTokens: estimatedTokens,
        temperature: 0.7,
        isPromptTask: true
      });

      let cleanedContent = cleanScript(response);
      setGenerationProgress(55);

      // ── LOOP DE EXPANSÃO ITERATIVA (até 5 rodadas) ──────────────────────────
      let expansionRound = 0;
      while (cleanedContent.length < minChars && expansionRound < 5) {
        expansionRound++;
        const remaining = targetChars - cleanedContent.length;
        setStatusMessage(`Expansão ${expansionRound}/5 — faltam ~${remaining} chars...`);
        setGenerationProgress(55 + expansionRound * 6);

        const expansionPrompt = `${systemPrompt}

--- TAREFA DE CONTINUAÇÃO (ADIÇÃO DE CONTEÚDO) ---
O roteiro está com ${cleanedContent.length} caracteres. Alvo: ${targetChars}.
Faltam APROXIMADAMENTE ${remaining} caracteres para atingir a meta.
Continue a narrativa exatamente de onde parou. Mantenha o tom e a fluidez.
IMPORTANTE: Retorne APENAS o novo conteúdo gerado, sem repetir o que já foi escrito.

CONTEXTO FINAL DO ROTEIRO ATÉ AGORA:
... ${cleanedContent.slice(-2000)}`;

        const expandedResponse = await callScriptAI(expansionPrompt, {
          model: configs.active_model,
          maxOutputTokens: Math.min(8192, Math.ceil((remaining / 2.5) + 500)),
          temperature: 0.75,
          isPromptTask: true
        });

        cleanedContent = cleanedContent + '\n\n' + cleanScript(expandedResponse);
      }

      // ── TRUNCAMENTO INTELIGENTE se passar do máximo ─────────────────────────
      if (cleanedContent.length > maxChars) {
        setStatusMessage('Ajustando tamanho final...');
        // Corta no último ponto final antes do limite máximo
        const cutPoint = cleanedContent.lastIndexOf('.', maxChars);
        cleanedContent = cutPoint > minChars
          ? cleanedContent.substring(0, cutPoint + 1).trim()
          : cleanedContent.substring(0, maxChars).trim();
      }

      setGenerationProgress(90);
      setStatusMessage('Polimento Final de Fluxo...');

      // --- GERAR VEO ---
      const veoData = generateVeoContent(cleanedContent);

      const finalScript = {
        title: titulo,
        niche: nicho,
        content: cleanedContent,
        date: new Date().toLocaleString(),
        dna,
        alma,
        veoContent: veoData
      };

      setGeneratedScript(finalScript);
      setGenerationProgress(100);
      setStatusMessage('Roteiro Magistral Concluído!');

      // AUTO-SAVE to cloud (per-user account)
      const generatedId = Date.now();
      const toSave = { ...finalScript, id: generatedId, length: cleanedContent.length };
      setCloudScripts(prev => {
        const existing = Array.isArray(prev) ? prev : [];
        return [toSave, ...existing].slice(0, 6);
      });
      setLastSavedId(generatedId);
      window.dispatchEvent(new Event('guru_scripts_updated'));
      showToast(`✅ Roteiro salvo! ${cleanedContent.length} chars (alvo: ${targetChars})`, 'success');

      setTimeout(() => scriptViewerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 500);

    } catch (error) {
      console.error('Erro na geração:', error);
      showToast(error.message || 'Erro inesperado na geração', 'error');
    } finally {
      setIsGenerating(false);
    }
  };


  const handleCopy = () => {
    if (!generatedScript) return;
    navigator.clipboard.writeText(generatedScript.content);
    setIsCopied(true);
    showToast(t('script.copied'), 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleGoToPrompts = () => {
    if (!generatedScript || !lastSavedId) {
      // If for some reason we lost the ID, try to find the most recent one from cloud
      const scripts = Array.isArray(cloudScripts) ? cloudScripts : [];
      if (scripts.length > 0) {
        setImagePromptTrigger(scripts[0].id.toString());
        setActiveTab('image-prompts');
        return;
      }
      showToast("Gere um roteiro primeiro.", "error");
      return;
    }
    
    setImagePromptTrigger(lastSavedId.toString());
    setActiveTab('image-prompts');
  };

  const clearCurrentScript = () => {
    setGeneratedScript(null);
    setTitulo('');
    setGenerationProgress(0);
  };

  const transferToFlow = () => {
    if (!generatedScript) return;
    localStorage.setItem('guru_flow_prompts', generatedScript.content);
    // setActiveTab('whisk');
    showToast("Função Auto Flow temporariamente indisponível.", "error");
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto font-sans overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-6 pb-12 pt-4 animate-in fade-in duration-500">
      
      <header className="mb-8 w-full max-w-4xl">
        <h2 className="text-3xl md:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan p-[2px] shadow-[0_0_20px_rgba(0,243,255,0.3)]">
            <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
          </div>
          Criar Roteiro
        </h2>
        <p className="text-gray-400 mt-3 font-bold text-sm uppercase tracking-[0.2em] border-l-4 border-neon-cyan pl-4 ml-2 italic">
          V4 SCRIPT ENGINE: Roteirização Cirúrgica
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        {/* Coluna Esquerda - Configurações */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full xl:w-8/12 flex flex-col"
        >

        <div className="glass-card p-8 border border-white/10 shadow-2xl relative overflow-hidden group h-full">
            {generatedScript && (
              <button 
                onClick={clearCurrentScript}
                className="absolute top-6 right-6 p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all border border-white/5 z-10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

          <div className="space-y-8">
            {/* INPUT TÍTULO + GEMINI */}
            <div className="relative group">
               <div className="flex justify-between mb-1.5 px-1">
                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                   <Type className="w-3 h-3 text-neon-cyan" /> {t('script.field_title')}
                 </label>
                 <span className="text-[10px] font-mono text-gray-600">{titulo.length}/100</span>
               </div>
               <div className="relative flex gap-2">
                 <input 
                   type="text"
                   value={titulo}
                   onChange={(e) => setTitulo(e.target.value)}
                   placeholder={t('script.field_title_placeholder')}
                   className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-cyan/50 transition-all placeholder:text-gray-700 font-medium"
                 />
                  <button
                    onClick={handleAnalyzeTitle}
                    disabled={!titulo || isAnalyzingTitle}
                    className={`px-4 rounded-xl border flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group/gemini
                      ${isAnalyzingTitle 
                        ? 'bg-neon-cyan/20 border-neon-cyan/40 text-neon-cyan' 
                        : 'bg-black/60 border-white/10 text-gray-400 hover:border-neon-purple/50 hover:text-white'
                      }
                    `}
                  >
                    {isAnalyzingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-neon-cyan" />}
                  </button>
               </div>
               <div className="absolute bottom-0 left-4 right-14 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* DNA — Dropdown Customizado com Grupos */}
               <div ref={dnaRef} className="relative">
                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 px-1">{t('script.field_dna')}</label>
                 <button
                   type="button"
                   onClick={() => setDnaOpen(o => !o)}
                   className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs focus:outline-none focus:border-neon-purple/50 hover:bg-black/60 transition-colors text-left flex items-center justify-between gap-2"
                 >
                   <span className="truncate">{dna || 'Selecione...'}</span>
                   <svg className={`w-3 h-3 text-gray-500 shrink-0 transition-transform ${dnaOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                 </button>
                 {dnaOpen && (
                   <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl custom-scrollbar">
                     {Object.entries(DNA_GROUPS).map(([group, opts]) => (
                       <div key={group}>
                         <div className="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-neon-purple border-b border-white/5">{group}</div>
                         {opts.map(opt => (
                           <button
                             key={opt}
                             type="button"
                             onClick={() => { setDna(opt); setDnaOpen(false); }}
                             className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                               dna === opt
                                 ? 'bg-neon-purple/20 text-neon-purple font-bold'
                                 : 'text-gray-300 hover:bg-white/5 hover:text-white'
                             }`}
                           >
                             {opt}
                           </button>
                         ))}
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               {/* ALMA */}
               <div>
                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 px-1">{t('script.field_alma')}</label>
                 <select 
                    value={alma}
                    onChange={(e) => setAlma(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs focus:outline-none focus:border-neon-pink/50 appearance-none cursor-pointer hover:bg-black/60 transition-colors"
                 >
                   {ALMA_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-dark text-white">{opt}</option>)}
                 </select>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
               {/* NICHO */}
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-1">{t('script.niche')}</label>
                 <select 
                    value={nicho}
                    onChange={(e) => setNicho(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-[10px] focus:outline-none focus:border-white/20"
                 >
                   {NICHO_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-dark text-white">{opt}</option>)}
                 </select>
               </div>

               {/* CTA */}
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-1">{t('script.field_cta')}</label>
                 <select 
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-[10px] focus:outline-none focus:border-white/20"
                 >
                   {CTA_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-dark text-white">{opt}</option>)}
                 </select>
               </div>

               {/* IDIOMA */}
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-1">{t('script.lang')}</label>
                 <select 
                    value={idioma}
                    onChange={(e) => setIdioma(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-[10px] focus:outline-none focus:border-white/20"
                 >
                   {IDIOMA_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-dark text-white">{opt}</option>)}
                 </select>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* NATUREZA */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-1">{t('script.nature')}</label>
                  <select 
                     value={natureza}
                     onChange={(e) => setNatureza(e.target.value)}
                     className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs focus:outline-none focus:border-neon-cyan/50 appearance-none cursor-pointer hover:bg-black/60 transition-colors"
                  >
                    {NATUREZA_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-dark text-white">{opt}</option>)}
                  </select>
                </div>

                {/* SAFETY */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-1">{t('script.safety')}</label>
                  <select 
                     value={safety}
                     onChange={(e) => setSafety(e.target.value)}
                     className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs focus:outline-none focus:border-neon-purple/50 appearance-none cursor-pointer hover:bg-black/60 transition-colors"
                  >
                    {SAFETY_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-dark text-white">{opt}</option>)}
                  </select>
                </div>

                {/* INTELLECT */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-1">{t('script.intellect')}</label>
                  <select 
                     value={intellect}
                     onChange={(e) => setIntellect(e.target.value)}
                     className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs focus:outline-none focus:border-neon-pink/50 appearance-none cursor-pointer hover:bg-black/60 transition-colors"
                  >
                    {INTELLECT_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-dark text-white">{opt}</option>)}
                  </select>
                </div>

                {/* FORMALITY */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-1">{t('script.formality')}</label>
                  <select 
                     value={formality}
                     onChange={(e) => setFormality(e.target.value)}
                     className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs focus:outline-none focus:border-white/30 appearance-none cursor-pointer hover:bg-black/60 transition-colors"
                  >
                    {FORMALITY_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-dark text-white">{opt}</option>)}
                  </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-t border-white/5 pt-8">
                {/* FORMATO */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-1">{t('script.format')}</label>
                  <select 
                     value={formato}
                     onChange={(e) => setFormato(e.target.value)}
                     className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs focus:outline-none focus:border-neon-cyan/50 appearance-none cursor-pointer hover:bg-black/60 transition-colors"
                  >
                    {FORMATO_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-dark text-white">{opt}</option>)}
                  </select>
                </div>

                {/* SLIDER TAMANHO */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2 px-1">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">{t('script.size')}</label>
                     <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">(±2000)</span>
                        <span className="text-[10px] font-black font-mono text-neon-cyan bg-neon-cyan/10 px-2.5 py-1 rounded-full border border-neon-cyan/20">{tamanho}</span>
                     </div>
                  </div>
                  <input 
                    type="range" min="80" max="80000" step="500" value={tamanho}
                    onChange={(e) => setTamanho(Number(e.target.value))}
                    className="w-full h-1.5 bg-dark rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                  />
                </div>
            </div>
          </div>
          <div className="mt-12">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !titulo}
              className={`w-full py-5 rounded-xl flex items-center justify-center gap-3 font-black text-lg transition-all duration-500 transform active:scale-[0.98] relative overflow-hidden group
                ${isGenerating || !titulo
                  ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
                  : 'bg-white text-dark shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:shadow-[0_15px_40px_rgba(0,243,255,0.2)] hover:-translate-y-1'
                }
              `}
            >
              {isGenerating ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
                </span>
              ) : (
                <>
                  <Wand2 className={`w-6 h-6 ${!titulo ? 'text-gray-600' : 'text-neon-purple'}`} /> {t('script.generate')}
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/0 via-white/20 to-neon-purple/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Coluna Direita - Visualizador */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full xl:w-4/12 flex"
      >
        <div className="glass-card flex flex-col h-full border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-black/20 flex justify-between items-center z-10 backdrop-blur-md">
            <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
              <BookOpen className="text-neon-cyan w-4 h-4" /> {t('script.viewer_title')}
            </h3>
            
            {isGenerating && (
              <div className="flex items-center gap-3">
                 <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-neon-cyan animate-pulse uppercase">{statusMessage}</span>
                    <span className="text-[8px] font-mono text-gray-500">{generationProgress}%</span>
                 </div>
                 <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${generationProgress}%` }}
                      className="h-full bg-neon-cyan shadow-[0_0_10px_#00f3ff]"
                    />
                 </div>
              </div>
            )}

            {generatedScript && !isGenerating && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowFullScript(true)}
                  className="p-2 rounded-lg bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/20 transition-all group/eye"
                  title="Ver Roteiro Completo"
                >
                  <Eye className="w-4 h-4 group-hover/eye:scale-110 transition-transform" />
                </button>
                <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest">{t('ready')}</span>
              </div>
            )}
          </div>
          
          <div 
            ref={scriptViewerRef}
            className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar"
          >
            {isGenerating && !generatedScript ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                 <div className="relative">
                    <LoadingSpinner size="lg" />
                    <Sparkles className="absolute -top-4 -right-4 w-6 h-6 text-neon-cyan animate-pulse" />
                 </div>
              </div>
            ) : generatedScript ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8 p-6 bg-black/40 rounded-2xl border border-white/5">
                   <h4 className="text-xl font-black text-white mb-4 leading-tight">{generatedScript.title}</h4>
                   <div className="flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest opacity-80">
                     <span className="bg-neon-cyan/10 border border-neon-cyan/20 px-2 py-1 rounded-md text-neon-cyan">{generatedScript.niche}</span>
                     <span className="bg-neon-purple/10 border border-neon-purple/20 px-2 py-1 rounded-md text-neon-purple">{dna}</span>
                     <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-md text-gray-500">{generatedScript.date}</span>
                     <div className={`border px-2 py-1 rounded-md flex items-center gap-1 ${
                        Math.abs((generatedScript.content?.length || 0) - tamanho) <= 2000 
                        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        <span className="font-black">{generatedScript.content?.length || 0}</span>
                        <span className="text-[7px] opacity-60">/ {tamanho} CHARS</span>
                     </div>
                   </div>
                </div>
                <div className="relative">
                  <div className="font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {generatedScript.content.length > 800 
                      ? generatedScript.content.substring(0, 800) + '...' 
                      : generatedScript.content
                    }
                  </div>
                  {generatedScript.content.length > 800 && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-dark/90 to-transparent pointer-events-none" />
                  )}
                </div>
                {generatedScript.content.length > 800 && (
                   <button 
                     onClick={() => setShowFullScript(true)}
                     className="mt-4 text-[10px] font-black text-neon-cyan uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
                   >
                     Continuar Lendo <ChevronRight className="w-3 h-3" />
                   </button>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-12">
                <FileText className="w-16 h-16 text-gray-500 mb-6" />
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest leading-loose whitespace-pre-wrap">
                  {t('script.empty_hint')}
                </p>
              </div>
            )}
          </div>
          
          <div className="p-6 bg-black/40 border-t border-white/5 z-20 backdrop-blur-xl space-y-4">
             <button 
                onClick={handleGoToPrompts}
                disabled={isGenerating || !generatedScript}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-superwide flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl text-xs
                  ${isGenerating || !generatedScript
                    ? 'bg-white/5 text-gray-700 border border-white/5 cursor-not-allowed opacity-30 shadow-none'
                    : 'bg-gradient-to-r from-neon-pink to-neon-purple text-white shadow-neon-pink hover:scale-[1.02]'
                  }
                `}
              >
                <Wand2 className="w-5 h-5 flex-shrink-0" /> GERAR PROMPTS VISUAIS
              </button>

            <button 
              onClick={handleCopy}
              disabled={isGenerating || !generatedScript}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg text-[10px]
                ${isGenerating || !generatedScript
                  ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed opacity-30'
                  : isCopied 
                    ? 'bg-green-500/20 border border-green-500 text-green-400' 
                    : 'bg-white text-dark shadow-xl hover:bg-white/90'
                }
              `}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4" /> {t('script.copied') || 'COPIADO!'}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> {t('script.copy_full') || 'COPIAR ROTEIRO COMPLETO'}
                </>
              )}
            </button>

          </div>
        </div>
      </motion.div>
      </div>
      {/* MODAL ROTEIRO COMPLETO */}
      <AnimatePresence>
        {showFullScript && generatedScript && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFullScript(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-dark border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20">
                    <BookOpen className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase tracking-widest text-sm">{generatedScript.title}</h3>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{dna} • {alma}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFullScript(false)}
                  className="p-3 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8 sm:p-12 custom-scrollbar">
                <div className="max-w-3xl mx-auto font-mono text-base text-gray-300 whitespace-pre-wrap leading-loose">
                  {generatedScript.content}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-white/5 bg-black/20 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-neon-cyan/10 border border-neon-cyan/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <span className="text-neon-cyan font-black font-mono text-xs">{generatedScript.content.length}</span>
                    <span className="text-[8px] text-neon-cyan/60 font-black uppercase">Caracteres</span>
                  </div>
                  <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{generatedScript.date}</span>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={handleCopy}
                    className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                  >
                    <Copy className="w-4 h-4 text-neon-purple" /> Copiar Tudo
                  </button>
                  <button 
                    onClick={() => {}} // Download logic can be added/re-used
                    className="px-6 py-3 rounded-xl bg-neon-cyan text-dark font-black transition-all flex items-center gap-2 text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] hover:-translate-y-0.5"
                  >
                    <Download className="w-4 h-4" /> Download TXT
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default ScriptTab;
