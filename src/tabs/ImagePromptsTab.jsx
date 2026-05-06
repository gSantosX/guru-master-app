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

const getPromptsApiKey = (configs) => {
  // Priority: exclusive prompts key > gemini key from localStorage > configs object
  const exclusiveKey = localStorage.getItem('guru_gemini_prompts_key');
  if (exclusiveKey) return exclusiveKey;
  const geminiKey = localStorage.getItem('guru_gemini_key');
  if (geminiKey) return geminiKey.split(',')[0].trim(); // first key if multiple
  // Fallback to configs object (loaded from Supabase via SystemStatusContext)
  if (configs?.gemini_prompts_key) return configs.gemini_prompts_key;
  if (configs?.gemini_key) return configs.gemini_key.split(',')[0].trim();
  return '';
};

// --- TURBO ENGINE: DNA Cache ---
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'dna_' + Math.abs(hash).toString(36);
};

const getDNACache = (scriptContent) => {
  const key = hashString(scriptContent.substring(0, 2000));
  try {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch {}
  return null;
};

const setDNACache = (scriptContent, dna) => {
  const key = hashString(scriptContent.substring(0, 2000));
  try {
    localStorage.setItem(key, JSON.stringify(dna));
  } catch {}
};

// --- TURBO ENGINE: Adaptive Delay ---
const getAdaptiveDelay = (apiKey) => {
  try {
    const now = Date.now();
    const history = JSON.parse(localStorage.getItem(`guru_gemini_history_${apiKey}`) || '[]');
    const rpm = history.filter(t => now - t < 61000).length;
    if (rpm < 8) return 1000;
    if (rpm <= 12) return 3000;
    return 8000;
  } catch { return 2000; }
};


export const ImagePromptsTab = ({ setActiveTab, isActive = true }) => {
  const { status, configs } = useSystemStatus();
  const [cloudScripts] = useCloudStorage('scripts', []);

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
  const [isCopied, setIsCopied] = useState(false);
  const [promptType, setPromptType] = useState('image'); // 'image' or 'video'
  const [outputFormat, setOutputFormat] = useState('text'); // 'text' or 'json'
  const fileInputRef = useRef(null);
  const refImageInputRef = useRef(null);
  const cancelRef = useRef(false);
  const [generationProgress, setGenerationProgress] = useState({ step: '', current: 0, total: 0, statuses: [] });
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairLogs, setRepairLogs] = useState([]);
  const [showScanner, setShowScanner] = useState(false);

  // --- REFERENCE IMAGE STYLE ---
  const [refImagePreview, setRefImagePreview] = useState(null);
  const [refImageStyle, setRefImageStyle] = useState('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // --- REFERENCE IMAGE: Analyze visual style ---
  const analyzeReferenceImage = async (base64Data, mimeType) => {
    setIsAnalyzingImage(true);
    try {
      const apiKey = getPromptsApiKey(configs);
      if (!apiKey) throw new Error('API Key ausente!');
      const cleanPath = 'models/gemini-2.0-flash-lite';
      const res = await fetch(resolveApiUrl(`/api/gemini/v1beta/${cleanPath}:generateContent?key=${apiKey}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [
            { text: `You are an elite Cinematography Director. Analyze this reference image and extract a COMPLETE VISUAL STYLE DESCRIPTION in English that can be used to replicate this exact aesthetic in AI-generated images/videos.

EXTRACT:
1. COLOR PALETTE: Dominant colors, color temperature, saturation level
2. LIGHTING: Type (natural/artificial), direction, intensity, shadows, contrast
3. MOOD/ATMOSPHERE: Emotional tone, ambiance, feeling
4. COMPOSITION: Framing style, perspective, depth
5. TEXTURE & GRAIN: Film grain, noise, sharpness, post-processing
6. CAMERA STYLE: Lens type estimate, depth of field, focus style

Return a SINGLÊS PARAGRAPH in English describing the visual style as a unified cinematographic direction. Be specific and technical. Max 150 words.` },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ]}],
          generationConfig: { maxOutputTokens: 500, temperature: 0.2 }
        })
      });
      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const style = data.candidates[0].content.parts[0].text.trim();
        setRefImageStyle(style);
        return style;
      }
      throw new Error(data.error?.message || 'Falha na an�lise da imagem');
    } catch (err) {
      console.error('Image analysis error:', err);
      alert('Erro ao analisar imagem: ' + err.message);
      return '';
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleRefImageUpload = (uploadedFile) => {
    if (!uploadedFile || !uploadedFile.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setRefImagePreview(dataUrl);
      // Extract base64 and mime type
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)[1];
      analyzeReferenceImage(base64, mimeType);
    };
    reader.readAsDataURL(uploadedFile);
  };

  const clearRefImage = () => {
    setRefImagePreview(null);
    setRefImageStyle('');
    if (refImageInputRef.current) refImageInputRef.current.value = '';
  };

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

  const analyzeVisualIdentity = async (forceScriptId = null, overrideScripts = null) => {
    let scriptToAnalyze = "";
    const targetId = forceScriptId || selectedScriptId;

    console.log("�x� [DNA_DEBUG] Iniciando análise para ID:", targetId);

    if (targetId) {
      // Look in all possible sources: cloudScripts hook, availableScripts state, and localStorage
      const allSources = [
        ...(overrideScripts || []),
        ...(cloudScripts || []),
        ...(availableScripts || []),
      ];

      // Deduplicate by id, keeping first occurrence
      const seen = new Set();
      const merged = allSources.filter(s => {
        if (!s?.id) return false;
        const k = String(s.id);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      let script = merged.find(s => String(s.id) === String(targetId));

      if (!script) {
        console.warn("�a�️ [DNA_DEBUG] Script não encontrado no estado. Lendo localStorage...");
        const freshScripts = JSON.parse(localStorage.getItem('guru_cloud_scripts') || '[]');
        script = freshScripts.find(s => String(s.id) === String(targetId));
      }

      if (script) {
        scriptToAnalyze = script.content;

        // AUTO-INJECT VEO FROM SCRIPT IF NO FILE IS PRESENT
        if (!file && script.content) {
          const veoData = generateVeoContent(script.content);
          const parts = veoData.split(/\n\s*\n/).filter(p => p.trim());
          const blocks = parts.map(p => {
            const lines = p.trim().split('\n');
            if (lines.length >= 3) return lines.slice(2).join(' ').trim();
            return p.trim();
          });
          setSubtitleBlocks(blocks);
          setSubtitleCount(blocks.length);
          setFile({ name: `Legenda_VEO_${script.title || targetId}.veo`, size: veoData.length });
          setPrompts("");
        }
      } else {
        console.error("�R [DNA_DEBUG] Script ID não encontrado em nenhuma fonte:", targetId);
      }
    } else if (subtitleBlocks.length > 0) {
      scriptToAnalyze = subtitleBlocks.slice(0, 50).join('\n');
    }


    if (!scriptToAnalyze) {
      alert("�a��  Selecione um roteiro ou carregue uma legenda primeiro.");
      return;
    }

    // TURBO ENGINE: DNA Cache  skip API call if same script was analyzed before
    const cachedDNA = getDNACache(scriptToAnalyze);
    if (cachedDNA) {
      console.log("� [TURBO] DNA Cache HIT  pulando chamada API");
      setVisualDNA(cachedDNA);
      if (cachedDNA.rec_genero) setGenero(cachedDNA.rec_genero);
      if (cachedDNA.rec_camera) setCameraMovimento(cachedDNA.rec_camera);
      if (cachedDNA.rec_composicao) setComposicao(cachedDNA.rec_composicao);
      if (cachedDNA.rec_foco) setFocoLente(cachedDNA.rec_foco);
      if (cachedDNA.rec_atmosfera) setAtmosferaLuz(cachedDNA.rec_atmosfera);
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysisPrompt = `Você é um Diretor de Arte e de Fotografia de elite especializado em Cinema. 
      ANALISE O ROTEIRO ABAIXO PARA EXTRAIR A IDENTIDADE VISUAL MESTRE E RECOMENDAR OS PAR�METROS CINEMATOGRÁFICOS IDEAIS.
      
      FOCO DA ANÁLISE:
      1. CENÁRIOS: Identifique os locais, arquitetura, texturas dominantes.
      2. ÉPOCA/AMBIENTE: Período exato ou estilo temporal.
      3. ATMOSFERA (MOOD): Carga emocional visual.
      4. ILUMINAÇÃO: Estilo de luz e temperatura.
      5. PALETA: 3 cores mestre.
      6. CÂMERA: Lentes e movimentos recomendados.

      ALÉM DISSO, selecione as TAGS mais adequadas entre estas opções (responda exatamente os nomes das tags):
      - GÊNERO: Ficção científica, Film noir, Terror, Animação 3D, Documentário, Fantasia épica, Retrato cinematográfico, Anime
      - CÂMERA: Vista aérea, Na altura dos olhos, Vista de cima, Vista de baixo, Travelling, Câmera lenta, Zoom in, Pan lateral
      - COMPOSIÇÃO: Plano geral, Close-up, Plano médio, Retrato, Plano único, Plano duplo
      - FOCO: Foco raso, Foco profundo, Lente macro, Grande-angular, Filtro difusor, Teleobjetiva
      - ATMOSFERA: Tons azuis frios, Tons quentes dourados, Noite estrelada, Luz neon, Pôr do sol, Névoa, Chuva, Alta exposição
      RETORNE APENAS UM JSON NO FORMATO:
      {
        "scenario": "...", "era": "...", "mood": "...", "lighting": "...", "palette": "...", "camera": "...",
        "rec_genero": "uma tag",
        "rec_camera": ["tag1", "tag2"],
        "rec_composicao": ["tag1"],
        "rec_foco": ["tag1"],
        "rec_atmosfera": ["tag1", "tag2"]
      }

      ROTEIRO:
      ${scriptToAnalyze.substring(0, 4500)}`;

      const response = await callGemini(getPromptsApiKey(configs), analysisPrompt, { 
        model: 'gemini-2.0-flash-lite', 
        temperature: 0.1
      });
      const cleanJson = response.replace(/```json\n?|```/g, '').trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido.');
      const dna = JSON.parse(jsonMatch[0]);
      
      setVisualDNA(dna);
      setDNACache(scriptToAnalyze, dna); // TURBO: Cache for future reuse
      
      // AUTO-SELECT RECOMMENDED TAGS
      if (dna.rec_genero) setGenero(dna.rec_genero);
      if (dna.rec_camera) setCameraMovimento(dna.rec_camera);
      if (dna.rec_composicao) setComposicao(dna.rec_composicao);
      if (dna.rec_foco) setFocoLente(dna.rec_foco);
      if (dna.rec_atmosfera) setAtmosferaLuz(dna.rec_atmosfera);

    } catch (error) {
      console.error("Erro na análise visual:", error);
      alert("�R Falha na Análise Critica: " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    loadScripts();
    setPromptPools(stackRead('guru_image_prompt_pools'));
    window.addEventListener('guru_scripts_updated', loadScripts);
    return () => window.removeEventListener('guru_scripts_updated', loadScripts);
  }, []);

  // AUTO-INJECT VEO FROM SCRIPT SELECTION
  useEffect(() => {
    if (!selectedScriptId) {
      setFile(null);
      setSubtitleBlocks([]);
      setSubtitleCount(0);
      return;
    }

    const allSources = [...(cloudScripts || []), ...(availableScripts || [])];
    const script = allSources.find(s => String(s.id) === String(selectedScriptId)) || 
                   JSON.parse(localStorage.getItem('guru_cloud_scripts') || '[]').find(s => String(s.id) === String(selectedScriptId));
    
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
    }
  }, [selectedScriptId, cloudScripts, availableScripts]);

  useEffect(() => {
    if (isActive) {
      const triggerId = localStorage.getItem('guru_image_prompt_trigger_id');
      const autoAnalyze = localStorage.getItem('guru_image_prompt_auto_analyze');
      
      if (triggerId) {
        setSelectedScriptId(triggerId);
        localStorage.removeItem('guru_image_prompt_trigger_id');
        
        const veoContent = localStorage.getItem('guru_image_prompt_veo_content');
        if (veoContent) {
           localStorage.removeItem('guru_image_prompt_veo_content');
        }

        if (autoAnalyze === 'true') {
          localStorage.removeItem('guru_image_prompt_auto_analyze');
          const currentScripts = loadScripts(); 
          setTimeout(() => {
            analyzeVisualIdentity(triggerId, currentScripts);
          }, 1000);
        }
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

      // FOR�!AR A REGRA ABSOLUTA DE 16-22 PALAVRAS EM ARQUIVOS ANEXADOS!
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
            const wordCount = block.split(/\s+/).filter(w => w.length > 0).length;
            
            if (isVeoFormat) {
              // Veo 3.1 format: [PROMPT]: and [NEGATIVO]: must exist on the same line
              const promptLine = block.split('\n').find(l => /\[PROMPT\]:/i.test(l));
              const singleLine = promptLine && /\[NEGATIVO\]:/i.test(promptLine);
              if (!promptLine || !singleLine || wordCount < 80) { invalidCount++; issues.push(idx); }
            } else {
              // Legacy format: PROMPT: and NEGATIVE PROMPT: on same line
              const hasPrompt = block.toLowerCase().includes('prompt:');
              const hasNegative = block.toLowerCase().includes('negative prompt:');
              const promptLine = block.split('\n').find(l => /PROMPT:/i.test(l));
              const singleLine = promptLine && /NEGATIVE PROMPT:/i.test(promptLine);
              if (!hasPrompt || !hasNegative || !singleLine || wordCount < 80) { invalidCount++; issues.push(idx); }
            }
          });
        } else {
          blocks.forEach((block, idx) => { 
            const wordCount = block.split(/\s+/).filter(w => w.length > 0).length;
            if (block.length < 10 || wordCount < 80) { invalidCount++; issues.push(idx); } 
          });
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
        repaired = repaired.replace(/([^\n]+)\s*\n\s*(\[NEGATIVO\]:)/gi, '$1 $2');
        
        // Fix extra blank lines within a block (between Prompt and Negativo)
        repaired = repaired.replace(/(\[PROMPT\]:.*?)\s*\n+\s*(\[NEGATIVO\]:)/gim, '$1 $2');
        
        // Ensure each [PROMPT]: (except the first) has exactly two newlines before it
        repaired = repaired.replace(/([^\n]+)\s*(\[PROMPT\]:)/gi, '$1\n\n$2');
        
        logs.push("�S Normalizando estrutura e espaçamento Veo 3.1");
      } else {
        // Fix 1: Legacy format - If NEGATIVE PROMPT is on its own separate line, join it to the previous PROMPT line
        repaired = repaired.replace(/([^\n]+)\s*\n\s*(NEGATIVE PROMPT:)/gi, '$1 $2');
        
        // Ensure each PROMPT: (except the first) has exactly two newlines before it
        repaired = repaired.replace(/([^\n]+)\s*(PROMPT:)/gi, '$1\n\n$2');

        // Fix 2: Remove any extra blank lines WITHIN a prompt block
        repaired = repaired.replace(/(PROMPT:.*?)\s*\n+\s*(NEGATIVE PROMPT:)/gim, '$1 $2');
        
        logs.push("�S Normalizando estrutura de blocos Legados");
      }

      // Fix: Ensure exactly one blank line between blocks (remove 3+ newlines)
      repaired = repaired.replace(/\n{3,}/g, '\n\n');
      repaired = repaired.trim();
      logs.push("�S Garantindo linha em branco entre prompts");

      setRepairLogs(prev => [...prev, ...logs]);
      await new Promise(r => setTimeout(r, 600));

      // PHASE 2: AI REPAIR (Fallback)
      const res = await runFastVerification(repaired);
      if (!res.allOk) {
        setRepairLogs(prev => [...prev, "�xa� Inconsistência Crítica: Acionando Reparo via IA..."]);
        
        const repairFormat = isVeoFormat
          ? `[PROMPT]: [Text] [NEGATIVO]: [Text] (SAME LINE, with exactly one space between them). Pular uma linha entre cada conjunto.`
          : `PROMPT: [Text] NEGATIVE PROMPT: [Text] (SAME LINE). Pular uma linha entre cada conjunto.`;
        
        const repairPrompt = `URGENT REPAIR: One or more blocks are poorly formatted or too short. 
        STRICT FORMAT: ${repairFormat}.
        Every block MUST be on a single continuous line.
        MANDATORY LENGTH: Every prompt MUST have at least 80-100 words (including negative).
        Separate each complete block with ONE empty line.
        Repair these blocks keeping original descriptions in English:
        ${repaired}`;
        
        const aiRepaired = await callGemini(getPromptsApiKey(configs), repairPrompt, { model: 'gemini-2.0-flash-lite' });
        repaired = aiRepaired.trim();
        setRepairLogs(prev => [...prev, "�S Reparo de Estrutura via IA Concluído"]);
      }

      setPrompts(repaired);
      setIsVerified(true);
      setErrorCount(0);
      setRepairLogs(prev => [...prev, "�S� Integridade Garantida: Pronto para Copiar/Baixar!"]);
      await new Promise(r => setTimeout(r, 1000));
      return repaired;
    } catch (e) {
      console.error("Repair error:", e);
      setRepairLogs(prev => [...prev, "�S Erro no Reparo: Informe suporte."]);
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
  const GENERO_TAGS = ['Ultra-realista', 'Cinema (Blockbuster)', 'Cartoon / Animação', 'Documentário', 'Film Noir', 'Ficção Científica', 'Terror / Dark', 'Fantasia �0pica', 'Anime'];
  const CAMERA_TAGS = ['Vista aérea', 'Na altura dos olhos', 'Vista de cima', 'Vista de baixo', 'Travelling', 'Câmera lenta', 'Zoom in', 'Pan lateral'];
  const COMPOSICAO_TAGS = ['Plano geral', 'Close-up', 'Plano médio', 'Retrato', 'Plano único', 'Plano duplo'];
  const FOCO_TAGS = ['Foco raso', 'Foco profundo', 'Lente macro', 'Grande-angular', 'Filtro difusor', 'Teleobjetiva'];
  const ATMOSFERA_TAGS = ['Tons azuis frios', 'Tons quentes dourados', 'Noite estrelada', 'Luz neon', 'Pôr do sol', 'Névoa', 'Chuva', 'Alta exposição'];

  const getSystemPrompt = () => {
    // Build cinematographic brief from selected parameters
    const cineParams = [
      genero ? `- Estilo/Gênero: ${genero}` : '',
      cameraMovimento?.length ? `- Câmera & Movimento: ${cameraMovimento.join(', ')}` : '',
      composicao?.length ? `- Composição: ${composicao.join(', ')}` : '',
      focoLente?.length ? `- Foco & Lente: ${focoLente.join(', ')}` : '',
      atmosferaLuz?.length ? `- Atmosfera & Luz: ${atmosferaLuz.join(', ')}` : '',
    ].filter(Boolean).join('\n    ');

    const imageStyleBlock = refImageStyle ? `
    ## ESTILO VISUAL DE REFER�NCIA (EXTRA�DO DE IMAGEM  PRIORIDADE M�XIMA)
    ${refImageStyle}
    - REGRA: Todos os prompts DEVEM replicar fielmente este estilo visual. Cores, ilumina��o, mood e composi��o devem ser consistentes com a refer�ncia.
    ` : '';

    const dnaContext = `
    ## PILAR VISUAL OBRIGAT�RIO (FUNDA��O DO V�DEO)
    - ESTILO BASE: ${genero || 'Ultra-realista (Padr�o)'}
    - REGRA DE CONSIST�NCIA: 100% dos prompts devem seguir este estilo. � PROIBIDO variar o estilo visual entre as cenas.
    ${imageStyleBlock}
    ## DNA VISUAL DO ROTEIRO (REGRAS INVIOL�VEIS)
    - Cen�rio e Arquitetura: ${visualDNA.scenario || 'A ser definido'}
    - �poca/Ambiente: ${visualDNA.era || 'A ser definido'}
    - Mood Emocional: ${visualDNA.mood || 'A ser definido'}
    - Ilumina��o Mestre: ${visualDNA.lighting || 'A ser definido'}
    - Paleta de Cores: ${visualDNA.palette || 'A ser definido'}
    - Linguagem de C�mera base: ${visualDNA.camera || 'A ser definido'}

    ## PAR�METROS CINEMATOGR�FICOS SELECIONADOS (PRIORIDADE M�XIMA)
    ${cineParams || '- Nenhum par�metro espec�fico selecionado  use criatividade baseada no DNA acima'}
    `;

    const speechInstruction = promptState.speechMode === 'true' 
      ? "MANDATORY DIALOGUE: Include specific dialogue between quotation marks in the prompt. If the subtitle has quotes, use them exactly."
      : "ABSOLUTE FORBIDDEN SPEECH: DO NOT include any dialogue, speaking actions, or mouth movements. The subject must NOT be speaking. Focus on silence and atmosphere.";

    const realismInstruction = `
      ## LEIS DA F� SICA E REALISMO (CR� TICO)
      1. REALISMO ULTRA: O visual deve ser indistinguível da realidade atual. Proibido elementos de ficção ou tecnologia impossível.
      2. LOGICA DA F� SICA: Respeite a gravidade e a luz natural. Nada flutua.
      3. ZERO FANTASIA: Sem efeitos mágicos ou brilhos irreais.
    `;

    const dynamismEngine = `
      ## MOTOR DE DINAMISMO CINEMATOGRÁFICO (REGRAS DE OURO)
      1. ANTI-MONOTONIA: Varie os ângulos e tipos de plano entre as cenas (Ex: Se a cena anterior foi Close-up, a atual deve ser Plano Geral ou Médio). Crie um ritmo de montagem profissional.
      2. CAMADAS DE DETALHAMENTO (OBRIGATÓRIO):
         - Camada Sensorial: Descreva o ambiente físico (temperatura, partículas de poeira no ar, reflexos em superfícies, texturas de tecidos).
         - Camada de Engenharia Óptica: Use termos técnicos reais (lentes 35mm f/1.4, bokeh orgânico, grão de filme 35mm).
         - Camada de Intenção Narrativa: Descreva a emoção da cena através de movimentos físicos (hesitação, pressa, tensão muscular).
    `;

    if (genMode === 'fast') {
      if (promptType === 'video') {
        // Fast Veo 3.1 format
        return `Você é um Diretor Cinematográfico AI de elite especialista em Veo 3.1.
      COMANDO: GERE PROMPTS EXTREMAMENTE ROBUSTOS (80-150 PALAVRAS) PARA VEO 3.1.
      ${dnaContext}
      ${realismInstruction}
      ${dynamismEngine}
      REGRA ABSOLUTA: Cada prompt DEVE conter: 1. Sujeito Detalhado, 2. Ação Física, 3. Cenário/Ambiente, 4. Estilo de Câmera/Lente e 5. Iluminação/Atmosfera.
      ${speechInstruction}
      PROIBIDO: NÃO ADICIONE TÍTULOS OU CABEÇALHOS. Responda em INGLÊS
      
      ## FORMATO OBRIGATÓRIO:
      [PROMPT]: [Content in one line][NEGATIVO]: [Negative list]
      [linha em branco]
      
      ${outputFormat === 'json' ? `SAÍDA: JSON [ { "id": X, "prompt": "...", "negativo": "..." }, ... ]` : `SAÍDA: Um bloco por legenda, [PROMPT]: e [NEGATIVO]: na MESMA LINHA`}. 
      REGRA DE EXTENSÃO: Cada prompt deve ser extremamente robusto, com 80-150 palavras (Prompt + Negativo).`;
      } else {
        return `You are an ELITE Image Prompt Engineer.
      COMMAND: PRODUCE FAST, HIGH-QUALITY IMAGE PROMPTS.
      ${dnaContext}
      STRICT RULE: Every prompt MUST respect the Visual DNA above. Response MUST be in ENGLISH.
      ${outputFormat === 'json' ? `SAÍDA FINAL: JSON [ { "id": X, "prompt": "..." }, ... ]` : `SAÍDA FINAL: ID|PROMPT (one per line)`}`;
      }
    } else {
      // MODO QUALIDADE ELITE
      if (promptType === 'video') {
        // VEO 3.1 GOLD STANDARD - Instruções completas
        const veoExample = `[PROMPT]: A middle-aged man in a realistic blue denim shirt sitting at a wooden table in a dimly lit, contemporary kitchen, resting his chin on his hand while looking out the window at a rainy street, raindrops splashing realistically against the glass pane according to physics, natural cold lighting from the overcast sky outside, hyper-realistic skin textures including pores and fine wrinkles, cinematic drama style with realistic lens blur, 35mm photography aesthetic, ambient sound of rain hitting the roof and the distant sound of a car driving by on a wet road. [NEGATIVO]: fiction, fantasy, sci-fi, magical elements, glowing eyes, floating objects, impossible physics, bright neon colors, anime, cartoon, 3D render, CGI look, smooth plastic skin, missing textures, distorted anatomy, talking, moving mouth, speech bubbles, text, watermark.`;

        return `Você é o SUPREMO Diretor Cinematográfico AI e Engenheiro de Prompts para Veo 3.1.
      COMANDO: GERE PROMPTS CINEMATOGRÁFICOS MAGISTRAIS SEGUINDO O PADRÃO OURO VEO 3.1.
      PROIBIDO: NÃO ADICIONE TÍTULOS, NOMES DE CENAS OU CABEÇALHOS.
      ${speechInstruction}
      ${realismInstruction}
      ${dynamismEngine}

      ## EXEMPLO PADRÃO OURO (HIPER-REALISMO):
      ${veoExample}

      ${dnaContext}

      ## REGRAS DE CONSTRUÇÃO DO PROMPT (OBRIGATÓRIO — nesta ordem):
      Cada prompt deve conter TODOS os elementos abaixo em frase contínua e fluida em INGLÊS:
      1. SUJEITO — máximo detalhe físico, vestuário, expressão facial e características únicas.
      2. AÇÃO — verbos precisos e advérbios expressivos (ex: "caminha lentamente", "vira a cabeça de forma brusca").
      3. CENÁRIO — ambiente, época, arquitetura, vegetação, clima e elementos de fundo.
      4. ESTILO CINEMATOGRÁFICO — gênero, referências de direção e sensação geral.
      5. MOVIMENTO DE CÂMERA — tipo de plano, ângulo e movimento (ex: travelling lateral, drone, altura dos olhos).
      6. COMPOSIÇÃO — plano geral, close-up, plano médio, retrato, plano único ou duplo.
      7. FOCO E LENTE — bokeh, lente macro, grande-angular, teleobjetiva, filtro difusor.
      8. ATMOSFERA E ILUMINAÇÃO — hora do dia, tipo de luz, temperatura de cor, sombras, contraste.
      9. ÁUDIO — ${promptState.speechMode === 'true' ? 'Inclua diálogos autênticos entre aspas e ambiência real.' : 'PROIBIDO FALAS. Apenas ambiência física e sons mecânicos reais.'}

      ## REGRAS DO PROMPT NEGATIVO (EM INGLÊS):
      Liste separados por vírgula: problemas técnicos + problemas visuais específicos da cena + elementos de conteúdo indesejados + inconsistências de estilo + movimentos não naturais.

      ## CONSISTÊNCIA VISUAL:
      Mantenha rigorosamente o mesmo estilo, paleta e atmosfera em TODOS os prompts para garantir coesão visual absoluta em todo o vídeo.

      NÍVEL DE DETALHE (REGRA ABSOLUTA): 80-150 PALAVRAS por prompt (Prompt + Negativo). Evite termos vagos — use descritores concretos, sensoriais e técnicos.
      IDIOMA: SEMPRE Inglês (English).
      ${outputFormat === 'json' ? `## SAÍDA FINAL: JSON [ { "id": X, "prompt": "...", "negativo": "..." }, ... ]` : `## SAÍDA FINAL: UM BLOCO POR LEGENDA   [PROMPT]: e [NEGATIVO]: na MESMA LINHA`}`;
      } else {
        // Image Gold Standard (legacy format)
        const eliteExample = `PROMPT: A slow, deliberate tracking shot moves through a claustrophobic corridor within the Brocken Sendeanlage in 1978, revealing a scene of technological decay and encroaching dread; the cold, raw concrete walls, stained with streaks of dampness and peeling lead paint, are a dominant grey-blue, contrasted by thick bundles of olive-green, rubber-coated cables snaking across the floor and up the walls, all showing signs of age and neglect; 8K resolution, 35mm film grain, hyper-realistic textures, dramatic chiaroscuro. NEGATIVE PROMPT: bright colors, neon, saturation, sunshine, blue sky, people, modern technology, clean surfaces, CGI, 3D render, cartoon, anime, watercolor, text, watermark, signature, logo.`;

        return `You are the ULTIMATE Image Prompt Engineer.
      COMMAND: PRODUCE PROMPTS THAT ARE EXTREMELY DETAILED (GOLD STANDARD).

      ## GOLD STANDARD EXAMPLE:
      ${eliteExample}

      ${dnaContext}

      ## FORMAT:
      PROMPT: [Details] NEGATIVE PROMPT: [Details]
      [EMPTY LINE AFTER EACH BLOCK]

      ${outputFormat === 'json' ? `## OUTPUT: JSON [ { "id": X, "prompt": "...", "negative": "..." }, ... ]` : `## OUTPUT: SINGLÊS LINE PER PROMPT BLOCK (PROMPT: ... NEGATIVE PROMPT: ...)`}`;
      }
    }
  };

  const handleGenerate = async () => {
    if (!file || subtitleBlocks.length === 0) return;
    setIsGenerating(true);
    setPrompts("");
    
    const CHUNK_SIZE = 25;
    const totalChunks = Math.ceil(subtitleBlocks.length / CHUNK_SIZE);
    setGenerationProgress({ step: '� Turbo Engine: Iniciando...', current: 0, total: totalChunks, statuses: new Array(totalChunks).fill("pending") });
 
    const resultsStorage = new Array(totalChunks).fill("");
    const chunkStatuses = new Array(totalChunks).fill("pending");
    cancelRef.current = false;

    let chunksToProcess = Array.from({length: totalChunks}, (_, idx) => idx);
    let globalRetry = 0;

    while (chunksToProcess.length > 0 && globalRetry < 3 && !cancelRef.current) {
      if (globalRetry > 0) {
        setGenerationProgress(prev => ({ ...prev, step: `Verificador: Refazendo ${chunksToProcess.length} bloco(s)...` }));
        await new Promise(r => setTimeout(r, 2000));
      }
      const nextFailedChunks = [];

      // TURBO: Parallel pairs
      const pairs = [];
      for (let p = 0; p < chunksToProcess.length; p += 2) {
        pairs.push(chunksToProcess.slice(p, p + 2));
      }

      for (const pair of pairs) {
        if (cancelRef.current) break;
        if (pair[0] !== chunksToProcess[0] || globalRetry > 0) {
          const adaptDelay = getAdaptiveDelay(getPromptsApiKey(configs));
          await new Promise(r => setTimeout(r, adaptDelay));
        }

        await Promise.all(pair.map(async (i) => {
          if (cancelRef.current) return;
          const startIdx = i * CHUNK_SIZE;
          const currentChunk = subtitleBlocks.slice(startIdx, startIdx + CHUNK_SIZE);
          const chunkSubtitleCount = currentChunk.length;
          const formattedInput = currentChunk.map((b, bIdx) => `[ID ${startIdx + bIdx + 1}] ${b}`).join('\n');
          chunkStatuses[i] = "generating";
          setGenerationProgress(prev => ({ ...prev, statuses: [...chunkStatuses] }));

          const isJson = outputFormat === 'json';
          const isVeoVideoMode = promptType === 'video' && genMode === 'quality';
          const countRuleLang = isVeoVideoMode
            ? `REGRA OBRIGAT�RIA: Gere EXATAMENTE ${chunkSubtitleCount} prompts. N�O ADICIONE T�TULOS. Responda APENAS com os blocos [PROMPT]: e [NEGATIVO]:.`
            : `MANDATORY RULE: Generate EXACTLY ${chunkSubtitleCount} prompts. DO NOT ADD TITLES, HEADERS, OR INTROS.`;
          const generateLabel = isVeoVideoMode
            ? `GERE EXATAMENTE ${chunkSubtitleCount} PROMPTS VEO 3.1:`
            : `GENERATE EXACTLY ${chunkSubtitleCount} ELITE PROMPTS (ENGLISH ONLY):`;
          const promptParam = `${getSystemPrompt()}\n\n---\n${countRuleLang}\nVOC� DEVE GERAR EXATAMENTE ${chunkSubtitleCount} BLOCOS.\n---\n\nINPUT (CHUNK ${i+1}) - ${chunkSubtitleCount} SUBTITLES:\n${formattedInput}\n\n${generateLabel}`;

          let retryCount = 0, success = false, lastError = null;
          while (!success && retryCount < 4 && !cancelRef.current) {
            try {
              if (retryCount > 0) {
                const isRateLimit = lastError && (lastError.message.includes('quota') || lastError.message.includes('429') || lastError.message.includes('exhausted'));
                const delayTime = isRateLimit ? 35000 : 3000;
                chunkStatuses[i] = "retrying";
                setGenerationProgress(prev => ({ ...prev, statuses: [...chunkStatuses], step: retryCount === 3 ? `Seguran�a: Individuais Bloco ${i+1}...` : (isRateLimit ? `Pausa (${delayTime/1000}s) Bloco ${i+1}...` : `Retry ${retryCount}/3 Bloco ${i+1}...`) }));
                await new Promise(r => setTimeout(r, delayTime));
              }

              let responseText = "";
              if (retryCount === 3) {
                let individualText = "";
                for (let subIdx = 0; subIdx < currentChunk.length; subIdx++) {
                  const sub = currentChunk[subIdx];
                  const subId = startIdx + subIdx + 1;
                  const subPrompt = `${getSystemPrompt()}\n\n---\nREGRA ABSOLUTA: Gere APENAS UM PROMPT.\nFORMATO: [PROMPT]: ... [NEGATIVO]: ...\n---\nLEGENDA [ID ${subId}]: ${sub}\n\nGERAR PROMPT:`;
                  const subResp = await callGemini(getPromptsApiKey(configs), subPrompt, { model: 'gemini-2.0-flash-lite' });
                  let cleanedSub = subResp.trim().replace(/([^\n]+)\s*\n\s*(\[NEGATIVO\]:)/gi, '$1 $2');
                  const line = cleanedSub.split('\n').find(l => l.includes('[PROMPT]:')) || cleanedSub;
                  individualText += (individualText ? "\n\n" : "") + line;
                  setGenerationProgress(prev => ({ ...prev, step: `Seguran�a: ${subIdx+1}/${currentChunk.length} Bloco ${i+1}` }));
                }
                responseText = individualText;
              } else {
                chunkStatuses[i] = "generating";
                setGenerationProgress(prev => ({ ...prev, statuses: [...chunkStatuses], step: `� Turbo: Bloco ${i+1}/${totalChunks}...` }));
                responseText = await callGemini(getPromptsApiKey(configs), promptParam, { model: 'gemini-2.0-flash-lite' });
              }

              success = true;
              let chunkText = "";
              if (isJson) {
                try { const cj = responseText.replace(/```json|```/g, '').trim(); chunkText = cj.substring(cj.indexOf('['), cj.lastIndexOf(']') + 1); } catch { chunkText = responseText; }
              } else if (genMode === 'quality') {
                let parsed = responseText.trim();
                const isVeoFmt = parsed.includes('[PROMPT]:') || parsed.includes('[NEGATIVO]:');
                if (isVeoFmt) {
                  parsed = parsed.replace(/([^\n]+)\s*\n\s*(\[NEGATIVO\]:)/gi, '$1 $2');
                  const lines = parsed.split('\n').filter(l => l.includes('[PROMPT]:'));
                  if (retryCount < 3 && lines.length !== chunkSubtitleCount) throw new Error(`Contagem: Esperado ${chunkSubtitleCount}, gerou ${lines.length}.`);
                  chunkText = lines.join('\n\n');
                } else {
                  parsed = parsed.replace(/([^\n]+)\s*\n\s*(NEGATIVE PROMPT:)/gi, '$1 $2');
                  const lines = parsed.split('\n').filter(l => l.toLowerCase().includes('prompt:'));
                  if (retryCount < 3 && lines.length !== chunkSubtitleCount) throw new Error(`Count: Expected ${chunkSubtitleCount}, got ${lines.length}.`);
                  chunkText = lines.join('\n\n');
                }
              } else { chunkText = responseText; }

              resultsStorage[i] = chunkText;
              chunkStatuses[i] = "done";
              setPrompts(resultsStorage.filter(Boolean).join('\n\n'));
            } catch (err) {
              console.error(`Error chunk ${i+1}:`, err);
              lastError = err;
              retryCount++;
              if (retryCount >= 4) {
                resultsStorage[i] = `[ERRO BLOCO ${i+1}: ${err.message}]`;
                chunkStatuses[i] = "error";
                nextFailedChunks.push(i);
                setPrompts(resultsStorage.filter(Boolean).join('\n\n'));
              }
            }
          }
        }));

        if (!cancelRef.current) {
          const doneCount = chunkStatuses.filter(s => s === 'done').length;
          setGenerationProgress(prev => ({ ...prev, current: doneCount, statuses: [...chunkStatuses], step: `� Turbo: ${doneCount}/${totalChunks} conclu�dos` }));
        }
      }
      chunksToProcess = nextFailedChunks;
      globalRetry++;
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
           step: `�xa� TRAMA CORROMPIDA: Corrigindo ${verif.issues.length} blocos com formatação inválida...` 
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
      setPromptPools(stackPush('guru_image_prompt_pools', newPool));

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

      const batchPromises = Array.from({ length: totalBlocks }, async (_, i) => {
        const startIdx = i * batchSize;
        const segment = scriptSegments.slice(startIdx, startIdx + batchSize).join(' ');
 
        // Update status
        chunkStatuses[i] = "generating";
        setGenerationProgress(prev => ({ ...prev, statuses: [...chunkStatuses] }));
 
        const promptBatchQuery = `${getSystemPrompt()}\n\nSCRIPT SEGMENT (BLOCK ${i+1}):\n"${segment}"\n\nGENERATE ELITE PROMPTS (ENGLISH ONLY):`;
 
        try {
          const batchResult = await callGemini(getPromptsApiKey(configs), promptBatchQuery);
          
          let processedBatch = "";
          if (genMode === 'quality') {
            // ELITE CLEANUP: Ensure no blank lines between Prompt and Negative Prompt
            processedBatch = (batchResult || "").trim().replace(/PROMPT:\s*([\s\S]*?)\n+\s*NEGATIVE PROMPT:/gim, "PROMPT: $1\nNEGATIVE PROMPT:");
          } else {
            processedBatch = (batchResult || "").split('\n').map(p => p.trim()).filter(p => p.length > 20).join('\n\n');
          }
          
          resultsArray[i] = processedBatch;
          chunkStatuses[i] = "done";
          
          // Live UI Update
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
      });

      const results = await Promise.all(batchPromises);
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
      setPromptPools(stackPush('guru_image_prompt_pools', newPool));
    } catch (error) {
      alert("Erro na geração paralela de roteiro: " + error.message);
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ step: '', current: 0, total: 0 });
    }
  };

  const handleCopyPrompts = async () => { 
    if (!prompts) return;
    
    // Automatic Analysis before allowing copy
    if (!isVerified) {
      const repaired = await handleAutomaticRepair(prompts);
      if (repaired) {
        navigator.clipboard.writeText(repaired);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } else {
      navigator.clipboard.writeText(prompts);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    if (!prompts) return;

    // Automatic Analysis before allowing download
    let finalContent = prompts;
    if (!isVerified) {
      finalContent = await handleAutomaticRepair(prompts);
      if (!finalContent) return;
    }

    const ext = outputFormat === 'json' ? 'json' : 'txt';
    const mimeType = outputFormat === 'json' ? 'application/json' : 'text/plain';
    const blob = new Blob([finalContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prompts_${genero || 'project'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* const handleTransferToFlow = () => {
    if (!prompts) return;
    localStorage.setItem('guru_flow_transfer', prompts);
    if (setActiveTab) setActiveTab('whisk');
  }; */

  return (
    <div className="p-8 max-w-6xl mx-auto h-full overflow-y-auto custom-scrollbar space-y-10">
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
        </div>

        {/* REFERENCE IMAGE STYLE - OPTIONAL */}
        <div className="glass-card p-5 space-y-4 border-neon-purple/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center border border-neon-purple/20">
                <Eye className="w-4 h-4 text-neon-purple" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Refer�ncia Visual</h3>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Opcional  Cole uma imagem para replicar o estilo</p>
              </div>
            </div>
            {refImagePreview && (
              <button onClick={clearRefImage} className="text-gray-500 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {!refImagePreview ? (
            <div 
              onClick={() => refImageInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) handleRefImageUpload(f); }}
              className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-neon-purple/40 hover:bg-neon-purple/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-neon-purple/10 transition-all">
                <UploadCloud className="w-6 h-6 text-gray-500 group-hover:text-neon-purple transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Arraste uma imagem ou clique para enviar</p>
                <p className="text-[8px] text-gray-600 uppercase tracking-widest mt-1">JPG, PNG, WEBP  A IA extrair� o estilo visual</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-white/10 shrink-0">
                <img src={refImagePreview} alt="Refer�ncia" className="w-full h-full object-cover" />
                {isAnalyzingImage && (
                  <div className="absolute inset-0 bg-dark/70 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-6 h-6 animate-spin text-neon-purple" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-neon-purple" />
                  {isAnalyzingImage ? 'Analisando estilo visual...' : 'Estilo Visual Extra�do'}
                </label>
                <textarea 
                  value={refImageStyle}
                  onChange={(e) => setRefImageStyle(e.target.value)}
                  placeholder="O estilo visual aparecer� aqui ap�s a an�lise..."
                  className="w-full bg-dark/40 border border-white/10 rounded-lg p-3 text-xs text-gray-300 focus:outline-none focus:border-neon-purple/50 h-24 custom-scrollbar resize-none font-medium leading-relaxed"
                />
                {refImageStyle && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/20 rounded-lg w-fit">
                    <CheckCircle className="w-3 h-3 text-neon-purple" />
                    <span className="text-[9px] font-black text-neon-purple uppercase tracking-widest">Estilo ativo nos prompts</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <input ref={refImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleRefImageUpload(e.target.files[0])} />
        </div>


      {/* Output Format Controls */}
      <div className="glass-card p-5 space-y-0">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-white/10 pb-4 mb-0">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neon-pink" /> 
            Formato de Saída
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* Prompt Type: Image / Video */}
            <div className="flex bg-dark/50 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setPromptType('image')}
                className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  promptType === 'image' 
                    ? 'bg-neon-pink text-white shadow-[0_0_15px_rgba(255,44,182,0.3)]' 
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <ImageIcon className="w-4 h-4" /> Imagem
              </button>
              <button
                onClick={() => setPromptType('video')}
                className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  promptType === 'video' 
                    ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(176,38,255,0.3)]' 
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <Video className="w-4 h-4" /> Vídeo
              </button>
            </div>

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

      {/* ���� Cinematographic Parameters �������������������������������������������������������� */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ESTILO / G�`NERO � obrigatório */}
        <div className="glass-card p-5 border border-white/10 space-y-3 md:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-neon-pink/20 text-neon-pink border border-neon-pink/30 uppercase tracking-widest">Obrigatório</span>
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Estilo / Gênero</h3>
          </div>
          <p className="text-[10px] text-gray-500 -mt-1">Direção criativa do vídeo</p>
          <div className="flex flex-wrap gap-2">
            {GENERO_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setGenero(genero === tag ? '' : tag)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-200 ${
                  genero === tag
                    ? 'bg-neon-pink/20 border-neon-pink text-neon-pink shadow-[0_0_8px_rgba(255,44,182,0.25)]'
                    : 'bg-white/5 border-white/15 text-gray-400 hover:border-white/40 hover:text-white hover:bg-white/10'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={GENERO_TAGS.includes(genero) ? '' : genero}
            onChange={e => setGenero(e.target.value)}
            placeholder="ou escreva seu estilo..."
            className="w-full bg-dark/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-neon-pink/40 transition-all"
          />
        </div>



      </div>

      {/* Generation Area Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Upload and Controls */}
        <div className="space-y-6">
          {/* MODO DE PRODUÇÃO — apenas Elite Qualidade */}
          <div className="glass-card p-4 border-neon-pink/20 bg-neon-pink/5">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-neon-pink/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-neon-pink" />
               </div>
               <div>
                  <h3 className="text-[10px] font-black text-neon-pink uppercase tracking-widest">Elite Qualidade — Modo Ativo</h3>
                  <p className="text-[9px] text-gray-500 mt-0.5">💎 Prompts ultra detalhados com lentes, cinematografia analógica e negativos incluídos.</p>
               </div>
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
                <p className="text-green-400/70 mt-1 text-sm">{subtitleCount} cenas encontradas � clique para trocar</p>
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
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {generationProgress.statuses.map((status, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      status === 'done' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' :
                      status === 'generating' ? 'bg-neon-pink animate-pulse shadow-[0_0_12px_rgba(255,44,182,0.5)]' :
                      status === 'error' ? 'bg-red-500' :
                      'bg-white/10'
                    }`}
                    title={`Bloco ${idx + 1}: ${status}`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-center text-gray-500 font-bold italic mt-2">
                {generationProgress.step}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <button
                onClick={() => {
                   if (file) handleGenerate();
                   else if (selectedScriptId) handleGenerateFromScript();
                   else alert("� Carregue uma legenda ou selecione um roteiro.");
                }}
                disabled={isGenerating || (!file && !selectedScriptId)}
                className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 ${
                  isGenerating || (!file && !selectedScriptId)
                    ? 'bg-white/5 border border-white/5 text-gray-600 cursor-not-allowed grayscale opacity-50'
                    : 'bg-gradient-to-r from-pink-600 to-neon-purple text-white hover:shadow-neon-pink hover:scale-[1.02] shadow-[0_0_20px_rgba(255,44,182,0.4)]'
                }`}
              >
                {isGenerating ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-neon-cyan" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-neon-cyan truncate max-w-[200px]">{generationProgress.step || 'Gerando...'}</span>
                  </div>
                ) : (
                  <>
                    {!visualDNA.scenario ? <X className="w-5 h-5 text-red-500" /> : <Wand2 className="w-5 h-5 shadow-neon animate-pulse" />} 
                    {!visualDNA.scenario ? "Bloqueado: Requer Análise Visual" : `Gerar Prompts do Projeto`}
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
                           <p className={`text-[10px] font-bold ${log.includes('�S') || log.includes('�S�') ? 'text-green-400' : log.includes('�xa�') ? 'text-neon-pink' : 'text-gray-400'}`}>
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
                  <div className="flex flex-col items-center gap-5">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-neon-cyan animate-spin shadow-[0_0_25px_rgba(0,243,255,0.3)]" />
                      <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-b-neon-pink/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                    </div>
                    <div className="space-y-2 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-cyan animate-pulse">{generationProgress.step || 'Gerando prompts...'}</p>
                      {generationProgress.total > 0 && (
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{generationProgress.current}/{generationProgress.total} blocos</p>
                      )}
                    </div>
                  </div>
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
                        localStorage.setItem('guru_image_prompt_pools', '[]');
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
            {(Array.isArray(promptPools) ? [...promptPools, ...Array(Math.max(0, 5 - promptPools.length)).fill(null)] : Array(5).fill(null)).map((pool, idx) => (
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
                           onClick={() => setPromptPools(stackRemove('guru_image_prompt_pools', pool.id))}
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
  );
};



