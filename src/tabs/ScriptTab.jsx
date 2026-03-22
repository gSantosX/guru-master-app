import { useState } from 'react';
import { Wand2, Type, Layout, Target, FileText, Download, FileJson, File as FilePdf, Settings, BookOpen, Copy, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useSystemStatus } from '../contexts/SystemStatusContext';

const DNA_OPTIONS = [
  "Linear Tradicional", "Jornada do Herói", "O Grande Mistério", "Ponto vs Contraponto",
  "Pirâmide Invertida", "Cinematográfico Visceral", "Lista em Contagem Regressiva", 
  "A Grande Mentira", "Problema e Solução", "Antes e Depois", "O Método Científico",
  "Narrativa Imersiva (Você)", "Análise de Caso Real", "Círculo Narrativo", 
  "Fatos Curiosos em Cadeia", "Perspectiva em Primeira Pessoa", "Análise de Portfólio Real",
  "O Caminho da Liberdade Financeira", "Raio-X do Mercado", "Ensinamento Financeiro Estruturado"
];

const ALMA_OPTIONS = [
  "Amigável e Casual", "Sarcástica e Ácida", "Acolhedora e Empática", "Épica e Cinematográfica",
  "Misteriosa e Sombria", "Didática e Leve", "Autoritária e Confiante", "Inspiradora e Poética",
  "Cética e Provocadora", "Entusiasta e Vibrante", "Zen e Relaxante", "Confessional e Íntima",
  "Reflexão Bíblica Profunda", "Análise Teológica Contemplativa", "Ensinamentos Bíblicos Aprofundados",
  "Estudo Devocional Narrado", "Educacional Espiritual", "Pragmática e Analítica",
  "Visionária e Estratégica", "Paternalista e Educativa"
];

const CTA_OPTIONS = [
  "Viral (Engajamento)", "Conversão (Inscrição)", "Venda (Produto)", "Curiosidade (Próximo Vídeo)",
  "Desafio (Interação)", "Comunidade (Membro)", "Espiritual (Reflexão)", "Sutil (Invisível)", "Sem CTA"
];

const NICHO_OPTIONS = [
  "Documentário", "História", "Finanças", "Mistérios", "Crimes reais", "Espiritualidade",
  "Motivação", "Educação", "Curiosidades", "Histórias emocionantes", "Relacionamentos",
  "Saúde", "Tecnologia", "Outro"
];

const IDIOMA_OPTIONS = [
  "Português (BR)", "Português (PT)", "Inglês", "Espanhol", "Francês", "Alemão", 
  "Italiano", "Japonês", "Chinês", "Russo", "Árabe", "Coreano", "Hindi"
];

const FORMATO_OPTIONS = ["Por Partes", "Texto Corrido", "Lista"];

const NATUREZA_OPTIONS = ["Dados Reais (usar pesquisa web)", "Ficção (criatividade pura)"];

