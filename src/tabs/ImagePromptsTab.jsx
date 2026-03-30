import React, { useState, useRef } from 'react';
import { UploadCloud, File, Wand2, Copy, Download, Image as ImageIcon, CheckCircle, RefreshCw, Zap, Sparkles } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { resolveApiUrl } from '../utils/apiUtils';
import { callGemini, callGPT, callGrok } from '../utils/aiUtils';

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
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [subtitleCount, setSubtitleCount] = useState(0);
  const [prompts, setPrompts] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('ultra-realista');
  const fileInputRef = useRef(null);
  const [subtitleBlocks, setSubtitleBlocks] = useState([]);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

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

  const handleGenerate = async () => {
    if (!file || subtitleBlocks.length === 0) return;
    setIsGenerating(true);
    setPrompts("");
    
    const CHUNK_SIZE = 50;
    const totalChunks = Math.ceil(subtitleBlocks.length / CHUNK_SIZE);
    setGenerationProgress({ current: 0, total: totalChunks });

    const activeAi = localStorage.getItem('guru_active_ai') || 'Gemini';
    const styleInfo = getActiveStyle();
    const gptKey = localStorage.getItem('guru_gpt_key')?.trim();
    const geminiKey = localStorage.getItem('guru_gemini_key')?.trim();
    
    let allGeneratedPrompts = "";
    let previousContext = ""; // To maintain cohesion

    try {
      for (let i = 0; i < totalChunks; i++) {
        setGenerationProgress({ current: i + 1, total: totalChunks });
        
        const startIdx = i * CHUNK_SIZE;
        const endIdx = Math.min(startIdx + CHUNK_SIZE, subtitleBlocks.length);
        const currentChunk = subtitleBlocks.slice(startIdx, endIdx);
        const chunkSubtitleCount = currentChunk.length;
        
        const formattedInput = currentChunk.map((b, idx) => `[ID ${startIdx + idx + 1}] ${b}`).join('\n');

        const promptParam = `You are a world-class Visual Director and AI Video Prompt Engineer.
YOUR MISSION: Transform script fragments into EXTREMELY DETAILED, CINEMATIC video prompts in English.

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
${currentChunk.map((_, idx) => `${startIdx + idx + 1}|[THE HIGH-DETAIL VIDEO PROMPT HERE]`).join('\n')}

## INPUT (Script fragments to convert):
${formattedInput}

## OUTPUT: Return EXACTLY ${chunkSubtitleCount} prompts, one per line, in the format ID|PROMPT:`;

        let responseText = "";

        // Smart Fallback per chunk
        try {
          if (!gptKey || gptKey.includes('YOUR_')) throw new Error("GPT key missing");
          responseText = await callGPT(gptKey, promptParam);
        } catch (gptError) {
          console.warn(`Block ${i + 1} GPT Failed, trying Gemini fallback:`, gptError);
          if (geminiKey && geminiKey.length > 5) {
            responseText = await callGemini(geminiKey, promptParam);
          } else {
            throw new Error(`Erro no Bloco ${i + 1}: Saldo do GPT insuficiente e Gemini não configurado.`);
          }
        }

        if (!responseText) throw new Error(`A IA não retornou conteúdo no Bloco ${i + 1}.`);

        // Parse strictly ID|PROMPT lines for this chunk
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

        allGeneratedPrompts += chunkOutput;
        setPrompts(prev => prev + chunkOutput); // Show incremental progress

        // Update context for next block cohesion (last 3 items)
        previousContext = `Keep visual consistency with the previous scene: ${lastThreePrompts.slice(-3).join(" | ")}`;
      }

    } catch (error) {
      console.error(error);
      alert("Erro durante a geração por blocos:\n" + error.message);
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  const handleCopy = () => { if (prompts) navigator.clipboard.writeText(prompts); };

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

  const handleTransferToWhisk = () => {
    if (!prompts) return;
    localStorage.setItem('guru_whisk_transfer', prompts);
    if (setActiveTab) setActiveTab('whisk');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar">
      <header>
        <h2 className="text-4xl font-bold text-glow-pink text-white flex items-center gap-3">
          <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-neon-pink to-neon-purple shadow-[0_0_20px_rgba(255,44,182,0.3)] overflow-hidden border border-white/10 shrink-0">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
          </div>
          Gerar Prompts de Imagem
        </h2>
        <p className="text-gray-400 mt-2 flex items-center gap-2">
          Faça o upload do seu SRT, escolha um estilo visual e gere os prompts perfeitos.
          <span className="flex items-center gap-1 px-2 py-0.5 bg-neon-purple/20 border border-neon-purple/30 rounded text-[10px] font-black text-neon-purple uppercase tracking-widest ml-2 animate-pulse">
            <Zap className="w-3 h-3 fill-current" /> Motor GPT Ativado
          </span>
        </p>
      </header>

      {/* Style Selector */}
      <div className="glass-card p-6">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
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
        
        <div className="mt-6 flex items-center gap-3 p-3 bg-neon-pink/5 border border-neon-pink/10 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-neon-pink/20 flex items-center justify-center shrink-0">
             <Zap className="w-4 h-4 text-neon-pink" />
          </div>
          <p className="text-xs text-gray-300 font-medium italic">{getActiveStyle().desc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* Left: Upload and Controls */}
        <div className="space-y-4 flex flex-col">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`glass-card p-8 flex flex-col items-center justify-center border-2 border-dashed cursor-pointer transition-all duration-300 relative overflow-hidden group
              ${isDragging ? 'border-neon-pink bg-neon-pink/10' : file ? 'border-green-500/50 bg-green-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}
            `}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".srt,.txt" onChange={handleFileInput} />
            {file ? (
              <>
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
            <div className="glass-card p-4 flex justify-between items-center">
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

          <div className="flex flex-col gap-3 mt-auto">
            <div className="flex gap-3">
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
                  <LoadingSpinner message={generationProgress.total > 0 ? `Bloco ${generationProgress.current} de ${generationProgress.total}...` : "Gerando Prompts..."} size="sm" />
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" /> Gerar {subtitleCount > 0 ? subtitleCount : ''} Prompts
                  </>
                )}
              </button>

              {prompts && !isGenerating && (
                <button
                  onClick={handleGenerate}
                  title="Gerar novamente com o mesmo arquivo e estilo"
                  className="px-4 py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 bg-white/10 text-white hover:bg-white/20 hover:scale-[1.02] border border-white/20"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
            </div>

            <button
              onClick={handleTransferToWhisk}
              disabled={!prompts || isGenerating}
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 ${
                !prompts || isGenerating
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-neon-cyan to-blue-600 text-white shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:scale-[1.02]'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" /> Gerar Imagens (Whisk)
            </button>
          </div>
        </div>

        {/* Right: Output Area */}
        <div className="glass-card flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-dark/30">
            <h3 className="font-bold text-white flex items-center gap-2">
              <File className="w-5 h-5 text-neon-pink" />
              Saída Gerada
              {prompts && <span className="text-xs text-gray-500 font-normal">— estilo {getActiveStyle().label}</span>}
            </h3>
            <div className="flex gap-2">
              <button onClick={handleCopy} disabled={!prompts} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50 transition-colors" title="Copiar tudo">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={handleDownload} disabled={!prompts} className="p-2 text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 rounded-lg disabled:opacity-50 transition-colors" title="Baixar .txt">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-dark-lighter/50 font-mono text-sm leading-relaxed text-gray-300 whitespace-pre-wrap custom-scrollbar">
            {prompts ? (
              prompts
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 italic">
              {isGenerating
                  ? <LoadingSpinner message="Analisando cenas e aplicando estilo..." size="md" />
                  : "Seus prompts de geração de imagem aparecerão aqui..."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
