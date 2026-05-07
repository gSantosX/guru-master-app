import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  File, 
  Wand2, 
  Copy, 
  Download, 
  Image as ImageIcon, 
  CheckCircle, 
  RefreshCw, 
  Zap, 
  Sparkles, 
  FileText, 
  Trash2,
  Check,
  X,
  ChevronRight,
  Eye,
  ArrowRight,
  Loader2,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { resolveApiUrl } from '../utils/apiUtils';
import { callAI, callGemini } from '../utils/aiUtils';
import { stackPush, stackRead, stackRemove } from '../utils/stackUtils';
import { t } from '../utils/i18n';
import { usePersistence } from '../contexts/PersistenceContext';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { useCloudStorage } from '../hooks/useCloudStorage';
import { generateVeoContent } from '../utils/veoUtils';

// ⚠️ getPromptsApiKey is intentionally defined INSIDE the component
// so it has live access to `configs` from SystemStatusContext.
// The module-level stub below is kept only so the file parses correctly —
// it is overridden by the real hook inside the component.
const _getPromptsApiKeyStub = () => '';


export const ImagePromptsTab = ({ setActiveTab, isActive = true }) => {
  const { status, configs } = useSystemStatus();
  const [cloudScripts] = useCloudStorage('scripts', []);

  // ── Chave exclusiva do Gerador de Prompts ─────────────────────────────────
  // Prioridade: 1) gemini_prompts_key (Supabase) → 2) google_script_key (campo pessoal)
  //             → 3) localStorage direto → 4) chave paga como fallback final
  const MASTER_GEMINI_KEY = 'AIzaSyBBCgHN2uMfey5aR_Y4CJDOeyqY_oLSFG0';
  const getPromptsApiKey = React.useCallback(() => {
    // 1ª prioridade: chave gratuita exclusiva de prompts (Supabase)
    if (configs?.gemini_prompts_key?.trim()) {
      return configs.gemini_prompts_key.trim();
    }
    // 2ª prioridade: chave pessoal do campo "Google API Key — Gerador de Prompts"
    if (configs?.google_script_key?.trim()) {
      return configs.google_script_key.trim();
    }
    // 3ª prioridade: localStorage (sincronizado pelo SystemStatusContext)
    const lsPrompts = localStorage.getItem('guru_gemini_prompts_key');
    if (lsPrompts?.trim()) return lsPrompts.trim();
    const lsScript = localStorage.getItem('guru_google_script_key');
    if (lsScript?.trim()) return lsScript.trim();
    // Bloqueia o uso da chave mestra do sistema para o Gerador de Prompts (exige chave pessoal)
    return null;
  }, [configs]);

  const { promptState, setPromptState } = usePersistence();
  const { 
    file, 
    subtitleBlocks, 
    prompts, 
    selectedScriptId, 
    promptPools,
    availableScripts,
    visualDNA,
    genMode,
    genero,
    cameraMovimento,
    composicao,
    focoLente,
    atmosferaLuz
  } = promptState;

  const setFile = (val) => setPromptState(prev => ({ ...prev, file: typeof val === 'function' ? val(prev.file) : val }));
  const setSubtitleBlocks = (val) => setPromptState(prev => ({ ...prev, subtitleBlocks: typeof val === 'function' ? val(prev.subtitleBlocks) : val }));
  const setPrompts = (val) => setPromptState(prev => ({ ...prev, prompts: typeof val === 'function' ? val(prev.prompts) : val }));
  const setSelectedScriptId = (val) => setPromptState(prev => ({ ...prev, selectedScriptId: typeof val === 'function' ? val(prev.selectedScriptId) : val }));
  const setPromptPools = (val) => setPromptState(prev => ({ ...prev, promptPools: typeof val === 'function' ? val(prev.promptPools) : val }));
  const setAvailableScripts = (val) => setPromptState(prev => ({ ...prev, availableScripts: typeof val === 'function' ? val(prev.availableScripts) : val }));
  const setVisualDNA = (val) => setPromptState(prev => ({ ...prev, visualDNA: typeof val === 'function' ? val(prev.visualDNA) : val }));
  const setGenMode = (val) => setPromptState(prev => ({ ...prev, genMode: typeof val === 'function' ? val(prev.genMode) : val }));
  const setGenero = (val) => setPromptState(prev => ({ ...prev, genero: val }));
  const setCameraMovimento = (val) => setPromptState(prev => ({ ...prev, cameraMovimento: typeof val === 'function' ? val(prev.cameraMovimento) : val }));
  const setComposicao = (val) => setPromptState(prev => ({ ...prev, composicao: typeof val === 'function' ? val(prev.composicao) : val }));
  const setFocoLente = (val) => setPromptState(prev => ({ ...prev, focoLente: typeof val === 'function' ? val(prev.focoLente) : val }));
  const setAtmosferaLuz = (val) => setPromptState(prev => ({ ...prev, atmosferaLuz: typeof val === 'function' ? val(prev.atmosferaLuz) : val }));

  const [isDragging, setIsDragging] = useState(false);
  const [subtitleCount, setSubtitleCount] = useState(subtitleBlocks.length);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  const [isCopied, setIsCopied] = useState(false);
  const [promptType, setPromptType] = useState('image'); // 'image' or 'video'
  const [outputFormat, setOutputFormat] = useState('text'); // 'text' or 'json'
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const cancelRef = useRef(false); // <--- Inject cancel abort signal here
  const [generationProgress, setGenerationProgress] = useState({ step: '', current: 0, total: 0, statuses: [] });
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairLogs, setRepairLogs] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  
  const [referenceImage, setReferenceImage] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  const updateDNAField = (field, value) => {
    setVisualDNA({ ...visualDNA, [field]: value });
  };

  const loadScripts = () => {
    // Agora o dropdown utilizará "cloudScripts" que já é um estado reativo,
    // mas mantemos este utilitário para caso o hook demore, ele ter fallback instantâneo.
    const savedScripts = JSON.parse(localStorage.getItem('guru_cloud_scripts') || '[]');
    const scriptsArray = Array.isArray(savedScripts) ? savedScripts : [];
    setAvailableScripts(scriptsArray);
    return scriptsArray;
  };

  const analyzeImageDNA = async (base64Data, mimeType) => {
    setIsAnalyzingImage(true);
    setAnalyzeError("");

    try {
      const analysisPrompt = `Você é um Diretor Cinematográfico de Elite. Analise esta imagem cirurgicamente e retorne UM JSON com o DNA visual da imagem. Responda SOMENTE com o JSON, sem markdown, sem texto adicional.

Campos obrigatórios:
- scenario: locais e arquitetura dominantes na imagem
- era: período ou estilo temporal percebido
- mood: carga emocional visual
- lighting: estilo de iluminação (ex: luz natural, high key, sombras duras)
- palette: 3 cores principais (ex: tons terrosos, neon cyan e magenta)
- camera: ângulo de câmera e percepção de lente
- rec_genero: UM valor exato de: Ultra-realista | Cinema (Blockbuster) | Cartoon / Animação | Documentário | Film Noir | Ficção Científica | Terror / Dark | Fantasia Épica | Anime
- rec_camera: array com 1-2 valores de: Vista aérea | Na altura dos olhos | Vista de cima | Vista de baixo | Travelling | Câmera lenta | Zoom in | Pan lateral`;

      const mainKey = localStorage.getItem('guru_gemini_key') || 'GLOBAL';
      const imagePart = {
        inlineData: {
          data: base64Data.split(',')[1],
          mimeType: mimeType
        }
      };

      const response = await callGemini(mainKey, analysisPrompt, { 
        model: 'gemini-1.5-pro', 
        temperature: 0.1,
        imagePart: imagePart 
      });

      const cleaned = response.replace(/```json\n?|```/g, '').trim();
      
      let dna = null;
      const jsonMatches = [...cleaned.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/gs)];
      for (let mi = jsonMatches.length - 1; mi >= 0; mi--) {
        try {
          const candidate = JSON.parse(jsonMatches[mi][0]);
          if (candidate.scenario) { dna = candidate; break; }
        } catch { }
      }
      if (!dna) {
        const jsonMatch = cleaned.match(/\{[\s\S]*?\}(?=[^{]*$)/);
        if (jsonMatch) {
          try { dna = JSON.parse(jsonMatch[0]); } catch { }
        }
      }
      if (!dna?.scenario) throw new Error('A IA não retornou um JSON válido.');

      setVisualDNA(dna);
      if (dna.rec_genero) setGenero(dna.rec_genero);
      if (dna.rec_camera && Array.isArray(dna.rec_camera)) setCameraMovimento(dna.rec_camera);

    } catch (error) {
      console.error('❌ [Analyze Image] Erro:', error);
      setAnalyzeError(error.message);
      setReferenceImage(null);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleImageUpload = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert("Por favor, envie um arquivo de imagem válido.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setReferenceImage(base64);
      analyzeImageDNA(base64, file.type);
    };
    reader.readAsDataURL(file);
  };


  useEffect(() => {
    loadScripts();
    window.addEventListener('guru_scripts_updated', loadScripts);
    return () => window.removeEventListener('guru_scripts_updated', loadScripts);
  }, []);

  // AUTO-INJECT VEO SCRIPT
  useEffect(() => {
    if (selectedScriptId) {
      const scriptsList = cloudScripts.length > 0 ? cloudScripts : availableScripts;
      const script = scriptsList.find(s => String(s.id) === String(selectedScriptId));
      if (script && script.content) {
        const veoData = generateVeoContent(script.content);
        const parts = veoData.split(/\n\s*\n/).filter(p => p.trim());
        const blocks = parts.map(p => {
          const lines = p.trim().split('\n');
          if (lines.length >= 3) return lines.slice(2).join(' ').trim();
          return p.trim();
        });
        setSubtitleBlocks(blocks);
        setSubtitleCount(blocks.length);
        setFile({ name: `Legenda_VEO_${script.title || selectedScriptId}.veo`, size: veoData.length });
        setPrompts("");
        
        // Clear DNA when switching script
        setReferenceImage(null);
        setVisualDNA({ scenario: '', era: '', mood: '', lighting: '', palette: '', camera: '' });
      }
    } else {
      setFile(null);
      setSubtitleBlocks([]);
      setSubtitleCount(0);
      setPrompts("");
    }
  }, [selectedScriptId, cloudScripts, availableScripts]);

  useEffect(() => {
    if (!isActive) return;
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          handleImageUpload(file);
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      const triggerId = localStorage.getItem('guru_image_prompt_trigger_id');
      if (triggerId) {
        setSelectedScriptId(triggerId);
        localStorage.removeItem('guru_image_prompt_trigger_id');
      }
    }
  }, [isActive]);

  const [showFullOutput, setShowFullOutput] = useState(false);
  const [copyingId, setCopyingId] = useState(null);

  const handleCopyHistory = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopyingId(id);
    setTimeout(() => setCopyingId(null), 2000);
  };
  const [copyingPoolId, setCopyingPoolId] = useState(null);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleFileDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const uploadedFile = e.dataTransfer.files[0];
    if (uploadedFile) processFile(uploadedFile);
  };

  const handleFileInput = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) processFile(uploadedFile);
  };

  const handleClearFile = (e) => {
    if (e) e.stopPropagation();
    setFile(null);
    setSubtitleBlocks([]);
    setSubtitleCount(0);
    setPrompts("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClearPrompts = () => {
    setPrompts("");
  };

  const processFile = (file) => {
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      let rawText = "";
      if (file.name.toLowerCase().endsWith('.srt') || file.name.toLowerCase().endsWith('.veo')) {
        const parts = text.split(/\n\s*\n/).filter(p => p.trim());
        const rawBlocks = parts.map(p => {
          const lines = p.trim().split('\n');
          if (lines.length >= 3) return lines.slice(2).join(' ').trim();
          return p.trim();
        });
        rawText = rawBlocks.join(' ');
      } else {
        rawText = text;
      }

      // FORÇAR A REGRA ABSOLUTA DE 16-22 PALAVRAS EM ARQUIVOS ANEXADOS!
      const veoData = generateVeoContent(rawText);
      const newParts = veoData.split(/\n\s*\n/).filter(p => p.trim());
      const blocks = newParts.map(p => {
        const lines = p.trim().split('\n');
        if (lines.length >= 3) return lines.slice(2).join(' ').trim();
        return p.trim();
      });

      setSubtitleBlocks(blocks);
      setSubtitleCount(blocks.length);
      setPrompts("");
    };
    reader.readAsText(file);
    setIsVerified(false);
  };

  const runFastVerification = (content = prompts) => {
    if (!content) return { allOk: true, count: 0 };
    setIsVerifying(true);
    setIsVerified(false);
    setErrorCount(0);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const blocks = content.split('\n\n').filter(p => p.trim());
        let invalidCount = 0;
        const issues = [];

        if (genMode === 'quality') {
          // Detect Veo 3.1 format [PROMPT]: / [NEGATIVO]: vs legacy PROMPT: / NEGATIVE PROMPT:
          const isVeoFormat = content.includes('[PROMPT]:') || content.includes('[NEGATIVO]:');
          
          blocks.forEach((block, idx) => {
            if (isVeoFormat) {
              // Veo 3.1 format: [PROMPT]: and [NEGATIVO]: must exist on the same line
              const promptLine = block.split('\n').find(l => /\[PROMPT\]:/i.test(l));
              const singleLine = promptLine && /\[NEGATIVO\]:/i.test(promptLine);
              if (!promptLine || !singleLine) { invalidCount++; issues.push(idx); }
            } else {
              // Legacy format: PROMPT: and NEGATIVE PROMPT: on same line
              const hasPrompt = block.toLowerCase().includes('prompt:');
              const hasNegative = block.toLowerCase().includes('negative prompt:');
              const promptLine = block.split('\n').find(l => /PROMPT:/i.test(l));
              const singleLine = promptLine && /NEGATIVE PROMPT:/i.test(promptLine);
              if (!hasPrompt || !hasNegative || !singleLine) { invalidCount++; issues.push(idx); }
            }
          });
        } else {
          blocks.forEach((block, idx) => { if (block.length < 10) { invalidCount++; issues.push(idx); } });
        }

        const ok = invalidCount === 0;
        setIsVerified(ok);
        setErrorCount(invalidCount);
        setIsVerifying(false);
        resolve({ allOk: ok, count: invalidCount, issues });
      }, 600);
    });
  };

  const handleAutomaticRepair = async (content = prompts) => {
    if (!content) return;
    setIsRepairing(true);
    setShowScanner(true);
    setErrorCount(0);
    setRepairLogs(["Iniciando Agente de Diagnóstico..."]);
    
    try {
      await new Promise(r => setTimeout(r, 400)); // Visual "processing" delay
      
      // Detect format
      const isVeoFormat = content.includes('[PROMPT]:') || content.includes('[NEGATIVO]:');
      
      // PHASE 1: REGEX REPAIR (Aggressive)
      setRepairLogs(prev => [...prev, "Analisando estrutura de blocos..."]);
      
      let repaired = content.trim();
      let logs = [];

      if (isVeoFormat) {
        // Fix Veo 3.1 format: If [NEGATIVO]: is on its own separate line, join it
        if (/^\[NEGATIVO\]:/gim.test(repaired)) {
          repaired = repaired.replace(/([^\n]+)\s*\n\s*(\[NEGATIVO\]:)/gi, '$1 $2');
          logs.push("✓ Unindo [PROMPT]: e [NEGATIVO]: na mesma linha (Veo 3.1)");
        }
        // Fix extra blank lines within a block
        repaired = repaired.replace(/\[PROMPT\]:\s*([\s\S]*?)\s*\n+\s*(\[NEGATIVO\]:)/gim, (match, p1, p2) => {
          return `[PROMPT]: ${p1.trim()} ${p2}`;
        });
        logs.push("✓ Normalizando estrutura interna dos blocos Veo 3.1");
      } else {
        // Fix 1: Legacy format - If NEGATIVE PROMPT is on its own separate line, join it to the previous PROMPT line
        if (/^NEGATIVE PROMPT:/gim.test(repaired)) {
          repaired = repaired.replace(/([^\n]+)\s*\n\s*(NEGATIVE PROMPT:)/gi, '$1 $2');
          logs.push("✓ Unindo PROMPT e NEGATIVE PROMPT na mesma linha");
        }
        // Fix 2: Remove any extra blank lines WITHIN a prompt block
        repaired = repaired.replace(/PROMPT:\s*([\s\S]*?)\s*\n+\s*(NEGATIVE PROMPT:)/gim, (match, p1, p2) => {
          return `PROMPT: ${p1.trim()} ${p2}`;
        });
        logs.push("✓ Normalizando estrutura interna dos blocos");
      }

      // Fix: Ensure exactly one blank line between blocks
      repaired = repaired.replace(/\n{3,}/g, '\n\n');
      logs.push("✓ Normalizando separação entre blocos");

      setRepairLogs(prev => [...prev, ...logs]);
      await new Promise(r => setTimeout(r, 600));

      // PHASE 2: AI REPAIR (Fallback)
      const res = await runFastVerification(repaired);
      if (!res.allOk) {
        setRepairLogs(prev => [...prev, "🚨 Inconsistência Crítica: Acionando Reparo via IA..."]);
        
        const repairFormat = isVeoFormat
          ? `[PROMPT]: [Text] [NEGATIVO]: [Text] (SAME LINE, no newline between them)`
          : `PROMPT: [Text] NEGATIVE PROMPT: [Text] (SAME LINE, no newline between them)`;
        
        const repairPrompt = `URGENT REPAIR: One or more blocks are poorly formatted. 
        STRICT FORMAT: ${repairFormat}.
        Separate each complete block with ONE empty line.
        Repair these blocks keeping original descriptions:
        ${repaired}`;
        const aiRepaired = await callGemini(getPromptsApiKey(), repairPrompt, { model: 'gemini-1.5-flash' }); // flash é mais rápido e garantido na chave free
        repaired = aiRepaired.trim();
        setRepairLogs(prev => [...prev, "✓ Reparo de Estrutura via IA Concluído"]);
      }

      setPrompts(repaired);
      await runFastVerification(repaired);
      setRepairLogs(prev => [...prev, "✨ Todos os Prompts Validados e Prontos!"]);
      await new Promise(r => setTimeout(r, 1000)); // Let the user read the success log
      return repaired;
    } catch (e) {
      console.error("Repair error:", e);
      setRepairLogs(prev => [...prev, "✖ Erro no Reparo: Informe suporte."]);
      return content;
    } finally {
      setIsRepairing(false);
      setTimeout(() => setShowScanner(false), 500);
      setTimeout(() => setRepairLogs([]), 2000);
    }
  };

  const getActiveStyle = () => ({ label: genero || 'Livre', desc: '' });

  // Tag toggle helper
  const toggleTag = (setter, current, tag) => {
    setter(current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]);
  };

  // Cine param data
  const GENERO_TAGS = ['Ficção científica', 'Film noir', 'Terror', 'Animação 3D', 'Documentário', 'Fantasia épica', 'Retrato cinematográfico', 'Anime'];
  const CAMERA_TAGS = ['Vista aérea', 'Na altura dos olhos', 'Vista de cima', 'Vista de baixo', 'Travelling', 'Câmera lenta', 'Zoom in', 'Pan lateral'];
  const COMPOSICAO_TAGS = ['Plano geral', 'Close-up', 'Plano médio', 'Retrato', 'Plano único', 'Plano duplo'];
  const FOCO_TAGS = ['Foco raso', 'Foco profundo', 'Lente macro', 'Grande-angular', 'Filtro difusor', 'Teleobjetiva'];
  const ATMOSFERA_TAGS = ['Tons azuis frios', 'Tons quentes dourados', 'Noite estrelada', 'Luz neon', 'Pôr do sol', 'Névoa', 'Chuva', 'Alta exposição'];

  const getSystemPrompt = (count = 0) => {
    // Build cinematographic brief from selected parameters
    const cineParams = [
      genero ? `- Estilo/Gênero: ${genero}` : '',
      cameraMovimento?.length ? `- Câmera & Movimento: ${cameraMovimento.join(', ')}` : '',
      composicao?.length ? `- Composição: ${composicao.join(', ')}` : '',
      focoLente?.length ? `- Foco & Lente: ${focoLente.join(', ')}` : '',
      atmosferaLuz?.length ? `- Atmosfera & Luz: ${atmosferaLuz.join(', ')}` : '',
    ].filter(Boolean).join('\n    ');

    const dnaContext = `
    ## DNA VISUAL DO ROTEIRO (REGRAS INVIOLÁVEIS)
    - Cenário e Arquitetura: ${visualDNA.scenario || 'A ser definido'}
    - Época/Ambiente: ${visualDNA.era || 'A ser definido'}
    - Mood Emocional: ${visualDNA.mood || 'A ser definido'}
    - Iluminação Mestre: ${visualDNA.lighting || 'A ser definido'}
    - Paleta de Cores: ${visualDNA.palette || 'A ser definido'}
    - Linguagem de Câmera base: ${visualDNA.camera || 'A ser definido'}

    ## PARÂMETROS CINEMATOGRÁFICOS SELECIONADOS (PRIORIDADE MÁXIMA)
    ${cineParams || '- Nenhum parâmetro específico selecionado — use criatividade baseada no DNA acima'}
    `;

    if (genMode === 'fast') {
      if (promptType === 'video') {
        // Fast Veo 3.1 format
        return `Você é um Diretor Cinematográfico AI de elite especialista em Veo 3.1.
      COMANDO: GERE PROMPTS CINEMATOGRÁFICOS RÁPIDOS E PRECISOS PARA VEO 3.1.
      ${dnaContext}
      REGRA ABSOLUTA: Cada prompt DEVE respeitar o DNA Visual acima. Responda SEMPRE em Português.
      
      ## FORMATO OBRIGATÓRIO (cada prompt em uma única linha contínua):
      [PROMPT]: [conteúdo completo aqui em uma linha][NEGATIVO]: [lista de elementos indesejados aqui]
      [linha em branco]
      
      ${outputFormat === 'json' ? `SAÍDA: JSON [ { "id": X, "prompt": "...", "negativo": "..." }, ... ]` : `SAÍDA: Um bloco por legenda, [PROMPT]: e [NEGATIVO]: na MESMA LINHA`}`;
      } else {
        return `You are an ELITE Image Prompt Engineer. Generate exactly ${count} ultra-realistic image prompts in ENGLISH, one per subtitle block.

VISUAL DNA (apply to every prompt):
- Scenario: ${visualDNA.scenario || 'Real-world environment'}
- Era: ${visualDNA.era || 'Contemporary'}
- Mood: ${visualDNA.mood || 'Cinematic'}
- Lighting: ${visualDNA.lighting || 'Natural light'}
- Palette: ${visualDNA.palette || 'Realistic, muted'}
- Camera: ${visualDNA.camera || 'Cinematic angles'}
${cineParams ? `\nPARAMETERS: ${cineParams}` : ''}

RULES:
- ENGLISH ONLY — no Portuguese, no other language
- ONE prompt per subtitle — do NOT skip or merge any
- Reality and physics only — no fantasy
- NEGATIVE PROMPT on the same line as the prompt
- Label each prompt with the subtitle ID using [N]: format

OUTPUT FORMAT (one per subtitle, empty line between):
[1]: Ultra-Realista — 8K cinematic photography. [shot type + visual description of subtitle content]. NEGATIVE PROMPT: CGI, cartoon, blurry, distorted, text, watermark.

[2]: Ultra-Realista — 8K cinematic photography. [shot type + visual description of subtitle content]. NEGATIVE PROMPT: CGI, cartoon, blurry, distorted, text, watermark.

${outputFormat === 'json' ? `OUTPUT: JSON [ { "id": N, "prompt": "...", "negative": "..." } ]` : `Respond ONLY with the numbered [N]: prompt blocks. No intro, no summary.`}`;
      }
    } else {
      // MODO QUALIDADE ELITE

      if (promptType === 'video') {
        // VEO 3.1 GOLD STANDARD — Instruções completas
        const veoExample = `[PROMPT]: Uma astrônoma de meia-idade com cabelos grisalhos presos em um coque descuidado e olhos castanhos cansados, vestindo um macacão espacial laranja desgastado com remendos nas mangas, flutua lentamente em gravidade zero dentro de uma estação espacial abandonada, segurando com as duas mãos uma fotografia desbotada enquanto lágrimas esféricas se desprendem de seus olhos e flutuam ao redor de seu rosto, ao fundo janelas circulares revelam o vazio negro do espaço com a Terra azul ao longe, estilo drama científico intimista com influências de Alfonso Cuarón, câmera em travelling suave se aproximando em arco circular ao nível dos olhos, composição em retrato fechado, foco raso com bokeh profundo desfocando o fundo estrelado, iluminação fria e azulada vinda das janelas contrastando com o calor âmbar de uma luz de emergência piscando, som ambiente de respiração pesada dentro do capacete e um zumbido elétrico baixo e contínuo ao fundo.[NEGATIVO]: baixa qualidade, borrado, distorção, pixelado, artefatos de compressão, câmera tremida, anatomia incorreta, mãos distorcidas, rosto deformado, expressão facial artificial, movimentos robóticos, física irreal, texto na tela, marca d'água, legenda, CGI barato, iluminação artificial excessiva, super-exposição, cores saturadas artificialmente, múltiplos personagens não solicitados.`;

        return `Você é o SUPREMO Diretor Cinematográfico AI e Engenheiro de Prompts para Veo 3.1.
      COMANDO: GERE PROMPTS CINEMATOGRÁFICOS MAGISTRAIS SEGUINDO O PADRÃO OURO VEO 3.1.

      ## EXEMPLO PADRÃO OURO VEO 3.1:
      ${veoExample}

      ${dnaContext}

      ## REGRAS DE CONSTRUÇÃO DO PROMPT (OBRIGATÓRIO — nesta ordem):
      Cada prompt deve conter TODOS os elementos abaixo em frase contínua e fluida em PORTUGUÊS:
      1. SUJEITO — máximo detalhe físico, vestuário, expressão facial e características únicas.
      2. AÇÃO — verbos precisos e advérbios expressivos (ex: "caminha lentamente", "vira a cabeça de forma brusca").
      3. CENÁRIO — ambiente, época, arquitetura, vegetação, clima e elementos de fundo.
      4. ESTILO CINEMATOGRÁFICO — gênero, referências de direção e sensação geral.
      5. MOVIMENTO DE CÂMERA — tipo de plano, ângulo e movimento (ex: travelling lateral, drone, altura dos olhos).
      6. COMPOSIÇÃO — plano geral, close-up, plano médio, retrato, plano único ou duplo.
      7. FOCO E LENTE — bokeh, lente macro, grande-angular, teleobjetiva, filtro difusor.
      8. ATMOSFERA E ILUMINAÇÃO — hora do dia, tipo de luz, temperatura de cor, sombras, contraste.
      9. ÁUDIO — obrigatoriamente inclua: diálogo entre aspas, efeitos sonoros OU ruído ambiente detalhado.

      ## REGRAS DO PROMPT NEGATIVO:
      Liste separados por vírgula: problemas técnicos + problemas visuais específicos da cena + elementos de conteúdo indesejados + inconsistências de estilo + movimentos não naturais.

      ## DNA VISUAL INVIOLÁVEL DO ROTEIRO:
      ${dnaContext}

      ## FORMATO OBRIGATÓRIO (ZERO QUEBRAS DE LINHA INTERNAS):
      [PROMPT]: [texto completo em uma única linha contínua][NEGATIVO]: [lista separada por vírgula em uma linha]
      [LINHA EM BRANCO]

      NÍVEL DE DETALHE: 80–150 palavras por prompt. Evite termos vagos — use descritores concretos e sensoriais.
      IDIOMA: SEMPRE Português do Brasil.
      ${outputFormat === 'json' ? `## SAÍDA: JSON [ { "id": X, "prompt": "...", "negativo": "..." }, ... ]` : `## SAÍDA: UM BLOCO POR LEGENDA — [PROMPT]: e [NEGATIVO]: na MESMA LINHA`}`;
      } else {
        // Image Quality — same format as fast but with more detail
        return `You are a MASTER ultra-realistic image prompt engineer. Generate exactly ${count} photographic prompts in ENGLISH, one per subtitle.

VISUAL DNA (inviolable — apply to every prompt):
- Scenario: ${visualDNA.scenario || 'Real-world environment'}
- Era: ${visualDNA.era || 'Contemporary'}
- Mood: ${visualDNA.mood || 'Cinematic, grounded'}
- Lighting: ${visualDNA.lighting || 'Natural cinematic light'}
- Palette: ${visualDNA.palette || 'Realistic, muted'}
- Camera: ${visualDNA.camera || 'Varied cinematic angles'}
${cineParams ? `\nPARAMETERS: ${cineParams}` : ''}

RULES:
- ENGLISH ONLY — no Portuguese, no other language
- ONE prompt per subtitle — do NOT skip or merge
- Translate each subtitle into photographic visual terms (reality + physics only)
- 70–110 words per prompt body
- No fantasy, no impossible elements
- NEGATIVE PROMPT on the SAME LINE as the prompt
- Label each prompt with the subtitle ID using [N]: format

OUTPUT FORMAT (one per subtitle, empty line between):
[1]: Ultra-Realista — Fotografia cinematográfica 8K hiper-real, iluminação natural perfeita. [shot type] [detailed visual scene from subtitle]. NEGATIVE PROMPT: CGI, 3D render, cartoon, anime, watercolor, text, watermark, blurry, distorted, oversaturation.

[2]: Ultra-Realista — Fotografia cinematográfica 8K hiper-real, iluminação natural perfeita. [shot type] [detailed visual scene from subtitle]. NEGATIVE PROMPT: CGI, 3D render, cartoon, anime, watercolor, text, watermark, blurry, distorted, oversaturation.

${outputFormat === 'json' ? `OUTPUT: JSON array [ { "id": N, "prompt": "...", "negative": "..." }, ... ]` : `Respond ONLY with the [N]: prompt blocks. No intro text, no summary.`}`;

      }
    }
  };
  


  const handleGenerate = async () => {
    if (!file && !prompts) {
      alert("Por favor, faça upload de uma legenda (.srt ou .txt) primeiro.");
      return;
    }

    const apiKey = getPromptsApiKey();
    if (!apiKey) {
      alert("⚠️ Chave Gratuita Necessária! Por favor, vá em 'Configurações -> Suas Chaves Pessoais' e insira a sua Google API Key (Criador de Prompts) para utilizar esta ferramenta.");
      return;
    }

    setIsGenerating(true);
    setPrompts("");
    cancelRef.current = false;

    // ── MODO IMAGEM (text): Geração em Lote (10 cenas por chamada) para máxima velocidade ──
    if (promptType === 'image' && outputFormat !== 'json') {
      const total = subtitleBlocks.length;
      const BATCH_SIZE = 10; // 10 cenas por chamada = 10x mais rápido
      const totalBatches = Math.ceil(total / BATCH_SIZE);
      
      setGenerationProgress({ 
        step: `Iniciando geração em lote (0/${total})...`, 
        current: 0, 
        total, 
        statuses: new Array(total).fill('pending') 
      });

      const resultsArr = new Array(total).fill('');
      const statusArr  = new Array(total).fill('pending');
      
      const dnaPart = `Scenario: ${visualDNA.scenario || 'Real-world'} | Era: ${visualDNA.era || 'Contemporary'} | Mood: ${visualDNA.mood || 'Cinematic'} | Lighting: ${visualDNA.lighting || 'Natural light'} | Palette: ${visualDNA.palette || 'Realistic'} | Camera: ${visualDNA.camera || 'Cinematic angles'}`;
      
      const genBatch = async (batchIdx) => {
        const start = batchIdx * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, total);
        const batchSubtitles = subtitleBlocks.slice(start, end);
        
        // Constrói a lista de legendas com IDs para a IA manter a ordem
        const subtitlesWithIds = batchSubtitles.map((s, i) => `[${start + i + 1}]: ${s}`).join('\n');

        const systemPrompt = `You are a MASTER ultra-realistic image prompt engineer. 
        TASK: Write ONE English photographic prompt for EACH subtitle provided below.
        VISUAL DNA: ${dnaPart}
        RULES: 
        - Respond ONLY in English. 
        - Use exactly the format [N]: [Prompt Text] NEGATIVE PROMPT: [Negatives]
        - Keep prompts between 60-100 words.
        - Ensure 100% parity: Prompt [N] must describe Subtitle [N].
        
        SUBTITLES TO PROCESS:
        ${subtitlesWithIds}`;

        for (let a = 0; a < 3; a++) {
          try {
            if (a > 0) await new Promise(r => setTimeout(r, a * 2000));
            
            // Prioriza a chave de prompts (gratuita) com fallback para 'GLOBAL'
            const apiKey = getPromptsApiKey() || 'GLOBAL';
            const resp = await callGemini(apiKey, systemPrompt, { model: 'gemini-1.5-flash' });
            
            // Extração dos prompts por ID [N]:
            const lines = resp.split('\n').filter(l => l.includes(']:'));
            let foundCount = 0;
            
            lines.forEach(line => {
              const match = line.match(/\[(\d+)\]:\s*([\s\S]+)/);
              if (match) {
                const id = parseInt(match[1]);
                const content = match[2].trim();
                if (id >= start + 1 && id <= end) {
                  resultsArr[id - 1] = content;
                  statusArr[id - 1] = 'done';
                  foundCount++;
                }
              }
            });

            if (foundCount > 0) return true;
          } catch (e) {
            console.error(`Erro no lote ${batchIdx}:`, e);
            if (a === 2) throw e;
          }
        }
        return false;
      };

      const PARALLEL_BATCHES = 4; // 4 lotes simultâneos (40 cenas por vez)
      for (let p = 0; p < totalBatches; p += PARALLEL_BATCHES) {
        if (cancelRef.current) break;
        const batchPromises = [];
        for (let b = 0; b < PARALLEL_BATCHES && (p + b) < totalBatches; b++) {
          batchPromises.push(genBatch(p + b));
        }
        
        await Promise.all(batchPromises);
        
        const doneCount = Math.min((p + PARALLEL_BATCHES) * BATCH_SIZE, total);
        setGenerationProgress(prev => ({ 
          ...prev, 
          current: doneCount, 
          statuses: [...statusArr], 
          step: doneCount < total ? `Gerando blocos (${doneCount}/${total})...` : 'Finalizando...' 
        }));
        setPrompts(resultsArr.filter(Boolean).join('\n\n'));
        
        // Pequena pausa para respeitar 15 RPM da chave gratuita
        await new Promise(r => setTimeout(r, 1000));
      }
      
      setIsGenerating(false);
      setIsVerified(true);
      setGenerationProgress(prev => ({ ...prev, step: `✅ ${total} prompts gerados com sucesso!`, current: total }));

      // Save to pool history
      const selectedScript = availableScripts.find(s => s.id === selectedScriptId);
      const poolTitle = (selectedScript ? selectedScript.title : (file?.name || 'Projeto SRM')).toUpperCase();
      const finalContent = resultsArr.filter(Boolean).join('\n\n');
      const newPool = {
        id: Date.now().toString(),
        title: poolTitle,
        context: visualDNA,
        content: finalContent,
        count: total,
        date: new Date().toLocaleString()
      };
      setPromptPools(prev => [newPool, ...prev].slice(0, 50));

      return;
    }

    // ── MODO VEO / JSON: processamento PARALELO por chunk ─────────────────────
    const CHUNK_SIZE = 8;      // 8 legendas por chunk (era 5) — mais dados por chamada = menos chamadas
    const CHUNK_PARALLEL = 6;  // 6 chunks simultâneos (era 3) — flash-lite suporta 30 RPM
    const totalChunks = Math.ceil(subtitleBlocks.length / CHUNK_SIZE);
    setGenerationProgress({ step: 'Processando Legendas...', current: 0, total: totalChunks, statuses: new Array(totalChunks).fill("pending") });
 
    const resultsStorage = new Array(totalChunks).fill("");
    const chunkStatuses  = new Array(totalChunks).fill("pending");

    const isJson = outputFormat === 'json';
    const isVeoVideoMode = promptType === 'video' && genMode === 'quality';

    // Processa UM chunk com retries internos
    const processOneChunk = async (i) => {
      const startIdx = i * CHUNK_SIZE;
      const currentChunk = subtitleBlocks.slice(startIdx, startIdx + CHUNK_SIZE);
      const chunkSubtitleCount = currentChunk.length;
      const formattedInput = currentChunk.map((b, idx) => `[ID ${startIdx + idx + 1}] ${b}`).join('\n');

      const countRuleLang = isVeoVideoMode
        ? `REGRA OBRIGATÓRIA DE CONTAGEM: Gere EXATAMENTE ${chunkSubtitleCount} prompts. Um prompt por bloco de legenda abaixo. Não pule, não junte e não resuma nenhum bloco. Cada [ID X] deve ter seu próprio [PROMPT]:.`
        : `MANDATORY COUNT RULE: You MUST generate EXACTLY ${chunkSubtitleCount} prompts. One prompt per subtitle/legend block below. Do NOT skip, merge, or summarize any block. Each [ID X] must have its own corresponding PROMPT.`;
      const generateLabel = isVeoVideoMode
        ? `GERE EXATAMENTE ${chunkSubtitleCount} PROMPTS VEO 3.1 MAGISTRAIS (PORTUGUÊS DO BRASIL):`
        : `GENERATE EXACTLY ${chunkSubtitleCount} ELITE PROMPTS (ENGLISH ONLY):`;
      const promptParam = `${getSystemPrompt(chunkSubtitleCount)}\n\n---\n${countRuleLang}\nDo NOT generate more or fewer than ${chunkSubtitleCount} prompts.\nYou MUST label each prompt with its subtitle ID using the format [N]: (e.g., [1]:, [2]:, [3]:)\n---\n\nINPUT (CHUNK ${i+1}) - ${chunkSubtitleCount} SUBTITLES:\n${formattedInput}\n\n${generateLabel}`;

      chunkStatuses[i] = "generating";
      setGenerationProgress(prev => ({ ...prev, statuses: [...chunkStatuses] }));

      for (let retryCount = 0; retryCount < 3; retryCount++) {
        if (cancelRef.current) return;
        if (retryCount > 0) {
          const delayTime = 2000;
          chunkStatuses[i] = "retrying";
          setGenerationProgress(prev => ({ ...prev, statuses: [...chunkStatuses], step: `Tentando novamente Bloco ${i+1}...` }));
          await new Promise(r => setTimeout(r, delayTime));
        }
        // Stagger relativo à posição no batch: evita burst, mas não acumula exponencialmente
        if (retryCount === 0 && (i % CHUNK_PARALLEL) > 0) {
          await new Promise(r => setTimeout(r, (i % CHUNK_PARALLEL) * 200));
        }

        try {
          chunkStatuses[i] = "generating";
          const apiKey = getPromptsApiKey() || 'GLOBAL';
          const responseText = await callGemini(apiKey, promptParam, { model: 'gemini-1.5-flash' });
          
          let chunkText = "";
          if (isJson) {
            try {
              const cleanJson = responseText.replace(/```json|```/g, '').trim();
              const jsonStart = cleanJson.indexOf('['); const jsonEnd = cleanJson.lastIndexOf(']');
              chunkText = cleanJson.substring(jsonStart, jsonEnd + 1);
            } catch { chunkText = responseText; }
          } else {
            let parsed = responseText.trim();
            if (promptType === 'video' && (parsed.includes('[PROMPT]:') || parsed.includes('[NEGATIVO]:'))) {
              parsed = parsed.replace(/([^\n]+)\s*\n\s*(\[NEGATIVO\]:)/gi, '$1 $2');
              const cnt = (parsed.match(/\[PROMPT\]:/gi) || []).length;
              if (cnt < chunkSubtitleCount) throw new Error(`Veo: Gerado ${cnt}/${chunkSubtitleCount}. Retry.`);
              chunkText = parsed;
            } else {
              parsed = parsed.replace(/([^\n]+)\s*\n\s*(NEGATIVE PROMPT:)/gi, '$1 $2');
              const byId = (parsed.match(/^\[\d+\]:/gm) || []).length;
              const byN  = (parsed.match(/^\d+\./gm) || []).length;
              const byU  = (parsed.match(/Ultra-Realista/gi) || []).length;
              const cnt  = byId > 0 ? byId : byN > 0 ? byN : byU;
              if (cnt < chunkSubtitleCount) throw new Error(`Bloco ${i+1}: Gerado ${cnt}/${chunkSubtitleCount}. Retry.`);
              chunkText = parsed;
            }
          }

          resultsStorage[i] = chunkText;
          chunkStatuses[i] = "done";
          setPrompts(resultsStorage.filter(Boolean).join('\n\n'));
          setGenerationProgress(prev => ({
            ...prev,
            current: chunkStatuses.filter(s => s === 'done').length,
            statuses: [...chunkStatuses]
          }));
          return; // sucesso — sai do loop de retry

        } catch (err) {
          console.error(`Chunk ${i+1} attempt ${retryCount+1} failed:`, err.message);
          if (retryCount >= 2) {
            resultsStorage[i] = `[ERRO BLOCO ${i+1}: ${err.message}]`;
            chunkStatuses[i] = "error";
            setGenerationProgress(prev => ({ ...prev, statuses: [...chunkStatuses] }));
            setPrompts(resultsStorage.filter(Boolean).join('\n\n'));
          }
        }
      }
    };

    // Processa todos os chunks em lotes paralelos de CHUNK_PARALLEL
    for (let p = 0; p < totalChunks; p += CHUNK_PARALLEL) {
      if (cancelRef.current) break;
      const batch = [];
      for (let b = 0; b < CHUNK_PARALLEL && (p + b) < totalChunks; b++) {
        batch.push(processOneChunk(p + b));
      }
      await Promise.all(batch);
      if (p + CHUNK_PARALLEL < totalChunks) await new Promise(r => setTimeout(r, 100)); // era 200ms
    }

    try {
      
      let finalOutput = "";
      if (outputFormat === 'json') {
          const allJson = [];
          resultsStorage.forEach(res => {
            if (!res || res.startsWith('[ERRO')) return;
            try {
               const cleanJson = res.replace(/```json|```/g, '').trim();
               const jsonStart = cleanJson.indexOf('[');
               const jsonEnd = cleanJson.lastIndexOf(']');
               allJson.push(...JSON.parse(cleanJson.substring(jsonStart, jsonEnd + 1)));
            } catch (e) { console.error("JSON merge error", e); }
          });
          finalOutput = JSON.stringify(allJson, null, 2);
      } else {
          finalOutput = resultsStorage.filter(Boolean).join('\n\n');
      }

      // LIFO Check: Verify and Repair if needed
      let finalContent = finalOutput;
      setGenerationProgress(prev => ({ ...prev, step: 'Iniciando Auditoria LIFO...' }));
      const verif = await runFastVerification(finalOutput);
      
      if (!verif.allOk) {
        setGenerationProgress(prev => ({ 
           ...prev, 
           step: `🚨 TRAMA CORROMPIDA: Corrigindo ${verif.issues.length} blocos com formatação inválida...` 
        }));
        finalContent = await handleAutomaticRepair(finalOutput);
      }

      setPrompts(finalContent);
      setGenerationProgress({ 
        step: 'Geração Concluída!', 
        current: totalChunks, 
        total: totalChunks, 
        statuses: chunkStatuses 
      });

      // Save to pool history
      const selectedScript = availableScripts.find(s => s.id === selectedScriptId);
      const poolTitle = (selectedScript ? selectedScript.title : (file?.name || 'Projeto SRM')).toUpperCase();
      const newPool = {
        id: Date.now().toString(),
        title: poolTitle,
        context: visualDNA,
        content: finalContent,
        count: (finalContent || "").split('\n\n').filter(p => p.trim()).length,
        date: new Date().toLocaleString()
      };
      setPromptPools(prev => [newPool, ...prev].slice(0, 50));

    } catch (error) {
      console.error(error);
      alert("Erro na geração paralela: " + error.message);
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ step: '', current: 0, total: 0 });
    }
  };

  const handleGenerateFromScript = async () => {
    if (!selectedScriptId) return;
    const script = availableScripts.find(s => s.id === selectedScriptId);
    if (!script) return;

    const apiKey = getPromptsApiKey();
    if (!apiKey) {
      alert("⚠️ Chave Gratuita Necessária! Por favor, vá em 'Configurações -> Suas Chaves Pessoais' e insira a sua Google API Key (Criador de Prompts) para utilizar esta ferramenta.");
      return;
    }

    setIsGenerating(true);
    const styleInfo = getActiveStyle();
    setGenerationProgress({ step: 'Analisando Roteiro...', current: 0, total: 0 });

    try {
      const scriptSegments = script.content.match(/[^\.!\?]+[\.!\?]+/g) || [script.content];
      const batchSize = 15;
      const totalBlocks = Math.ceil(scriptSegments.length / batchSize);
      
      setGenerationProgress({ 
        step: 'Iniciando Geração Paralela...', 
        current: 0, 
        total: totalBlocks,
        statuses: new Array(totalBlocks).fill("pending")
      });

      const resultsArray = new Array(totalBlocks).fill("");
      const chunkStatuses = new Array(totalBlocks).fill("pending");

      const PARALLEL_SCRIPT = 6;
      for (let p = 0; p < totalBlocks; p += PARALLEL_SCRIPT) {
        if (cancelRef.current) break;
        const batch = [];
        
        for (let b = 0; b < PARALLEL_SCRIPT && (p + b) < totalBlocks; b++) {
          const i = p + b;
          batch.push((async () => {
            const startIdx = i * batchSize;
            const segment = scriptSegments.slice(startIdx, startIdx + batchSize).join(' ');
     
            // Update status
            chunkStatuses[i] = "generating";
            setGenerationProgress(prev => ({ ...prev, statuses: [...chunkStatuses] }));
     
            const promptBatchQuery = `${getSystemPrompt()}\n\nSCRIPT SEGMENT (BLOCK ${i+1}):\n"${segment}"\n\nGENERATE ELITE PROMPTS (ENGLISH ONLY):`;
     
            // Stagger para não bater 30 RPM instantâneo
            if (b > 0) await new Promise(r => setTimeout(r, b * 200));

            try {
              // Prioriza a chave gratuita para geração de prompts (mesmo em modo roteiro)
              const apiKey = getPromptsApiKey() || 'GLOBAL';
              const batchResult = await callGemini(apiKey, promptBatchQuery);
              
              let processedBatch = "";
              if (genMode === 'quality') {
                processedBatch = (batchResult || "").trim().replace(/PROMPT:\s*([\s\S]*?)\n+\s*NEGATIVE PROMPT:/gim, "PROMPT: $1\nNEGATIVE PROMPT:");
              } else {
                processedBatch = (batchResult || "").split('\n').map(p => p.trim()).filter(p => p.length > 20).join('\n\n');
              }
              
              resultsArray[i] = processedBatch;
              chunkStatuses[i] = "done";
              
              setPrompts(resultsArray.filter(Boolean).join('\n\n'));
    
              return { index: i, content: batchResult };
            } catch (err) {
              resultsArray[i] = `[ERRO BLOCO ${i+1}: ${err.message}]`;
              chunkStatuses[i] = "error";
              return { index: i, error: err.message };
            } finally {
              setGenerationProgress(prev => ({ 
                ...prev, 
                current: Math.min(prev.current + 1, totalBlocks),
                statuses: [...chunkStatuses],
                step: `Gerando blocos... (${Math.min(prev.current + 1, totalBlocks)}/${totalBlocks})`
              }));
            }
          })());
        }
        
        await Promise.all(batch);
        // Pequena pausa entre batches para alívio da API
        if (p + PARALLEL_SCRIPT < totalBlocks) await new Promise(r => setTimeout(r, 500));
      }
      const finalPrompts = resultsArray.filter(Boolean).join('\n\n');
      setPrompts(finalPrompts);

      // LIFO Check: Verify and Repair if needed
      let finalContent = finalPrompts;
      const verif = await runFastVerification(finalPrompts);
      if (!verif.allOk) {
        finalContent = await handleAutomaticRepair(finalPrompts);
      }

      const newPool = {
        id: Date.now().toString(),
        title: script.title.toUpperCase(),
        context: visualDNA,
        content: finalContent,
        count: (finalContent || "").split('\n\n').filter(p => p.trim()).length,
        date: new Date().toLocaleString()
      };
      setPromptPools(prev => [newPool, ...prev].slice(0, 50));
    } catch (error) {
      alert("Erro na geração paralela de roteiro: " + error.message);
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ step: '', current: 0, total: 0 });
    }
  };

  const handleCopyPrompts = () => { 
    if (prompts) {
      navigator.clipboard.writeText(prompts);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!prompts) return;
    const ext = outputFormat === 'json' ? 'json' : 'txt';
    const mimeType = outputFormat === 'json' ? 'application/json' : 'text/plain';
    const blob = new Blob([prompts], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prompts_${getActiveStyle().id}_${file?.name || 'project'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* const handleTransferToFlow = () => {
    if (!prompts) return;
    localStorage.setItem('guru_flow_transfer', prompts);
    if (setActiveTab) setActiveTab('whisk');
  }; */

  return (
    <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto font-sans overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-8 pb-12 pt-4 px-4 md:px-8 [&>*]:shrink-0">
      <header className="mb-12">
        <h2 className="text-3xl md:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-pink to-neon-purple p-[2px] shadow-[0_0_20px_rgba(255,44,182,0.3)]">
            <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          Gerador de Prompts
        </h2>
        <p className="text-gray-400 mt-3 font-bold text-sm uppercase tracking-[0.2em] border-l-4 border-neon-pink pl-4 ml-2 italic">
          Engenharia de Prompts de Alta Fidelidade para Vídeos e Imagens
        </p>
      </header>

        {/* Script Selection & Automation Bar */}
        <div className="p-4 glass-card border-neon-purple/20 flex flex-wrap items-center gap-4">
           <div className="flex items-center gap-3 mr-4">
              <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center border border-neon-purple/20">
                 <FileText className="w-4 h-4 text-neon-purple" />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fidelidade Máxima</span>
           </div>
           
           <select 
              value={selectedScriptId}
              onChange={(e) => setSelectedScriptId(e.target.value)}
              className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-gray-400 focus:outline-none focus:border-neon-purple/50 hover:bg-white/10 transition-all cursor-pointer"
           >
              <option value="">-- MEUS PROJETOS SALVOS --</option>
              {(cloudScripts.length > 0 ? cloudScripts : availableScripts).map(s => (
                 <option key={s.id} value={s.id} className="bg-dark text-white">{s.title}</option>
              ))}
           </select>

           {/* Visual DNA Image Reference */}
           <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleImageUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => imageInputRef.current?.click()}
              className={`ml-auto flex items-center gap-3 px-4 py-2 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                referenceImage 
                  ? 'border-neon-cyan/50 bg-neon-cyan/10' 
                  : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
              }`}
           >
              <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
              
              {isAnalyzingImage ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-neon-cyan animate-spin" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest leading-tight">Extraindo DNA...</span>
                    <span className="text-[8px] text-gray-400 uppercase tracking-wider">Visão Cirúrgica IA</span>
                  </div>
                </div>
              ) : referenceImage ? (
                <div className="flex items-center gap-3">
                  <img src={referenceImage} alt="Referência" className="w-8 h-8 object-cover rounded-lg border border-neon-cyan/30" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-neon-cyan uppercase tracking-widest leading-tight">DNA Visual Capturado</span>
                    <span className="text-[8px] text-gray-400 uppercase tracking-wider hover:text-white">Clique para trocar imagem</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex flex-col text-left">
                     <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-tight">Referência Visual (Opcional)</span>
                     <span className="text-[8px] text-gray-500 uppercase tracking-wider">Cole (Ctrl+V) ou clique</span>
                  </div>
                </div>
              )}
           </div>
           {analyzeError && (
              <div className="w-full mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[10px] font-bold uppercase tracking-wider text-center animate-pulse">
                {analyzeError}
              </div>
           )}
        </div>

        {/* Visual DNA Pre-Production Panel */}
        <AnimatePresence>
          {visualDNA.scenario && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 border-neon-cyan/30 bg-neon-cyan/5 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <header>
                  <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-neon-cyan" /> 
                    Painel de Pré-Produção — <span className="text-neon-cyan">Identidade Visual Confirmada</span>
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">O Diretor AI definiu as leis visuais do seu projeto. Ajuste se necessário.</p>
                </header>
                <button onClick={() => setVisualDNA({ scenario: '', era: '', mood: '', lighting: '', palette: '', camera: '' })} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'scenario', label: 'Cenário Global', icon: ImageIcon },
                  { id: 'era', label: 'Época/Ambiente', icon: FileText },
                  { id: 'mood', label: 'Atmosfera/Mood', icon: Sparkles },
                  { id: 'lighting', label: 'Iluminação Master', icon: Zap },
                  { id: 'palette', label: 'Paleta de Cores', icon: File },
                  { id: 'camera', label: 'Linguagem de Câmera', icon: Wand2 }
                ].map(field => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <field.icon className="w-3 h-3 text-neon-cyan" /> {field.label}
                    </label>
                    <textarea 
                      value={visualDNA[field.id]}
                      onChange={(e) => updateDNAField(field.id, e.target.value)}
                      className="w-full bg-dark/40 border border-white/10 rounded-lg p-3 text-xs text-gray-300 focus:outline-none focus:border-neon-cyan/50 h-20 custom-scrollbar resize-none font-medium leading-relaxed"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-neon-cyan/10 border border-neon-cyan/20 rounded-xl">
                 <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-neon-cyan" />
                 </div>
                 <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Identidade Visual Ativa. Todos os <b>{subtitleCount} prompts</b> seguirão estas diretrizes.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Output Format Controls */}
      <div className="glass-card p-5 space-y-0">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-white/10 pb-4 mb-0">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neon-pink" /> 
            Formato de Saída
          </h3>

          <div className="flex flex-wrap items-center gap-3">
{/* Prompt Type toggle removido — modo imagem fixo */}

            {/* Output Format: Normal / JSON */}
            <div className="flex bg-dark/50 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setOutputFormat('text')}
                className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  outputFormat === 'text'
                    ? 'bg-neon-cyan/80 text-dark shadow-[0_0_15px_rgba(0,243,255,0.3)]'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" /> Normal
              </button>
              <button
                onClick={() => setOutputFormat('json')}
                className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  outputFormat === 'json'
                    ? 'bg-amber-500/80 text-dark shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4" /> JSON
              </button>
            </div>

            {/* Speech Mode: Com Fala / Sem Fala */}
            <div className="flex bg-dark/50 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setPromptState(prev => ({ ...prev, speechMode: 'true' }))}
                className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  promptState.speechMode === 'true'
                    ? 'bg-green-500/80 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4" /> Com Fala
              </button>
              <button
                onClick={() => setPromptState(prev => ({ ...prev, speechMode: 'false' }))}
                className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  promptState.speechMode === 'false'
                    ? 'bg-red-500/80 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" /> Sem Fala
              </button>
            </div>
          </div>
        </div>
      </div>




      {/* Generation Area Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Upload and Controls */}
        <div className="space-y-6">
          {/* MODO DE PRODUÇÃO SELECTOR */}
          <div className="glass-card p-4 border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                     <Wand2 className="w-3 h-3" /> Modo de Produção
                  </h3>
                  <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">Defina o equilíbrio entre rapidez e fidelidade</p>
               </div>
               <div className="flex gap-2">
   {/* Velocidade button removido — modo Elite fixo */}
                  <button 
                    onClick={() => setGenMode('quality')}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                      genMode === 'quality' 
                        ? 'bg-neon-pink/20 border-neon-pink text-neon-pink shadow-[0_0_15px_rgba(255,44,182,0.2)]' 
                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'
                    } border`}
                  >
                    <Sparkles className="w-3 h-3" /> Elite Qualidade
                  </button>
               </div>
            </div>

            <div className="p-3 rounded-lg bg-dark-lighter/50 border border-white/5">
               <p className="text-[9px] text-gray-400 italic">
                  {genMode === 'fast' 
                    ? "🚀 Modo Velocidade: Gera prompts concisos e cinematográficos otimizados para rapidez de produção." 
                    : "💎 Modo Elite Qualidade: Gera prompts ultra detalhados (Gold Standard) com especificações de lentes, cinematografia analógica e prompts negativos incluídos."}
               </p>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`glass-card p-10 flex flex-col items-center justify-center border-2 border-dashed cursor-pointer transition-all duration-300 relative overflow-hidden group
              ${isDragging ? 'border-neon-pink bg-neon-pink/10' : file ? 'border-green-500/50 bg-green-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}
            `}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".srt,.txt" onChange={handleFileInput} />
            {file ? (
              <>
                <button 
                  onClick={handleClearFile}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all z-10 border border-red-500/20 shadow-lg"
                  title="Remover Arquivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="absolute inset-0 bg-green-500/5 pointer-events-none" />
                <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
                <h3 className="text-lg font-bold text-green-400">{file.name}</h3>
                <p className="text-green-400/70 mt-1 text-sm">{subtitleCount} cenas encontradas — clique para trocar</p>
              </>
            ) : (
              <>
                <UploadCloud className={`w-12 h-12 mb-3 ${isDragging ? 'text-neon-pink' : 'text-gray-400 group-hover:text-white transition-colors'}`} />
                <h3 className="text-lg font-bold text-white mb-1">Upload de Legendas</h3>
                <p className="text-gray-400 text-center text-sm">Arraste e solte seu arquivo .srt ou .txt<br/>ou clique para procurar</p>
              </>
            )}
          </div>

          {file && (
            <div className="glass-card p-4 flex justify-between items-center bg-dark-lighter/30">
              <div className="text-center w-1/2 border-r border-white/10">
                <p className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Cenas</p>
                <p className="text-2xl font-bold text-white">{subtitleCount}</p>
              </div>
              <div className="text-center w-1/2">
                <p className="text-neon-pink/80 text-xs mb-1 uppercase tracking-wider">Prompts</p>
                <p className="text-2xl font-bold text-neon-pink text-glow-pink">{subtitleCount}</p>
              </div>
            </div>
          )}

          {isGenerating && generationProgress.statuses && (
            <div className="p-4 glass-card border-white/5 mb-6 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                <span>Processamento em Lote</span>
                <span className="text-neon-pink animate-pulse">Ativo</span>
              </div>
              <div className="flex flex-col items-center justify-center py-6 bg-dark-lighter/30 rounded-xl border border-white/5 shadow-inner">
                <div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2">
                  <span className="text-neon-pink text-glow-pink">{(prompts || "").split(/\n\n+/).filter(p => p.trim().length > 20).length}</span>
                  {subtitleCount > 0 && <span className="text-xl text-gray-500">/ {subtitleCount}</span>}
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 animate-pulse">
                  Prompts Gerados
                </p>
              </div>
              <p className="text-[10px] text-center text-gray-500 font-bold italic mt-2">
                {generationProgress.step}
              </p>
            </div>
          )}

          {/* Aviso: chave gratuita não configurada */}
          {!configs.gemini_prompts_key && !configs.google_script_key && (
            <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-neon-pink/5 border border-neon-pink/20">
              <span className="text-neon-pink text-lg shrink-0">💡</span>
              <div>
                <p className="text-neon-pink font-black text-xs uppercase tracking-widest mb-1">Dica: Configure sua Google API Key gratuita</p>
                <p className="text-gray-400 text-[10px] leading-relaxed">
                  Adicione sua <span className="font-bold text-white">Google API Key</span> gratuita em{' '}
                  <strong>Configurações → Suas Chaves Pessoais</strong> para ampliar os limites do{' '}
                  <strong className="text-neon-pink">Criador de Prompts</strong>.{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline text-neon-cyan">Obter chave ↗</a>
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <button
                onClick={() => {
                   if (file || subtitleBlocks.length > 0) handleGenerate();
                   else alert("⚠️ Selecione um roteiro ou carregue uma legenda primeiro.");
                }}
                disabled={(isGenerating) || (!file && subtitleBlocks.length === 0)}
                className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 ${
                  (isGenerating) || (!file && subtitleBlocks.length === 0)
                    ? 'bg-white/5 border border-white/5 text-gray-600 cursor-not-allowed grayscale opacity-50'
                    : 'bg-gradient-to-r from-pink-600 to-neon-purple text-white hover:shadow-neon-pink hover:scale-[1.02] shadow-[0_0_20px_rgba(255,44,182,0.4)]'
                }`}
              >
                {isGenerating ? (
                  <LoadingSpinner 
                    message={generationProgress.step || `Processando...`} 
                    size="sm" 
                  />
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 shadow-neon animate-pulse" /> 
                    Gerar Prompts do Projeto
                  </>
                )}
              </button>

              {prompts && !isGenerating && (
                <button
                  onClick={handleGenerate}
                  className="px-4 py-4 rounded-xl flex items-center justify-center gap-2 font-bold bg-white/10 text-white hover:bg-white/20 border border-white/20"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
              {isGenerating && (
                 <button
                   onClick={() => { cancelRef.current = true; setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }}
                   className="px-4 py-4 rounded-xl flex items-center justify-center gap-2 font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 transition-all hover:text-white hover:bg-red-500"
                   title="Cancelar Geração"
                 >
                   {isCopied ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
                 </button>
              )}
            </div>

            <div className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 border border-white/5 bg-white/5 text-gray-500`}>
              <ImageIcon className="w-5 h-5 opacity-30" /> Pronto para Produção Visual
            </div>
          </div>
        </div>

        {/* Right: Output Area */}
        <div className="glass-card flex flex-col min-h-[400px] lg:h-full overflow-hidden group/output relative">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
            <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-widest">
              <File className="w-5 h-5 text-neon-pink" />
              Saída Gerada
            </h3>
            <div className="flex gap-2">
              {prompts && (
                <button 
                  onClick={handleClearPrompts}
                  className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                >
                  Limpar
                </button>
              )}
              {isVerifying ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                  <Loader2 className="w-3 h-3 animate-spin text-neon-cyan" />
                  <span className="text-[8px] font-black text-neon-cyan uppercase tracking-widest">Analisando...</span>
                </div>
              ) : isRepairing ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-neon-pink/10 border border-neon-pink/30 rounded-lg">
                  <RefreshCw className="w-3 h-3 animate-spin text-neon-pink" />
                  <span className="text-[8px] font-black text-neon-pink uppercase tracking-widest">Corrigindo {errorCount} Erros...</span>
                </div>
              ) : prompts && !isGenerating && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${isVerified ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                   {isVerified ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                   <span className="text-[8px] font-black uppercase tracking-widest">
                     {isVerified ? 'Fidelidade Máxima: OK' : `Encontrado: ${errorCount} Erros de Formato`}
                   </span>
                </div>
              )}
              {prompts && !isGenerating && (
                <button 
                  onClick={handleCopyPrompts}
                  disabled={!isVerified || isRepairing}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                    !isVerified || isRepairing
                      ? 'bg-gray-800 border-white/5 text-gray-600 cursor-not-allowed'
                      : isCopied 
                        ? 'bg-green-500/20 border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                  }`}
                >
                   {isCopied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                   {isCopied ? 'Copiado!' : 'Copiar'}
                </button>
              )}
              {prompts && !isGenerating && (
                <button 
                  onClick={handleDownload}
                  disabled={!isVerified}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${
                    !isVerified 
                      ? 'bg-gray-800 border-white/5 text-gray-600 cursor-not-allowed'
                      : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20'
                  }`}
                >
                  <Download className="w-3 h-3" /> .{outputFormat === 'json' ? 'JSON' : 'TXT'}
                </button>
              )}
              <button 
                onClick={() => prompts && setShowFullOutput(true)}
                disabled={!prompts}
                className="px-3 py-1 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-white hover:border-white/30 transition-all disabled:opacity-30"
              >
                Visualizar
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-hidden bg-dark-lighter/50 font-mono text-sm leading-relaxed text-gray-300 relative group/output">
            {/* SCANNER LINE ANIMATION */}
            {showScanner && (
              <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-neon-pink to-transparent z-50 animate-scan-vertical shadow-[0_0_15px_rgba(255,44,182,0.8)]" />
            )}

            {/* DIAGNOSTIC CONSOLE OVERLAY */}
            <AnimatePresence>
              {repairLogs.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-4 left-4 right-4 z-[60] bg-dark/90 backdrop-blur-md border border-neon-pink/30 rounded-2xl p-4 shadow-2xl max-h-[150px] overflow-hidden flex flex-col pointer-events-none"
                >
                   <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
                         <span className="text-[10px] font-black text-white uppercase tracking-widest">Agente de Integridade: Diagnóstico</span>
                      </div>
                      <span className="text-[9px] font-black text-neon-pink/50 uppercase tracking-widest italic">{isRepairing ? "Corrigindo..." : "Finalizado"}</span>
                   </div>
                   <div className="space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
                      {repairLogs.map((log, idx) => (
                        <div key={idx} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                           <div className="w-1 h-1 rounded-full bg-white/20" />
                           <p className={`text-[10px] font-bold ${log.includes('✓') || log.includes('✨') ? 'text-green-400' : log.includes('🚨') ? 'text-neon-pink' : 'text-gray-400'}`}>
                             {log}
                           </p>
                        </div>
                      ))}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>

            {prompts ? (
              <div className={`transition-all duration-700 ${showScanner ? 'blur-[1px] opacity-70 scale-[0.99]' : 'blur-0 opacity-100 scale-100'}`}>
                <div className="h-full overflow-hidden italic line-clamp-[12] text-gray-500 opacity-50 select-none">
                  {prompts}
                </div>
                {/* Overlay Button */}
                {!isRepairing && (
                  <div 
                    onClick={() => setShowFullOutput(true)}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-dark/60 opacity-0 group-hover/output:opacity-100 transition-all cursor-pointer backdrop-blur-[2px] space-y-3"
                  >
                     <div className="w-14 h-14 rounded-2xl bg-neon-cyan text-dark flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.4)] transform translate-y-4 group-hover/output:translate-y-0 transition-transform">
                        <Eye className="w-7 h-7" />
                     </div>
                     <span className="text-xs font-black text-white uppercase tracking-[0.3em] transform translate-y-4 group-hover/output:translate-y-0 transition-transform delay-75">Visualizar Prompts</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-dark-lighter to-transparent pointer-events-none" />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 italic space-y-4">
                {isGenerating ? (
                  <LoadingSpinner message={generationProgress.step || "Refinando prompts..."} size="md" />
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 opacity-20" />
                    <p className="text-[10px] uppercase tracking-widest">Seus prompts aparecerão aqui...</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULL SCREEN VIEWER MODAL */}
      <AnimatePresence>
        {showFullOutput && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-dark/95 backdrop-blur-3xl overflow-hidden">
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="w-full max-w-6xl h-full bg-dark-lighter/50 border border-white/10 rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
            >
               {/* Modal Header */}
               <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-neon-pink to-neon-purple p-[2px] shadow-xl">
                        <div className="w-full h-full bg-dark rounded-3xl flex items-center justify-center">
                           <ImageIcon className="w-8 h-8 text-white" />
                        </div>
                     </div>
                     <div>
                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">Pool de Prompts Gerado</h2>
                        <p className="text-[10px] font-black text-neon-pink uppercase tracking-widest mt-1">Alta Fidelidade & Coesão Visual Ativada</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <button 
                       onClick={handleCopyPrompts}
                       className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all transform active:scale-95 shadow-lg flex items-center gap-3 ${
                         isCopied 
                           ? 'bg-green-500 text-white' 
                           : 'bg-white text-dark hover:bg-white/90'
                       }`}
                     >
                        {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {isCopied ? 'Copiado com Sucesso!' : 'Copiar Tudo'}
                     </button>
                     <button 
                       onClick={() => setShowFullOutput(false)}
                       className="w-14 h-14 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-500 hover:text-white flex items-center justify-center transition-all"
                     >
                        <X className="w-6 h-6" />
                     </button>
                  </div>
               </div>

               {/* Modal Content */}
               <div className="flex-1 overflow-y-auto p-10 custom-scrollbar font-mono text-base leading-loose text-gray-400 whitespace-pre-wrap selection:bg-neon-pink selection:text-white">
                  {prompts}
               </div>

               {/* Modal Footer Actions */}
               <div className="p-8 bg-dark/60 border-t border-white/5 flex flex-col md:flex-row gap-6 backdrop-blur-xl">
                   <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Total de Sequências</p>
                      <p className="text-xl font-black text-white text-glow-pink">
                         {(prompts || "").split('\n\n').filter(p => p.trim()).length} Peças Visuais
                      </p>
                   </div>
                  <div className="flex items-center gap-4">
                     <button 
                        onClick={handleDownload}
                        className="px-8 py-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3"
                     >
                        <Download className="w-5 h-5 text-neon-cyan" /> Baixar .TXT
                     </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prompt Pools History Section */}
      <div className="pt-12 border-t border-white/10 space-y-8 pb-10">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-neon-pink/10 flex items-center justify-center border border-neon-pink/20">
                  <RefreshCw className="w-5 h-5 text-neon-pink" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Pools de Prompts Recentes</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Sua qualidade e formatos salvos automaticamente</p>
               </div>
            </div>
            {promptPools.length > 0 && (
               <button 
                  onClick={() => {
                     if(confirm("Limpar todo o histórico?")) {
                        setPromptPools([]);
                     }
                  }}
                  className="text-[10px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest flex items-center gap-2"
               >
                  <Trash2 className="w-3 h-3" /> Limpar Tudo
               </button>
            )}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Array.isArray(promptPools) ? [...promptPools, ...Array(Math.max(0, 6 - promptPools.length)).fill(null)] : Array(6).fill(null)).map((pool, idx) => (
               pool ? (
                  <div
                     key={pool.id}
                     className="glass-card group relative border border-white/5 hover:border-neon-pink/40 transition-all p-6 space-y-5 bg-dark-lighter/40"
                  >
                     <div className="flex justify-between items-start">
                        <div className="space-y-1 min-w-0">
                           <h4 className="text-sm font-black text-white group-hover:text-neon-pink transition-colors truncate uppercase">{pool.title}</h4>
                           <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{pool.date}</p>
                        </div>
                        <button 
                           onClick={() => setPromptPools(prev => prev.filter(p => p.id !== pool.id))}
                           className="text-gray-700 hover:text-red-500"
                        >
                           <Trash2 className="w-3.5 h-3.5" />
                        </button>
                     </div>

                     <div className="p-3 bg-dark/60 rounded-xl border border-white/5 space-y-2 h-[80px]">
                        <div className="flex items-center gap-2">
                           <Sparkles className="w-3 h-3 text-neon-pink" />
                           <span className="text-[9px] font-black text-neon-pink uppercase tracking-widest">PROMPTS GERADOS</span>
                        </div>
                        <p className="text-[10px] text-gray-400 italic line-clamp-3 leading-[1.4] overflow-hidden">
                           {(pool.content || "").substring(0, 200).replace(/\n/g, ' ')}...
                        </p>
                     </div>

                     <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-pink/10 border border-neon-pink/20 rounded-lg">
                           <span className="text-[10px] font-black text-neon-pink">{pool.count} Prompts</span>
                        </div>
                        <div className="flex gap-2">
                           <button 
                              onClick={() => handleCopyHistory(pool.content, pool.id)}
                              className={`p-2 rounded-lg border transition-all active:scale-95 flex items-center justify-center
                                ${copyingId === pool.id 
                                  ? 'bg-green-500/20 border-green-500 text-green-400' 
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}
                              `}
                           >
                              {copyingId === pool.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                           </button>
                           <button 
                              onClick={() => { setPrompts(pool.content); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="px-4 py-2 bg-white text-dark rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-neon-pink hover:text-white transition-all shadow-lg"
                           >
                              Selecionar
                           </button>
                        </div>
                     </div>
                  </div>
               ) : (
                  <div key={`empty-${idx}`} className="h-[220px] rounded-[32px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-gray-800 opacity-20">
                     <ImageIcon className="w-8 h-8 mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest">Slot Disponível</span>
                  </div>
               )
            ))}
         </div>
      </div>
      </div>
    </div>
  );
};
