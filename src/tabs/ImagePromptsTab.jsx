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
  X,
  ChevronRight,
  Eye,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { resolveApiUrl } from '../utils/apiUtils';
import { callGemini, callGPT, callGrok } from '../utils/aiUtils';
import { stackPush, stackRead, stackRemove } from '../utils/stackUtils';
import { t } from '../utils/i18n';
import { usePersistence } from '../contexts/PersistenceContext';

const VISUAL_STYLES = [
  { id: 'ultra-realista',    label: '📷 Ultra-Realista',      desc: 'Fotografia cinematográfica 8K hiper-real, iluminação natural perfeita' },
  { id: 'cartoon',           label: '🎨 Cartoon',              desc: 'Ilustração estilo cartoon colorido, traços expressivos e vibrantes' },
  { id: 'vista-aerea',       label: '🚁 Vista Aérea',          desc: 'Tomada aérea de drone em altitude, perspectiva de cima para baixo' },
  { id: 'cinematografico',   label: '🎬 Cinematográfico',      desc: 'Cena de filme com profundidade de campo, bokeh e luz dourada' },
  { id: 'anime',             label: '⛩️ Anime',                desc: 'Estilo anime japonês, cores vibrantes, grandes olhos expressivos' },
  { id: 'aquarela',          label: '🖌️ Aquarela',             desc: 'Pintura em aquarela suave com bordas difusas e cores translúcidas' },
  { id: 'minimalista',       label: '⬜ Minimalista',          desc: 'Composição limpa, fundo simples, poucos elementos, espaço em branco' },
  { id: 'steampunk',         label: '⚙️ Steampunk',            desc: 'Estética vitoriana com engrenagens, vapor e metais envelhecidos' },
  { id: 'sci-fi',            label: '🚀 Sci-Fi / Futurista',   desc: 'Cenário futurista com néon, cyberpunk, hologramas e tecnologia avançada' },
  { id: 'fantasia',          label: '🧙 Alta Fantasia',         desc: 'Mundo mágico épico, criaturas, magia e paisagens fantásticas' },
  { id: 'noir',              label: '🕵️ Film Noir',            desc: 'Preto e branco dramático, sombras duras, atmosfera de mistério' },
  { id: 'macro',             label: '🔬 Fotografia Macro',     desc: 'Close-up extremo em detalhes minúsculos com foco seletivo preciso' },
  { id: 'retrô',             label: '📻 Retrô / Vintage',      desc: 'Estética anos 70-80, cores desbotadas, granulação de filme antigo' },
  { id: 'isometrico',        label: '📐 Isométrico',            desc: 'Perspectiva isométrica estilo videogame, objetos em ângulo 45°' },
  { id: 'pintura-oleo',      label: '🖼️ Pintura a Óleo',       desc: 'Pinceladas visíveis, texturas ricas, estilo renascentista clássico' },
  { id: 'neon-glow',         label: '💜 Neon Glow',            desc: 'Luzes neon vibrantes brilhando no escuro, estética synthwave/cyberpunk' },
  { id: 'flat-design',       label: '📱 Flat Design',           desc: 'Ilustração vetorial plana, sem sombras 3D, paleta de cores limpa' },
];
export const ImagePromptsTab = ({ setActiveTab }) => {
  const { promptState, setPromptState } = usePersistence();
  const { 
    file, 
    subtitleBlocks, 
    prompts, 
    selectedStyle, 
    selectedScriptId, 
    promptPools,
    availableScripts,
    visualDNA
  } = promptState;

  const setFile = (val) => setPromptState(prev => ({ ...prev, file: typeof val === 'function' ? val(prev.file) : val }));
  const setSubtitleBlocks = (val) => setPromptState(prev => ({ ...prev, subtitleBlocks: typeof val === 'function' ? val(prev.subtitleBlocks) : val }));
  const setPrompts = (val) => setPromptState(prev => ({ ...prev, prompts: typeof val === 'function' ? val(prev.prompts) : val }));
  const setSelectedStyle = (val) => setPromptState(prev => ({ ...prev, selectedStyle: typeof val === 'function' ? val(prev.selectedStyle) : val }));
  const setSelectedScriptId = (val) => setPromptState(prev => ({ ...prev, selectedScriptId: typeof val === 'function' ? val(prev.selectedScriptId) : val }));
  const setPromptPools = (val) => setPromptState(prev => ({ ...prev, promptPools: typeof val === 'function' ? val(prev.promptPools) : val }));
  const setAvailableScripts = (val) => setPromptState(prev => ({ ...prev, availableScripts: typeof val === 'function' ? val(prev.availableScripts) : val }));
  const setVisualDNA = (val) => setPromptState(prev => ({ ...prev, visualDNA: typeof val === 'function' ? val(prev.visualDNA) : val }));

  const [isDragging, setIsDragging] = useState(false);
  const [subtitleCount, setSubtitleCount] = useState(subtitleBlocks.length);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef(null);
  const [generationProgress, setGenerationProgress] = useState({ step: '', current: 0, total: 0 });

  useEffect(() => {
    const savedScripts = JSON.parse(localStorage.getItem('guru_scripts') || '[]');
    setAvailableScripts(Array.isArray(savedScripts) ? savedScripts : []);
    setPromptPools(stackRead('guru_image_prompt_pools'));
  }, []);

  const [showFullOutput, setShowFullOutput] = useState(false);
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
      let blocks = [];
      if (file.name.toLowerCase().endsWith('.srt')) {
        const parts = text.split(/\n\s*\n/).filter(p => p.trim());
        blocks = parts.map(p => {
          const lines = p.trim().split('\n');
          if (lines.length >= 3) return lines.slice(2).join(' ').trim();
          return p.trim();
        });
      } else {
        blocks = text.split('\n').filter(p => p.trim());
      }
      setSubtitleBlocks(blocks);
      setSubtitleCount(blocks.length);
      setPrompts("");
    };
    reader.readAsText(file);
  };

  const getActiveStyle = () => VISUAL_STYLES.find(s => s.id === selectedStyle) || VISUAL_STYLES[0];
  
  const updateDNAField = (field, value) => {
    setVisualDNA({ ...visualDNA, [field]: value });
  };

  const analyzeVisualIdentity = async () => {
    let scriptToAnalyze = "";
    if (selectedScriptId) {
      const script = availableScripts.find(s => s.id === selectedScriptId);
      if (script) scriptToAnalyze = script.content;
    } else if (subtitleBlocks.length > 0) {
      scriptToAnalyze = subtitleBlocks.slice(0, 50).join('\n');
    }

    if (!scriptToAnalyze) {
      alert("Carregue uma legenda ou selecione um roteiro primeiro.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const geminiKey = localStorage.getItem('guru_gemini_key')?.trim();
      if (!geminiKey) throw new Error("Chave Gemini não configurada.");

      const analysisPrompt = `Você é um Diretor de Fotografia AI. Analise o roteiro e defina a IDENTIDADE VISUAL para um vídeo cinematográfico.
      Retorne APENAS um JSON no formato:
      {
        "scenario": "descrição curta do cenário principal",
        "era": "época ou estilo temporal",
        "mood": "atmosfera emocional",
        "lighting": "estilo de iluminação mestre",
        "palette": "paleta de cores predominante",
        "camera": "estilo de movimento de câmera"
      }
      ROTEIRO:
      ${scriptToAnalyze.substring(0, 4000)}`;

      const response = await callGemini(geminiKey, analysisPrompt);
      const cleanJson = response.replace(/```json|```/g, '').trim();
      const dna = JSON.parse(cleanJson);
      setVisualDNA(dna);
    } catch (error) {
      console.error("Erro na análise visual:", error);
      alert("Erro ao analisar identidade: " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!file || subtitleBlocks.length === 0) return;
    setIsGenerating(true);
    setPrompts("");
    
    const CHUNK_SIZE = 20;
    const totalChunks = Math.ceil(subtitleBlocks.length / CHUNK_SIZE);
    setGenerationProgress({ step: 'Processando Legendas...', current: 0, total: totalChunks });

    const styleInfo = getActiveStyle();
    const gptKey = localStorage.getItem('guru_gpt_key')?.trim();
    const geminiKey = localStorage.getItem('guru_gemini_key')?.trim();
    
    let allGeneratedPrompts = "";
    let previousContext = "";

    try {
      for (let i = 0; i < totalChunks; i++) {
        setGenerationProgress(prev => ({ ...prev, current: i + 1 }));
        
        const startIdx = i * CHUNK_SIZE;
        const currentChunk = subtitleBlocks.slice(startIdx, startIdx + CHUNK_SIZE);
        const chunkSubtitleCount = currentChunk.length;
        const formattedInput = currentChunk.map((b, idx) => `[ID ${startIdx + idx + 1}] ${b}`).join('\n');

        const promptParam = `You are a world-class Visual Director and AI Video Prompt Engineer.
YOUR MISSION: Transform script fragments into EXTREMELY DETAILED, CINEMATIC video prompts in English.

## VISUAL DNA (Mandatory - Use this for EVERY scene):
Scenario: ${visualDNA.scenario}
Era/Time: ${visualDNA.era}
Mood/Atmosphere: ${visualDNA.mood}
Lighting: ${visualDNA.lighting}
Color Palette: ${visualDNA.palette}
Camera Language: ${visualDNA.camera}

## UNIFIED DIRECTION:
You must strictly follow the Visual DNA above. Every prompt must feel part of the same cinematic universe.

## BLOCK CONTEXT:
You are processing block ${i + 1} of ${totalChunks}.
${previousContext ? `## VISUAL COHESION (Context from previous block):\n${previousContext}` : ""}

## THE CORE OBJECTIVE: HYPER-REALISM & MOTION
Each prompt MUST feel like a professional film scene. It must be so detailed that the AI knows exactly what is moving, how the camera behaves, and the precise atmosphere of the shot.

## MANDATORY VISUAL ELEMENTS (For every prompt):
1. **The Subject & Action**: Describe the subject in high detail. What are they doing? Give them life, emotion, and subtle micro-movements.
2. **Camera Movement**: Mandatory. Specify if it is a "Slow tracking shot", "Dynamic dolly-in", "Dramatic low-angle pan", "Handheld shaky cam", or "Smooth cinematic crane shot".
3. **Lighting & Atmosphere**: Mandatory. Describe the light (volumetric, golden hour, neon flicker, soft studio diffusal) and environmental details (dust motes, rain, steam, reflections).
4. **Cinematic Style**: Always apply the chosen visual style: "${styleInfo.label}" — ${styleInfo.desc}.
5. **Text-to-Video Optimization**: Use descriptive verbs (whispering, sprinting, glistening, drifting) to trigger high-quality motion in the video model.

## STRICT RULES:
- **Absolute Cohesion**: Ensure that if a character or setting appears in multiple consecutive fragments, they remain visually consistent.
- **Literal Fidelity**: While adding cinematic detail, NEVER invent new story elements not present in the text.
- **Word Count**: Be extremely descriptive. Aim for 80 to 200 words per prompt.
- **No Formatting**: Return only the raw text in the specified format. No markdown, no bold.
- **Language**: English only.

## FORMAT (MANDATORY):
[ID]|[PROMPT]

## INPUT (Script fragments to convert):
${formattedInput}

## OUTPUT: Return EXACTLY ${chunkSubtitleCount} prompts, one per line, in the format ID|PROMPT:`;

        let responseText = "";
        try {
          if (!gptKey || gptKey.includes('YOUR_')) throw new Error("GPT key missing");
          responseText = await callGPT(gptKey, promptParam);
        } catch (gptError) {
          if (geminiKey && geminiKey.length > 5) {
            responseText = await callGemini(geminiKey, promptParam);
          } else {
            throw new Error(`Erro no Bloco ${i + 1}: Saldo do GPT insuficiente e Gemini não configurado.`);
          }
        }

        if (!responseText) throw new Error(`A IA não retornou conteúdo no Bloco ${i + 1}.`);

        const rawLines = responseText.split('\n').filter(l => /^\d+\s*\|/.test(l.trim()));
        let chunkOutput = "";
        let lastThreePrompts = [];

        currentChunk.forEach((block, idx) => {
          const expectedId = startIdx + idx + 1;
          const matchedLine = rawLines.find(l => {
            const idPart = parseInt(l.trim().split('|')[0].trim());
            return idPart === expectedId;
          });

          if (matchedLine) {
            const promptOnly = matchedLine.substring(matchedLine.indexOf('|') + 1).trim();
            chunkOutput += `${promptOnly}\n\n`;
            lastThreePrompts.push(`ID ${expectedId}: ${promptOnly.substring(0, 150)}...`);
          } else {
            chunkOutput += `${styleInfo.desc}, cinematic scene illustrating: ${block.substring(0, 50)}...\n\n`;
          }
        });

        if (chunkOutput) {
          allGeneratedPrompts += (allGeneratedPrompts ? '\n\n' : '') + chunkOutput;
          setPrompts(prev => (prev ? prev + '\n\n' : '') + chunkOutput);
          setGenerationProgress(prev => ({ ...prev, step: `Bloco ${i + 1} de ${totalChunks} Processado` }));
        }
        previousContext = `Keep visual consistency with the previous scene: ${lastThreePrompts.slice(-3).join(" | ")}`;
      }

      // Determine the best title for this pool (Script Name > Filename > Default)
      const selectedScript = availableScripts.find(s => s.id === selectedScriptId);
      const poolTitle = (selectedScript ? selectedScript.title : (file?.name || 'Projeto SRM')).toUpperCase();

      // Add to prompt pool history
      const newPool = {
        id: Date.now().toString(),
        title: poolTitle,
        context: visualDNA,
        content: allGeneratedPrompts,
        count: (allGeneratedPrompts || "").split('\n\n').filter(p => p.trim()).length,
        date: new Date().toLocaleString()
      };
      setPromptPools(stackPush('guru_image_prompt_pools', newPool));

    } catch (error) {
      console.error(error);
      alert("Erro durante a geração por blocos:\n" + error.message);
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
    setGenerationProgress({ step: 'Analizando Roteiro e Identidade Visual...', current: 0, total: 0 });

    try {
      const geminiKey = localStorage.getItem('guru_gemini_key')?.trim();
      if (!geminiKey) throw new Error("Chave Gemini não configurada!");

      const dnaText = `
        Scenario: ${visualDNA.scenario}
        Era: ${visualDNA.era}
        Mood: ${visualDNA.mood}
        Lighting: ${visualDNA.lighting}
        Palette: ${visualDNA.palette}
        Camera: ${visualDNA.camera}
      `;

      const scriptSegments = script.content.match(/[^\.!\?]+[\.!\?]+/g) || [script.content];
      const batchSize = 20;
      const totalBlocks = Math.ceil(scriptSegments.length / batchSize);
      
      let allPrompts = "";
      setPrompts(""); // Clear previous results before starting

      for (let i = 0; i < totalBlocks; i++) {
        setGenerationProgress({ 
          step: `Gerando Bloco ${i + 1} de ${totalBlocks}...`, 
          current: i + 1, 
          total: totalBlocks 
        });

        const startIdx = i * batchSize;
        const segment = scriptSegments.slice(startIdx, startIdx + batchSize).join(' ');

        const promptBatchQuery = `You are a world-class Visual Director and AI Video Prompt Engineer.
        Based on the VISUAL DNA below, create EXACTLY one ultra-realistic image prompt in ENGLISH for each sentence of the provided script.
        
        VISUAL DNA (Mandatory - Every prompt must strictly follow this): 
        ${dnaText}
        
        SCRIPT:
        "${segment}"
        
        RULES:
        - HYPER-REALISM: Use "8k, photorealistic, cinematic shot, raw film, high detail".
        - MOTION: Describe camera movement (tracking, pan, tilt) and subject action.
        - STYLE: Apply the visual identity from the DNA at all times.
        - FORMAT: Return only the prompts, one per line. No labels.
        - LANGUAGE: English only.`;

        const batchResult = await callGemini(geminiKey, promptBatchQuery);
        const batchPrompts = (batchResult || "").split('\n').map(p => p.trim()).filter(p => p.length > 20).join('\n\n');
        
        allPrompts += (allPrompts ? '\n\n' : '') + batchPrompts;
        setPrompts(prev => (prev ? prev + '\n\n' : '') + batchPrompts);
        setGenerationProgress(prev => ({ ...prev, step: `Bloco ${i + 1} de ${totalBlocks} Finalizado` }));
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      const newPool = {
        id: Date.now().toString(),
        title: script.title.toUpperCase(),
        context: visualDNA,
        content: allPrompts,
        count: (allPrompts || "").split('\n\n').filter(p => p.trim()).length,
        date: new Date().toLocaleString()
      };
      setPromptPools(stackPush('guru_image_prompt_pools', newPool));
      
    } catch (error) {
      console.error(error);
      alert("Erro na geração de alta fidelidade:\n" + error.message);
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
    const blob = new Blob([prompts], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prompts_${getActiveStyle().id}_${file?.name || 'project'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTransferToFlow = () => {
    if (!prompts) return;
    localStorage.setItem('guru_flow_transfer', prompts);
    if (setActiveTab) setActiveTab('whisk');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto h-full overflow-y-auto custom-scrollbar space-y-10">
      <header className="space-y-6">
        <div>
          <h2 className="text-4xl font-bold text-glow-pink text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-neon-pink to-neon-purple shadow-[0_0_20px_rgba(255,44,182,0.3)] overflow-hidden border border-white/10 shrink-0">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            Gerar Prompts de Imagem
          </h2>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            Faça o upload do seu SRT, escolha um estilo visual e gere os prompts perfeitos.
            <span className="flex items-center gap-1 px-2 py-0.5 bg-neon-purple/20 border border-neon-purple/30 rounded text-[10px] font-black text-neon-purple uppercase tracking-widest ml-2 animate-pulse">
              <Zap className="w-3 h-3 fill-current" /> Fidelidade Ativada
            </span>
          </p>
        </div>

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
              <option value="">-- Meus Projetos Salvos --</option>
              {availableScripts.map(s => (
                 <option key={s.id} value={s.id} className="bg-dark text-white">{s.title}</option>
              ))}
           </select>

           <button 
              onClick={analyzeVisualIdentity}
              disabled={isAnalyzing || (!selectedScriptId && subtitleBlocks.length === 0)}
              className="px-6 py-3 bg-white/5 border border-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 group"
            >
              {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-neon-pink" /> : <Eye className="w-3.5 h-3.5 group-hover:text-neon-pink transition-colors" />}
              Analisar Identidade Visual
            </button>

           <button 
              onClick={handleGenerateFromScript}
              disabled={!selectedScriptId || isGenerating || !visualDNA.scenario}
              className="px-8 py-3 bg-neon-purple/20 border border-neon-purple/40 text-neon-purple rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-purple/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(191,64,255,0.1)]"
           >
              {isGenerating && generationProgress.total > 0 ? (
                <LoadingSpinner message={generationProgress.step} size="sm" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Gerar em Bloco (20/Lote)
                </>
              )}
           </button>
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
      </header>

      {/* Style Selector */}
      <div className="glass-card p-6 space-y-6">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-neon-pink" /> 
          Estilo Visual — <span className="text-neon-pink">{getActiveStyle().label}</span>
        </h3>
        
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-16 gap-1.5">
          {VISUAL_STYLES.map(style => {
            const [emoji, ...textParts] = style.label.split(' ');
            const labelText = textParts.join(' ');
            const isSelected = selectedStyle === style.id;
            
            return (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                title={style.desc}
                className={`flex flex-col items-center justify-center gap-0.5 p-1.5 aspect-square rounded-lg transition-all duration-300 border group ${
                  isSelected
                    ? 'bg-neon-pink/20 border-neon-pink text-neon-pink shadow-[0_0_10px_rgba(255,44,182,0.2)]'
                    : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`text-base transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {emoji}
                </span>
                <span className={`text-[8px] font-black uppercase tracking-tighter text-center line-clamp-2 leading-[1.05] ${isSelected ? 'text-neon-pink' : 'text-gray-400 group-hover:text-white'}`}>
                  {labelText}
                </span>
              </button>
            );
          })}
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-neon-pink/5 border border-neon-pink/10 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-neon-pink/20 flex items-center justify-center shrink-0">
             <Zap className="w-4 h-4 text-neon-pink" />
          </div>
          <p className="text-xs text-gray-300 font-medium italic">{getActiveStyle().desc}</p>
        </div>
      </div>

      {/* Generation Area Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Upload and Controls */}
        <div className="space-y-6">
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

          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <button
                onClick={handleGenerate}
                disabled={!file || isGenerating}
                className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 ${
                  !file || isGenerating
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-600 to-neon-purple text-white hover:shadow-neon-pink hover:scale-[1.02]'
                }`}
              >
                {isGenerating ? (
                  <LoadingSpinner 
                    message={generationProgress.step || `Processando ${generationProgress.current}/${generationProgress.total}`} 
                    size="sm" 
                  />
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" /> Gerar {subtitleCount > 0 ? subtitleCount : ''} Prompts
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
            </div>

            <button
              onClick={handleTransferToFlow}
              disabled={!prompts || isGenerating}
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 ${
                !prompts || isGenerating
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-neon-cyan to-blue-600 text-white shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:scale-[1.02]'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" /> Enviar para Auto Flow e Gerar Imagens
            </button>
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
              {prompts && !isGenerating && (
                <button 
                  onClick={handleCopyPrompts}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                    isCopied 
                      ? 'bg-green-500/20 border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                  }`}
                >
                   {isCopied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                   {isCopied ? 'Copiado!' : 'Copiar'}
                </button>
              )}
              <button 
                onClick={() => prompts && setShowFullOutput(true)}
                disabled={!prompts}
                className="px-3 py-1 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-neon-cyan/20 transition-all disabled:opacity-30"
              >
                Visualizar
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-hidden bg-dark-lighter/50 font-mono text-sm leading-relaxed text-gray-300 relative">
            {prompts ? (
              <>
                <div className="h-full overflow-hidden italic line-clamp-[12] text-gray-500 opacity-50 select-none">
                  {prompts}
                </div>
                {/* Overlay Button */}
                <div 
                  onClick={() => setShowFullOutput(true)}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-dark/60 opacity-0 group-hover/output:opacity-100 transition-all cursor-pointer backdrop-blur-[2px] space-y-3"
                >
                   <div className="w-14 h-14 rounded-2xl bg-neon-cyan text-dark flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.4)] transform translate-y-4 group-hover/output:translate-y-0 transition-transform">
                      <Eye className="w-7 h-7" />
                   </div>
                   <span className="text-xs font-black text-white uppercase tracking-[0.3em] transform translate-y-4 group-hover/output:translate-y-0 transition-transform delay-75">Visualizar Prompts</span>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-dark-lighter to-transparent pointer-events-none" />
              </>
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
                       className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-3 ${
                         isCopied 
                           ? 'bg-green-500 text-white' 
                           : 'bg-white text-dark hover:bg-neon-pink hover:text-white'
                       }`}
                     >
                        {isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {isCopied ? 'Copiado com Sucesso!' : 'Copiar Tudo'}
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
                     <button 
                       onClick={() => {
                          handleTransferToFlow();
                          setShowFullOutput(false);
                       }}
                       className="px-10 py-5 bg-gradient-to-r from-neon-pink to-neon-purple rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
                     >
                        <Zap className="w-5 h-5 fill-current" /> Enviar para o Whisk e Gerar Agora
                        <ArrowRight className="w-5 h-5" />
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
                              onClick={() => { navigator.clipboard.writeText(pool.content); alert("Copiado!"); }}
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10"
                           >
                              <Copy className="w-3.5 h-3.5 text-gray-400" />
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
