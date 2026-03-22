import React, { useState, useRef } from 'react';
import { UploadCloud, File, Wand2, Copy, Download, Image as ImageIcon, CheckCircle } from 'lucide-react';

export const ImagePromptsTab = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [subtitleCount, setSubtitleCount] = useState(0);
  const [prompts, setPrompts] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const uploadedFile = e.dataTransfer.files[0];
    if (uploadedFile) processFile(uploadedFile);
  };

  const handleFileInput = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) processFile(uploadedFile);
  };

  const [subtitleBlocks, setSubtitleBlocks] = useState([]);

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
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!file || subtitleBlocks.length === 0) return;
    setIsGenerating(true);
    
    try {
      const activeAi = localStorage.getItem('guru_active_ai') || 'Gemini';
      const formattedInput = subtitleBlocks.map((b, i) => `[ID ${i+1}] ${b}`).join('\n');
      
      const promptParam = `Você é um gerador de prompts de imagem ultra-realistas.
Vou te dar exatamente ${subtitleCount} fragmentos de roteiro (legendas).
EU EXIJO QUE VOCÊ GERE EXATAMENTE ${subtitleCount} PROMPTS, NEM UM A MAIS, NEM UM A MENOS.

Formato OBRIGATÓRIO (cada prompt em apenas UMA linha, começando com o ID):
1|fotografia cinematográfica 8k de...
2|fotografia documental de...

FRACIONAMENTOS:
${formattedInput}

AGORA, RETORNE APENAS OS PROMPTS NO FORMATO "ID|PROMPT", UM POR LINHA:`;

      let responseText = "";
      
      // Chamando as APIs via Proxy
      if (activeAi === 'Gemini') {
          const rawKey = localStorage.getItem('guru_gemini_key');
          const apiKey = rawKey ? rawKey.trim() : null;
          if (!apiKey) throw new Error("Chave Gemini ausente!");

          let result;
          try {
             const modelsRes = await fetch(`/api/gemini/v1beta/models?key=${apiKey}`);
             const modelsData = await modelsRes.json();
             let targetModel = modelsData.models?.find(m => m.name.includes('gemini-1.5-flash') && m.supportedGenerationMethods?.includes('generateContent')) || modelsData.models?.find(m => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'));
             
             if (targetModel) {
                 const cleanModel = targetModel.name.replace('models/', '');
                 const res = await fetch(`/api/gemini/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: promptParam }] }] })
                 });
                 const data = await res.json();
                 if (data.candidates && data.candidates.length > 0) result = data.candidates[0].content.parts[0].text;
             }
          } catch(e) {}
          
          if (!result) {
              const res = await fetch(`/api/gemini/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                 method: 'POST', headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: promptParam }] }] })
              });
              const data = await res.json();
              if (data.candidates && data.candidates.length > 0) result = data.candidates[0].content.parts[0].text;
          }
          responseText = result;
      } else if (activeAi === 'GPT') {
          const rawKey = localStorage.getItem('guru_gpt_key');
          const apiKey = rawKey ? rawKey.trim() : null;
          if (!apiKey) throw new Error("Chave GPT ausente!");
          
          const response = await fetch("/api/openai/v1/chat/completions", {
              method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
              body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: promptParam }] })
          });
          const data = await response.json();
          responseText = data.choices[0].message.content;
      } else if (activeAi === 'Grok') {
          const rawKey = localStorage.getItem('guru_grok_key');
          const apiKey = rawKey ? rawKey.trim() : null;
          if (!apiKey) throw new Error("Chave Grok ausente!");
          
          const response = await fetch("/api/grok/v1/chat/completions", {
              method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
              body: JSON.stringify({ model: "grok-beta", messages: [{ role: "system", content: "You are a prompt generator." }, { role: "user", content: promptParam }] })
          });
          const data = await response.json();
          responseText = data.choices[0].message.content;
      }

      if (!responseText) throw new Error("Falha ao gerar os prompts via API.");

      // Limpar a saída e mapear estritamente
      const rawLines = responseText.split('\n').filter(l => l.includes('|'));
      let finalOutput = "";
      
      // Mapeamento forçado para ser exatamente 1:1 e pular 1 linha
      subtitleBlocks.forEach((block, idx) => {
          const expectedId = `${idx + 1}|`;
          const matchedLine = rawLines.find(l => l.startsWith(expectedId) || l.startsWith(`${idx+1} |`));
          
          if (matchedLine) {
              const promptOnly = matchedLine.substring(matchedLine.indexOf('|') + 1).trim();
              finalOutput += `${promptOnly}\n\n`; // Sem Cena X, pula linha
          } else {
              // Fallback se a IA comeu mosca:
              finalOutput += `Fotografia cinematográfica ultra-realista baseada no contexto: ${block.substring(0, 30)}...\n\n`;
          }
      });

      setPrompts(finalOutput.trim());
      
    } catch (error) {
      console.error(error);
      alert("Houve um erro conectando com a IA:\n" + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (prompts) navigator.clipboard.writeText(prompts);
  };

  const handleDownload = () => {
    if (!prompts) return;
    const blob = new Blob([prompts], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prompts_${file?.name || 'project'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <h2 className="text-4xl font-bold text-glow-pink text-white flex items-center gap-3">
          <ImageIcon className="text-neon-pink w-10 h-10" />
          Gerar Prompts de Imagem
        </h2>
        <p className="text-gray-400 mt-2">Faça o upload do seu SRT e nós criaremos os prompts de visualização perfeitos.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* Left: Upload and Controls */}
        <div className="space-y-6 flex flex-col">
          {/* Upload Area */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`glass-card p-10 flex flex-col items-center justify-center border-2 border-dashed cursor-pointer transition-all duration-300 relative overflow-hidden group
              ${isDragging ? 'border-neon-pink bg-neon-pink/10' : file ? 'border-green-500/50 bg-green-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".srt,.txt"
              onChange={handleFileInput}
            />
            
            {file ? (
              <>
                <div className="absolute inset-0 bg-green-500/5 pulse-animation pointer-events-none" />
                <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
                <h3 className="text-xl font-bold text-green-400">{file.name}</h3>
                <p className="text-green-400/70 mt-2">Arquivo carregado com sucesso.</p>
              </>
            ) : (
              <>
                <UploadCloud className={`w-16 h-16 mb-4 ${isDragging ? 'text-neon-pink' : 'text-gray-400 group-hover:text-white transition-colors'}`} />
                <h3 className="text-xl font-bold text-white mb-2">Upload de Legendas</h3>
                <p className="text-gray-400 text-center">Arraste e solte seu arquivo .srt ou .txt aqui<br/>ou clique para procurar</p>
              </>
            )}
          </div>

          {/* Stats Display */}
          {file && (
            <div className="glass-card p-6 flex justify-between items-center bg-gradient-to-r from-dark to-dark-lighter">
              <div className="text-center w-1/2 border-r border-white/10">
                <p className="text-gray-400 text-sm mb-1 uppercase tracking-wider">Legendas Encontradas</p>
                <p className="text-3xl font-bold text-white">{subtitleCount}</p>
              </div>
              <div className="text-center w-1/2">
                <p className="text-neon-pink/80 text-sm mb-1 uppercase tracking-wider">Prompts para Gerar</p>
                <p className="text-3xl font-bold text-neon-pink text-glow-pink">{subtitleCount}</p>
              </div>
            </div>
          )}

          <button 
            onClick={handleGenerate}
            disabled={!file || isGenerating}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 mt-auto ${
              !file || isGenerating
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-600 to-neon-purple text-white hover:shadow-neon-pink hover:scale-[1.02]'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2 animate-pulse">
                <Wand2 className="w-5 h-5 animate-spin" /> Sintetizando Prompts...
              </span>
            ) : (
              <>
                <Wand2 className="w-5 h-5" /> Gerar {subtitleCount > 0 ? subtitleCount : ''} Prompts
              </>
            )}
          </button>
        </div>

        {/* Right: Output Area */}
        <div className="glass-card flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-dark/30">
            <h3 className="font-bold text-white flex items-center gap-2">
              <File className="w-5 h-5 text-neon-pink" /> 
              Saída Gerada
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={handleCopy}
                disabled={!prompts}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-50 transition-colors"
                title="Copiar para a Área de Transferência"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDownload}
                disabled={!prompts}
                className="p-2 text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 rounded-lg disabled:opacity-50 transition-colors"
                title="Baixar .txt"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto bg-dark-lighter/50 font-mono text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
            {prompts ? (
              prompts
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 italic">
                {isGenerating ? "Analisando estruturas linguísticas e extraindo contexto visual..." : "Seus prompts de geração de imagem aparecerão aqui..."}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