export const ScriptTab = ({ setActiveTab }) => {
  const { configs } = useSystemStatus();
  const [titulo, setTitulo] = useState('');
  // ... (other state stays the same)
  const [dna, setDna] = useState('Jornada do Herói');
  const [alma, setAlma] = useState('Épica e Cinematográfica');
  const [cta, setCta] = useState('Viral (Engajamento)');
  const [nicho, setNicho] = useState('Documentário');
  const [idioma, setIdioma] = useState('Português (BR)');
  const [formato, setFormato] = useState('Texto Corrido');
  const [natureza, setNatureza] = useState('Dados Reais (usar pesquisa web)');
  const [tamanho, setTamanho] = useState(5000);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!generatedScript) return;
    try {
      await navigator.clipboard.writeText(generatedScript.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedScript(null);
    
    setTimeout(async () => {
      try {
        const promptParam = `Você é um roteirista profissional especialista em vídeos virais e storytelling.
Sua missão é criar um roteiro altamente envolvente, focado 100% na locução, como se fosse o texto exato para um narrador gravar.

Use a seguinte configuração de direcionamento:
Tema/Assunto: ${titulo || 'Vídeo Viral'}
Estrutura narrativa ("DNA"): ${dna}
Tom narrativo ("Alma"): ${alma}
Tipo de chamada para ação (CTA): ${cta}
Idioma: ${idioma}
Natureza: ${natureza}
Tamanho aproximado e complexidade: Roteiro adequado para ${tamanho} caracteres.

REGRAS DE FORMATAÇÃO (CRÍTICO - SIGA RIGOROSAMENTE):
- O TEXTO DEVE SER 100% CORRIDO, PRONTO PARA O NARRADOR LER IMEDIATAMENTE.
- NÃO ADICIONE DIVISÕES POR PARTES (Introdução, Desenvolvimento, Conclusão).
- NÃO ADICIONE TÍTULO ALGUM NO INÍCIO OU FIM.
- NÃO ADICIONE MARCAÇÕES CÊNICAS COMO [Texto na tela], [Música sobe], [Locutor], [Cena 1], [Pausa], [Transição].
- NÃO USE MARKDOWN: SEM NEGRITO (**), SEM ITÁLICO (*), SEM LISTAS COM BULLETS. ZERO FORMATAÇÃO.
- O SEU RETORNO DEVE CONTER APENAS AS PALAVRAS EXATAS QUE SERÃO FALADAS PELO NARRADOR, MAIS NADA.

Regras de escrita:
- Alternar frases curtas e longas para ritmo
- Criar suspense e retenção profunda
- Evitar clichês de IA (ex: "Bem-vindo ao canal", "Você sabia?", "Em conclusão")
- Usar linguagem natural, emocional e fluida
- Inserir a CTA de forma 100% orgânica
- Foco absoluto em manter quem está ouvindo preso à história

Escreva o roteiro exatamente abaixo:
`;

        const activeAi = configs.active_ai;
        let scriptContent = "";
        let validScript = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 5;

        // Calculando Metas e Palavras
        const numPalavras = Math.floor(tamanho / 6);
        let dynamicPrompt = promptParam.replace(
           `Roteiro adequado para \${tamanho} caracteres.`,
           `Roteiro adequado para ${tamanho} caracteres (aproximadamente ${numPalavras} palavras).`
        );
        let currentPrompt = dynamicPrompt;
        let isContinuation = false;

        while (!validScript && attempts < MAX_ATTEMPTS) {
          attempts++;
          
          if (isContinuation) {
             const deficit = tamanho - scriptContent.length;
             const excerpt = scriptContent.length > 500 ? scriptContent.substring(scriptContent.length - 500) : scriptContent;
             currentPrompt = `Continue exatamente o roteiro abaixo, sem títulos e sem explicações. Aja como se estivesse apenas digitando a continuação direta das próximas frases da locução.
Gere mais conteúdo até bater a marca de adicionar +${deficit} caracteres na história total.
ÚLTIMO TRECHO:
"...${excerpt}"

CONTINUE IMEDIATAMENTE A PARTIR DAQUI (apenas texto narrado):`;
          }

          let responseText = "";

          if (activeAi === 'Gemini') {
            const apiKey = configs.gemini_key;
            if (!apiKey || apiKey.includes('YOUR_GEMINI_KEY_HERE')) {
              alert("⚠️ Chave de API do Gemini não encontrada!\n\nPor favor, vá para a aba de Configurações e insira sua chave antes de gerar o roteiro.");
              setIsGenerating(false);
              return;
            }
            let result;
            let lastError = null;

            try {
               const modelsRes = await fetch(`/api/gemini/v1beta/models?key=${apiKey}`);
               const modelsData = await modelsRes.json();
               if (modelsData.models) {
                  let targetModel = modelsData.models.find(m => m.name.includes('gemini-1.5-flash') && m.supportedGenerationMethods?.includes('generateContent'));
                  if (!targetModel) {
                      targetModel = modelsData.models.find(m => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'));
                  }
                  
                  if (targetModel) {
                      const cleanModelName = targetModel.name.replace('models/', '');
                      const res = await fetch(`/api/gemini/v1beta/models/${cleanModelName}:generateContent?key=${apiKey}`, {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({
                            contents: [{ role: "user", parts: [{ text: currentPrompt }] }]
                         })
                      });
                      const data = await res.json();
                      if (data.error) throw new Error(data.error.message);
                      if (data.candidates && data.candidates.length > 0) result = data.candidates[0].content.parts[0].text;
                  }
               } else if (modelsData.error) lastError = new Error(modelsData.error.message);
            } catch(e) { }

            if (!result) {
              const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];
              for (const modelName of modelsToTry) {
                try {
                    const res = await fetch(`/api/gemini/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                       method: 'POST', headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: currentPrompt }] }] })
                    });
                    const data = await res.json();
                   if (data.error && data.error.code === 404) throw new Error("404");
                   if (data.error) throw new Error(data.error.message);
                   if (data.candidates && data.candidates.length > 0) { result = data.candidates[0].content.parts[0].text; break; }
                } catch (e) {
                   lastError = e;
                   if (!e.message || !e.message.includes('404')) break;
                }
              }
            }
            if (!result) throw lastError || new Error("Não foi possível conectar ao Gemini.");
            responseText = result;
            
          } else if (activeAi === 'GPT') {
            const apiKey = configs.gpt_key;
            if (!apiKey || apiKey.includes('YOUR_GPT_KEY_HERE')) { alert("⚠️ Chave API GPT não encontrada!"); setIsGenerating(false); return; }
            
            const reqUrl = "/api/openai/v1/chat/completions";
            const response = await fetch(reqUrl, {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: currentPrompt }] })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            responseText = data.choices[0].message.content;

          } else if (activeAi === 'Grok') {
            const apiKey = configs.grok_key;
            if (!apiKey || apiKey.includes('YOUR_GROK_KEY_HERE')) { alert("⚠️ Chave API Grok não encontrada!"); setIsGenerating(false); return; }
            
            const response = await fetch("/api/grok/v1/chat/completions", {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({ model: "grok-beta", messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: currentPrompt }] })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            responseText = data.choices[0].message.content;
          }

          // Agrega o texto da IA (limpando o marcador de continuação se ela escrever algo indesejado)
          if (isContinuation) {
              responseText = responseText.replace(/CONTINUE.*/gi, '').trim(); // Algumas IAs ecoam o comando
              scriptContent += " " + responseText;
          } else {
              scriptContent = responseText;
          }

          // Verificação Matemática de Margem
          const margin = 2000;
          const minLen = Math.max(0, tamanho - margin);
          const maxLen = tamanho + margin;
          
          if (scriptContent.length > maxLen) {
              // Cortar o excesso de forma semântica (no último ponto final válido dentro do tamanho)
              const overflowPos = maxLen;
              let sliceText = scriptContent.substring(0, overflowPos);
              const lastDot = Math.max(sliceText.lastIndexOf('. '), sliceText.lastIndexOf('!'), sliceText.lastIndexOf('?'));
              if (lastDot > 0) {
                  scriptContent = sliceText.substring(0, lastDot + 1);
              } else {
                  scriptContent = sliceText;
              }
              validScript = true;
          } else if (scriptContent.length < minLen) {
              // Pedir para continuar na proxima iteracao do while
              isContinuation = true;
              console.warn(`Tentativa ${attempts}: Roteiro com ${scriptContent.length} caracteres. Ainda faltam ${tamanho - scriptContent.length}. Continuando geração...`);
          } else {
              // Está dentro da margem exata
              validScript = true;
          }
        }

        const newProject = {
          id: Date.now().toString(),
          title: titulo || 'Roteiro Gerado pela IA',
          niche: nicho,
          date: new Date().toLocaleString(),
          length: scriptContent.length,
          content: scriptContent
        };

        const existing = JSON.parse(localStorage.getItem('guru_scripts') || '[]');
        localStorage.setItem('guru_scripts', JSON.stringify([newProject, ...existing]));
        
        setGeneratedScript(newProject);
        setTitulo(''); // Limpar o campo de titulo para nova geração
        
        // Redirecionar para a aba de roteiros prontos após um pequeno delay para o usuário ver o sucesso
        setTimeout(() => {
          setActiveTab('ready-scripts');
        }, 1500);
      } catch (error) {
        console.error("Erro na API geradora:", error);
        alert(`Não foi possível conectar com a IA.\n\nDetalhe do Erro: ${error.message || error}\n\n1. Verifique se colou a chave inteira nas configurações.`);
      } finally {
        setIsGenerating(false);
      }
    }, 500); // Small initial delay for UI animation to kick in
  };

  const clearCurrentScript = () => {
    setGeneratedScript(null);
    setTitulo('');
  };

  const handleDownloadTxt = () => {
    if (!generatedScript) return;
    const blob = new Blob([generatedScript.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedScript.title.replace(/ /g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSrt = () => {
    if (!generatedScript) return;
    // VERY simple mock SRT generator
    const lines = generatedScript.content.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('['));
    let srtData = "";
    lines.forEach((line, idx) => {
      srtData += `${idx + 1}\n`;
      srtData += `00:00:${String(idx*2).padStart(2,'0')},000 --> 00:00:${String((idx*2)+2).padStart(2,'0')},000\n`;
      srtData += `${line}\n\n`;
    });
    const blob = new Blob([srtData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedScript.title.replace(/ /g, '_')}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!generatedScript) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    // basic text splitting for PDF
    const splitText = doc.splitTextToSize(generatedScript.content, 180);
    doc.text(splitText, 15, 20);
    doc.save(`${generatedScript.title.replace(/ /g, '_')}.pdf`);
  };

  const OptionGrid = ({ options, selected, onSelect, color }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border
            ${selected === opt 
              ? `bg-${color}/20 text-${color} border-${color} shadow-[0_0_10px_currentColor] scale-105` 
              : 'bg-dark/30 text-gray-400 border-white/5 hover:border-white/20 hover:text-white'
            }
          `}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full w-full max-w-[1600px] mx-auto p-4 md:p-6 gap-6 overflow-y-auto lg:overflow-hidden">
      {/* Left Column - Form & Configurations */}
      <div className="w-full lg:w-7/12 flex flex-col h-auto lg:h-full overflow-y-visible lg:overflow-y-auto pr-0 lg:pr-4 custom-scrollbar shrink-0">
        <header className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-4xl font-black text-glow-cyan text-white flex items-center gap-2 md:gap-3 tracking-tight">
            <Wand2 className="text-neon-cyan w-8 h-8 md:w-10 md:h-10 shrink-0" />
            Gerador de Roteiros
          </h2>
          <p className="text-neon-pink/80 mt-2 font-medium text-base md:text-lg">Escolha o DNA e a Alma da sua história</p>
        </header>

        <div className="space-y-6 md:space-y-8 pb-10">
          
          {/* CAMPO 1 */}
          <div className="glass-card p-6 border-l-4 border-l-neon-cyan relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-neon-cyan/10 transition-colors" />
            <label className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2 uppercase tracking-widest">
              <span className="text-neon-cyan">01</span> Título do Vídeo
            </label>
            <input 
              type="text"
              className="w-full bg-dark/60 border border-white/10 rounded-xl p-4 text-white text-lg focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all shadow-inner"
              placeholder="Ex: O segredo oculto das pirâmides..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          {/* CAMPO 2 */}
          <div className="glass-card p-6 border-l-4 border-l-neon-purple relative overflow-hidden group">
             <label className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <span className="text-neon-purple">02</span> Estrutura Narrativa (DNA)
            </label>
            <OptionGrid options={DNA_OPTIONS} selected={dna} onSelect={setDna} color="neon-purple" />
          </div>

          {/* CAMPO 3 */}
          <div className="glass-card p-6 border-l-4 border-l-neon-pink relative overflow-hidden group">
            <label className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <span className="text-neon-pink">03</span> Entonação Ultra-Humana (Alma)
            </label>
            <OptionGrid options={ALMA_OPTIONS} selected={alma} onSelect={setAlma} color="neon-pink" />
          </div>

          {/* CAMPO 4 */}
          <div className="glass-card p-6 border-l-4 border-l-green-400 relative overflow-hidden group">
            <label className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <span className="text-green-400">04</span> Chamada Para Ação (CTA)
            </label>
            <OptionGrid options={CTA_OPTIONS} selected={cta} onSelect={setCta} color="green-400" />
          </div>

          {/* CONFIGURAÇÕES SECUNDÁRIAS */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-3">
              <Settings className="w-5 h-5 text-gray-400" /> Configurações Secundárias
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-2">Nicho</label>
                <select className="w-full bg-dark/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30" value={nicho} onChange={e=>setNicho(e.target.value)}>
                  {NICHO_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-2">Idioma</label>
                <select className="w-full bg-dark/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30" value={idioma} onChange={e=>setIdioma(e.target.value)}>
                  {IDIOMA_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-2">Formato do Roteiro</label>
                <select className="w-full bg-dark/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30" value={formato} onChange={e=>setFormato(e.target.value)}>
                  {FORMATO_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-2">Natureza do Conteúdo</label>
                <select className="w-full bg-dark/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30" value={natureza} onChange={e=>setNatureza(e.target.value)}>
                  {NATUREZA_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* SLIDER TAMANHO */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Tamanho do Roteiro</label>
                <span className="text-neon-cyan font-bold font-mono bg-neon-cyan/10 px-2 py-1 rounded">{tamanho} caracteres</span>
              </div>
              <input 
                type="range" 
                min="1000" 
                max="20000" 
                step="500"
                value={tamanho}
                onChange={(e) => setTamanho(Number(e.target.value))}
                className="w-full h-2 bg-dark-lighter rounded-lg appearance-none cursor-pointer accent-neon-cyan"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>1.000 (Curto)</span>
                <span>20.000 (Longo)</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !titulo}
            className={`w-full py-5 rounded-xl flex items-center justify-center gap-3 font-black text-lg transition-all duration-300 transform active:scale-[0.98] ${
              isGenerating || !titulo
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-neon-cyan via-blue-500 to-neon-purple text-white shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:shadow-[0_0_50px_rgba(0,243,255,0.6)] hover:scale-[1.01]'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center gap-3 animate-pulse">
                <Wand2 className="w-6 h-6 animate-spin" /> Gerando Obra-Prima...
              </span>
            ) : (
              <>
                <Wand2 className="w-6 h-6" /> Gerar Roteiro Profissional
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column - Preview & Output */}
      <div className="w-full lg:w-5/12 h-[600px] lg:h-full flex flex-col shrink-0 pb-6 lg:pb-0 font-sans">
          <div className="glass-card flex flex-col h-full relative overflow-hidden border border-white/10 shadow-2xl">
            {/* Ambient Background Glow inside the card */}
            <div className="absolute top-0 right-0 w-full h-64 bg-gradient-to-b from-neon-cyan/5 to-transparent pointer-events-none" />
            
            <div className="p-5 border-b border-white/10 bg-dark/40 flex justify-between items-center z-10 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="text-neon-cyan w-5 h-5" /> Visualizador de Roteiro
              </h3>
              {generatedScript && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold uppercase tracking-wider">Pronto</span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 relative z-10 bg-dark-lighter/30 custom-scrollbar">
              {isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center text-neon-cyan/60 animate-pulse">
                  <div className="relative mb-6">
                     <div className="w-20 h-20 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin" />
                     <Wand2 className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-neon-cyan" />
                  </div>
                  <p className="font-bold text-lg">Iniciando Redes Neurais...</p>
                  <p className="text-sm mt-3 text-gray-400 max-w-xs text-center">Injetando DNA '{dna}' e Alma '{alma}' na estrutura narrativa...</p>
                </div>
              ) : generatedScript ? (
                <div className="animate-fade-in">
                  <div className="mb-6 bg-dark/50 p-4 rounded-xl border border-white/5 shadow-inner">
                     <h4 className="text-2xl font-black text-white mb-2 leading-tight">{generatedScript.title}</h4>
                     <div className="flex flex-wrap gap-2 text-xs font-mono text-gray-400">
                       <span className="bg-white/5 px-2 py-1 rounded text-neon-cyan">{generatedScript.niche}</span>
                       <span className="bg-white/5 px-2 py-1 rounded text-neon-pink">{dna}</span>
                       <span className="bg-white/5 px-2 py-1 rounded">{generatedScript.date}</span>
                     </div>
                  </div>
                  <div className="font-mono text-[13.5px] text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {generatedScript.content}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500/60 italic flex h-full items-center justify-center text-center text-lg font-medium p-8">
                  Seu roteiro magistral ganhará vida aqui...<br/><br/>Preencha os campos e inicie a geração.
                </p>
              )}
            </div>
            
            <div className="p-4 bg-dark/60 border-t border-white/10 z-10 sticky bottom-0 backdrop-blur-md flex flex-col gap-3">
              {generatedScript && (
                <button 
                  onClick={clearCurrentScript}
                  className="w-full py-3 rounded-lg bg-neon-cyan/20 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/30 transition-all font-bold flex items-center justify-center gap-2 text-sm shadow-[0_0_10px_rgba(0,243,255,0.2)]"
                >
                  + Iniciar Novo Roteiro
                </button>
              )}
              <div className="flex justify-between gap-3">
                <button 
                  onClick={handleDownloadTxt}
                  disabled={!generatedScript} 
                  className="flex-1 py-3 rounded-lg bg-dark border border-white/10 text-gray-300 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all font-medium disabled:opacity-30 flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" /> Baixar TXT
                </button>
                <button 
                  onClick={handleDownloadSrt}
                  disabled={!generatedScript} 
                  className="flex-1 py-3 rounded-lg bg-dark border border-white/10 text-gray-300 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all font-medium disabled:opacity-30 flex items-center justify-center gap-2 text-sm"
                >
                  <FileJson className="w-4 h-4" /> Baixar SRT
                </button>
                <button 
                  onClick={handleExportPdf}
                  disabled={!generatedScript} 
                  className="flex-1 py-3 rounded-lg bg-dark border border-white/10 text-gray-300 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all font-medium disabled:opacity-30 flex items-center justify-center gap-2 text-sm"
                >
                  <FilePdf className="w-4 h-4" /> PDF
                </button>
              </div>
              {generatedScript && (
                <button 
                  onClick={handleCopy}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all group overflow-hidden relative ${
                    isCopied 
                    ? 'bg-green-500/20 border border-green-500 text-green-400' 
                    : 'bg-white text-dark hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-5 h-5 animate-bounce" /> Copiado com Sucesso!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 group-hover:scale-110 transition-transform" /> Copiar Roteiro Completo
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};
