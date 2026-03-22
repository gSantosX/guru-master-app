import React, { useState, useRef } from 'react';
import { UploadCloud, File, Wand2, Copy, Download, Image as ImageIcon, CheckCircle, RefreshCw } from 'lucide-react';

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

export const ImagePromptsTab = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [subtitleCount, setSubtitleCount] = useState(0);
  const [prompts, setPrompts] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('ultra-realista');
  const fileInputRef = useRef(null);
  const [subtitleBlocks, setSubtitleBlocks] = useState([]);

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

    try {
      const activeAi = localStorage.getItem('guru_active_ai') || 'Gemini';
      const styleInfo = getActiveStyle();
      const formattedInput = subtitleBlocks.map((b, i) => `[ID ${i+1}] ${b}`).join('\n');

      const promptParam = `You are a world-class visual director and AI image prompt engineer.
Your task is to convert each script fragment into a SINGLE, EXHAUSTIVE, photorealistic image generation prompt.

## RULES — FOLLOW STRICTLY:

1. **Extreme Fidelity to Script**: Each prompt must be DIRECTLY derived from its corresponding fragment.
   - Extract the EXACT scene, action, subject, environment and emotion described.
   - DO NOT invent elements that are not in the fragment.
   - If the fragment is narration/voice-over, visualize EXACTLY what is being spoken about.

2. **Visual Style for ALL prompts**: "${styleInfo.label}" — ${styleInfo.desc}
   - Enforce this style consistently throughout EVERY prompt.

3. **Photographic & Cinematic Realism**:
   - Respect physical laws: correct lighting, shadows, reflections, material textures.
   - Describe: camera angle (eye-level, low angle, bird's eye, Dutch tilt, etc.)
   - Describe: lens (50mm portrait, 24mm wide, 85mm shallow DOF, etc.)
   - Describe: lighting setup (golden hour, overcast, studio 3-point, rim light, etc.)
   - Describe: color palette (muted earth tones, high contrast, analogous blues, etc.)
   - Describe: mood/atmosphere (tense, serene, melancholic, epic, intimate, etc.)
   - Describe: environment details (textures of surfaces, time of day, weather, etc.)

4. **Prompt Quality Requirements**:
   - Minimum 40 words per prompt, maximum 120 words.
   - Use professional photography / cinematography vocabulary.
   - Each prompt must be self-contained and executable without context from other prompts.
   - Write in English only.

5. **Format** — MANDATORY (no extra text, no markdown, no numbering other than the ID):
${subtitleBlocks.map((_, i) => `${i+1}|[full prompt here]`).join('\n')}

## INPUT — Script Fragments to convert (${subtitleCount} total):
${formattedInput}

## OUTPUT — Return EXACTLY ${subtitleCount} prompts, one per line, in the format ID|PROMPT:`;


      let responseText = "";

      if (activeAi === 'Gemini') {
        const rawKey = localStorage.getItem('guru_gemini_key');
        const apiKey = rawKey ? rawKey.trim() : null;
        if (!apiKey) throw new Error("Chave Gemini ausente! Configure nas Configurações.");

        let result;
        try {
          const modelsRes = await fetch(`/api/gemini/v1beta/models?key=${apiKey}`);
          if (!modelsRes.ok) throw new Error("Falha ao buscar modelos Gemini.");
          const modelsData = await modelsRes.json();
          const targetModel =
            modelsData.models?.find(m => m.name.includes('gemini-2.5-flash') && m.supportedGenerationMethods?.includes('generateContent')) ||
            modelsData.models?.find(m => m.name.includes('gemini-2.0-flash') && m.supportedGenerationMethods?.includes('generateContent')) ||
            modelsData.models?.find(m => m.name.includes('gemini-1.5-flash') && m.supportedGenerationMethods?.includes('generateContent')) ||
            modelsData.models?.find(m => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'));

          if (targetModel) {
            const cleanModel = targetModel.name.replace('models/', '');
            const res = await fetch(`/api/gemini/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: promptParam }] }] })
            });
            const data = await res.json();
            if (data.candidates?.length > 0) result = data.candidates[0].content.parts[0].text;
            else if (data.error) throw new Error(`Gemini: ${data.error.message}`);
          }
        } catch(e) {
          if (!result) {
            const res = await fetch(`/api/gemini/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: promptParam }] }] })
            });
            const data = await res.json();
            if (data.candidates?.length > 0) result = data.candidates[0].content.parts[0].text;
            else throw new Error(`Gemini: ${data.error?.message || 'Resposta inválida'}`);
          }
        }
        responseText = result;

      } else if (activeAi === 'GPT') {
        const rawKey = localStorage.getItem('guru_gpt_key');
        const apiKey = rawKey ? rawKey.trim() : null;
        if (!apiKey) throw new Error("Chave GPT ausente! Configure nas Configurações.");
        const response = await fetch("/api/openai/v1/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: promptParam }] })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(`GPT: ${err.error?.message || response.statusText}`);
        }
        const data = await response.json();
        responseText = data.choices[0].message.content;

      } else if (activeAi === 'Grok') {
        const rawKey = localStorage.getItem('guru_grok_key');
        const apiKey = rawKey ? rawKey.trim() : null;
        if (!apiKey) throw new Error("Chave Grok ausente! Configure nas Configurações.");
        const response = await fetch("/api/grok/v1/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "grok-beta", messages: [{ role: "system", content: "You are a professional image prompt generator. Output only the requested format." }, { role: "user", content: promptParam }] })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(`Grok: ${err.error?.message || response.statusText}`);
        }
        const data = await response.json();
        responseText = data.choices[0].message.content;
      }

      if (!responseText) throw new Error("A IA não retornou nenhum conteúdo.");

      // Parse strictly ID|PROMPT lines
      const rawLines = responseText.split('\n').filter(l => /^\d+\s*\|/.test(l.trim()));
      let finalOutput = "";

      subtitleBlocks.forEach((block, idx) => {
        const expectedId = idx + 1;
        const matchedLine = rawLines.find(l => {
          const idPart = parseInt(l.trim().split('|')[0].trim());
          return idPart === expectedId;
        });

        if (matchedLine) {
          const promptOnly = matchedLine.substring(matchedLine.indexOf('|') + 1).trim();
          finalOutput += `${promptOnly}\n\n`;
        } else {
          finalOutput += `${styleInfo.desc}, cinematic scene illustrating: ${block.substring(0, 50)}...\n\n`;
        }
      });

      setPrompts(finalOutput.trim());

    } catch (error) {
      console.error(error);
      alert("Erro ao gerar prompts:\n" + error.message);
    } finally {
      setIsGenerating(false);
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

  return (
    <div className="p-8 max-w-6xl mx-auto h-full flex flex-col gap-6">
      <header>
        <h2 className="text-4xl font-bold text-glow-pink text-white flex items-center gap-3">
          <ImageIcon className="text-neon-pink w-10 h-10" />
          Gerar Prompts de Imagem
        </h2>
        <p className="text-gray-400 mt-2">Faça o upload do seu SRT, escolha um estilo visual e gere os prompts perfeitos.</p>
      </header>

      {/* Style Selector */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3">
          🎨 Estilo Visual — <span className="text-neon-pink">{getActiveStyle().label}</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {VISUAL_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              title={style.desc}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                selectedStyle === style.id
                  ? 'bg-neon-pink/20 border-neon-pink text-neon-pink shadow-[0_0_10px_rgba(255,44,182,0.3)]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30 hover:bg-white/10'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2 italic">{getActiveStyle().desc}</p>
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

          <div className="flex gap-3 mt-auto">
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
                <span className="flex items-center gap-2 animate-pulse">
                  <Wand2 className="w-5 h-5 animate-spin" /> Gerando Prompts...
                </span>
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
                  ? "Analisando cenas e aplicando estilo visual selecionado..."
                  : "Seus prompts de geração de imagem aparecerão aqui..."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
