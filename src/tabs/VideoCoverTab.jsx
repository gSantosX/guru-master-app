import React, { useState, useEffect } from 'react';
import { ImageIcon, Wand2, Download, RefreshCw, AlertCircle, Type, Sparkles, Zap, Box, Copy, Check } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { resolveApiUrl } from '../utils/apiUtils';
import { callGemini, callGPT } from '../utils/aiUtils';

// Helper: use GPT to build a detailed visual prompt for the cover
async function buildCoverPromptWithGPT(title, apiKey) {
    const instruction = `You are an expert YouTube thumbnail art director. 
Given the video title: "${title}"
Generate a detailed, vivid image generation prompt (in English) for a professional YouTube thumbnail.
The prompt must describe: main subject, background, lighting, colors, mood, composition, style.
Example style: "cinematic wide shot of [subject], dramatic lighting, vibrant colors, ..."
Return ONLY the raw image prompt, no explanations, no quotes, no markdown.`;

    return await callGPT(apiKey, instruction);
}

// Helper: use Gemini to build a detailed visual prompt for the cover (fallback)
async function buildCoverPromptWithGemini(title, apiKey) {
    const instruction = `You are an expert YouTube thumbnail art director. 
Given the video title: "${title}"
Generate a detailed, vivid image generation prompt (in English) for a professional YouTube thumbnail.
The prompt must describe: main subject, background, lighting, colors, mood, composition, style.
Example style: "cinematic wide shot of [subject], dramatic lighting, vibrant colors, ..."
Return ONLY the raw image prompt, no explanations, no quotes, no markdown.`;

    return await callGemini(apiKey, instruction);
}

// Helper: generate actual image via Pollinations.ai (free, no key)
function buildPollinationsUrl(prompt, seed) {
    const encoded = encodeURIComponent(prompt + ', youtube thumbnail, high quality, vibrant, 16:9');
    return `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&seed=${seed}&nologo=true&enhance=true`;
}

export const VideoCoverTab = ({ isActive }) => {
    const { configs } = useSystemStatus();
    const [scripts, setScripts] = useState([]);
    const [selectedScript, setSelectedScript] = useState(null);
    const [titles, setTitles] = useState([]);
    const [shockWords, setShockWords] = useState({ one: '', two: '', three: '' });
    const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);
    
    const ENGINES = [
        { id: 'pollinations', name: 'Pollinations AI', icon: Zap, color: 'neon-cyan', desc: 'Geração rápida, ilimitada e gratuita.', focus: 'shadow-[0_0_20px_rgba(0,243,255,0.2)] border-neon-cyan bg-neon-cyan/5' },
        { id: 'dalle3', name: 'OpenAI DALL-E 3', icon: Sparkles, color: 'neon-pink', desc: 'Qualidade suprema. Requer API Key com saldo.', focus: 'shadow-[0_0_20px_rgba(255,0,110,0.2)] border-neon-pink bg-neon-pink/5' },
        { id: 'prompt_only', name: 'Apenas Prompt', icon: Box, color: 'neon-purple', desc: 'Não gerar imagem. Cria texto para o Whisk/Discord.', focus: 'shadow-[0_0_20px_rgba(191,64,255,0.2)] border-neon-purple bg-neon-purple/5' }
    ];
    const [selectedEngine, setSelectedEngine] = useState('pollinations');

    // covers: { [index]: { url, prompt, loading, error, isPromptOnly } }
    const [covers, setCovers] = useState({});

    useEffect(() => {
        if (!isActive) return;
        const saved = JSON.parse(localStorage.getItem('guru_scripts') || '[]');
        setScripts(Array.isArray(saved) ? saved : []);
    }, [isActive]);

    const handleSelectScript = (script) => {
        setSelectedScript(script);
        setTitles([
            { text: script.title, label: 'Titulo Original', isOriginal: true },
            { text: '', label: 'Carregando Oportunidades...', isOriginal: false },
            { text: '', label: 'Carregando Oportunidades...', isOriginal: false }
        ]);
        setShockWords({ one: '', two: '', three: '' });
        setCovers({});
        generateTitleVariations(script.title);
    };

    const handleReset = () => {
        setSelectedScript(null);
        setTitles([]);
        setShockWords({ one: '', two: '', three: '' });
        setCovers({});
    };

    const generateTitleVariations = async (originalTitle) => {
        if (!originalTitle) return;
        setIsGeneratingTitles(true);
        try {
            const apiKey = configs?.gemini_key || localStorage.getItem('guru_gemini_key');
            if (!apiKey) throw new Error('Chave Gemini não configurada.');

            const prompt = `Analise o título de vídeo original: "${originalTitle}".
Crie 2 novas opções de títulos com altíssimo potencial de viralização no YouTube, na mesma língua do original.
As variações NÃO devem ser iguais entre si. Use gatilhos mentais diferentes (ex: uma focada em Curiosidade extrema, e a outra focada em Uma Promessa Irresistível/Urgência).
Identifique qual das duas tem o MAIOR potencial viral para se tornar a principal.

Além disso, identifique 3 "Palavras Choque" (palavras curtas e impactantes para usar na CAPA/THUMBNAIL):
1. Uma única palavra (ex: "REVELADO", "CHOQUE", "ERROU")
2. Duas palavras (ex: "SÓ ISSO?", "POR QUE?")
3. Três palavras (ex: "TOTALMENTE DE GRAÇA", "VAI ACABAR HOJE")

Retorne ESTRITAMENTE um objeto JSON exatamente como este:
{
  "variations": [
    { "text": "...", "label": "Variação ...", "is_best": false },
    { "text": "...", "label": "Mais Viral ...", "is_best": true }
  ],
  "shockWords": {
    "one": "...",
    "two": "...",
    "three": "..."
  }
}`;

            const result = await callGemini(apiKey, prompt);

            let parsed = { variations: [], shockWords: { one: '-', two: '-', three: '-' } };
            try {
                const cleanResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(cleanResult);
            } catch (e) {
                console.error("JSON parse failed, fallback text processing:", e);
                const lines = result.split('\n').filter(t => t.trim().length > 3);
                parsed = {
                    variations: [
                        { text: lines[0] || 'Variação Alternativa 1', label: 'Variação de Curiosidade', is_best: false },
                        { text: lines[1] || 'Variação Alternativa 2', label: 'Garantia Viral ⭐', is_best: true }
                    ],
                    shockWords: { one: 'AGORA', two: 'COMO ASSIM?', three: 'VERDADE REVELADA' }
                };
            }

            setTitles([
                { text: originalTitle, label: 'Título Original', isOriginal: true },
                { text: parsed.variations?.[0]?.text || 'Erro ao gerar', label: parsed.variations?.[0]?.label || 'Variação 1', is_best: Boolean(parsed.variations?.[0]?.is_best) },
                { text: parsed.variations?.[1]?.text || 'Erro ao gerar', label: parsed.variations?.[1]?.label || 'Variação 2', is_best: Boolean(parsed.variations?.[1]?.is_best) }
            ]);
            // Robust parsing for shock words
            const sw = parsed.shockWords || parsed.shock_words || parsed.palavras_choque || {};
            setShockWords({
                one: sw.one || sw.palavra1 || sw.first || '-',
                two: sw.two || sw.palavra2 || sw.second || '-',
                three: sw.three || sw.palavra3 || sw.third || '-'
            });
        } catch (error) {
            console.error('Erro ao gerar variações:', error);
            setTitles([
                { text: originalTitle, label: 'Título Original', isOriginal: true },
                { text: 'Falha ao conectar.', label: 'Variação 1', is_best: false },
                { text: 'Tente novamente.', label: 'Variação 2', is_best: true }
            ]);
        } finally {
            setIsGeneratingTitles(false);
        }
    };

    const handleGenerateCover = async (index, title, useGemini = false) => {
        setCovers(prev => ({ ...prev, [index]: { loading: true, url: null, prompt: null, error: null } }));

        try {
            let visualPrompt;
            if (useGemini) {
                const apiKey = configs?.gemini_key || localStorage.getItem('guru_gemini_key');
                if (!apiKey) throw new Error('Chave Gemini não configurada para fallback.');
                visualPrompt = await buildCoverPromptWithGemini(title, apiKey);
                console.log(`[Cover ${index}] Generated prompt (Gemini Fallback):`, visualPrompt);
            } else {
                const apiKey = configs?.gpt_key || localStorage.getItem('guru_gpt_key');
                if (!apiKey) throw new Error('Chave GPT não configurada nas Configurações.');
                visualPrompt = await buildCoverPromptWithGPT(title, apiKey);
                console.log(`[Cover ${index}] Generated prompt (GPT):`, visualPrompt);
            }

            let finalImageUrl = null;
            if (selectedEngine === 'prompt_only') {
                setCovers(prev => ({ ...prev, [index]: { loading: false, url: null, prompt: visualPrompt, error: null, isPromptOnly: true } }));
                return;
            } else if (selectedEngine === 'dalle3') {
                const openaiKey = configs?.gpt_key || localStorage.getItem('guru_gpt_key');
                if (!openaiKey || openaiKey.includes('YOUR_')) throw new Error('Chave OpenAI não configurada nas Configurações!');
                
                const res = await fetch(resolveApiUrl('/api/openai/v1/images/generations'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
                    body: JSON.stringify({ model: "dall-e-3", prompt: visualPrompt + " - create a landscape layout.", n: 1, size: "1792x1024" })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message || "Erro OpenAI DALL-E 3");
                finalImageUrl = data.data[0].url;
            } else {
                const seed = Math.floor(Math.random() * 999999);
                finalImageUrl = buildPollinationsUrl(visualPrompt, seed);
            }

            // Step 3: Preload image to verify it loaded
            if (finalImageUrl) {
                await new Promise((resolve, reject) => {
                    const img = new window.Image();
                    img.onload = resolve;
                    img.onerror = () => reject(new Error('Falha ao carregar a imagem gerada.'));
                    img.src = finalImageUrl;
                    setTimeout(() => reject(new Error('Timeout ao carregar imagem.')), 45000);
                });
            }

            setCovers(prev => ({ ...prev, [index]: { loading: false, url: finalImageUrl, prompt: visualPrompt, error: null, isPromptOnly: false } }));
        } catch (error) {
            console.error('Erro ao gerar capa:', error);
            let displayError = error.message;
            if (error.message === 'QUOTA_EXCEEDED') {
                displayError = 'Cota do GPT excedida! Sua conta OpenAI está sem créditos.';
            }
            setCovers(prev => ({ 
                ...prev, 
                [index]: { 
                    loading: false, 
                    url: null, 
                    prompt: null, 
                    error: displayError,
                    isQuotaError: error.message === 'QUOTA_EXCEEDED'
                } 
            }));
        }
    };

    const handleDownload = async (imageUrl, title) => {
        try {
            // Use backend proxy to avoid CORS restrictions on download and ensure JPG
            const proxyUrl = resolveApiUrl(`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`);
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Falha ao baixar via proxy.');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Capa_${title.replace(/[^a-z0-9]/gi, '_').substring(0, 40)}.jpg`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Erro ao baixar imagem:', error);
            // Fallback: open in new tab
            window.open(imageUrl, '_blank');
        }
    };

    if (!selectedScript) {
        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full md:h-full flex flex-col overflow-y-auto custom-scrollbar">
                <header className="mb-8">
                    <h2 className="text-3xl md:text-5xl font-black text-glow-purple text-white flex items-center gap-4">
                        <ImageIcon className="text-neon-purple w-12 h-12" />
                        Gerar Capa de Vídeo
                    </h2>
                    <p className="text-gray-400 mt-2 text-lg">Selecione um dos últimos roteiros para criar as variações de capa</p>
                </header>

                {scripts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 glass-card p-12 border border-white/5 opacity-50">
                        <AlertCircle className="w-20 h-20 text-gray-600 mb-6" />
                        <h3 className="text-2xl font-bold text-white mb-2">Sem Roteiros Disponíveis</h3>
                        <p className="text-lg text-gray-500 text-center max-w-md">Crie um roteiro na aba "Criar Roteiro" primeiro.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
                        {scripts.slice(0, 6).map((s) => (
                            <motion.div
                                key={s.id}
                                whileHover={{ scale: 1.02, border: '1px solid rgba(191, 64, 255, 0.4)' }}
                                onClick={() => handleSelectScript(s)}
                                className="glass-card p-6 cursor-pointer border border-white/5 bg-white/5 flex flex-col justify-between h-[180px] group transition-all"
                            >
                                <div>
                                    <div className="text-[10px] font-bold text-neon-purple uppercase tracking-[0.2em] mb-2">Roteiro</div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-neon-purple transition-colors line-clamp-3">
                                        {s.title}
                                    </h3>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-[10px] font-mono text-gray-500">{s.date}</span>
                                    <span className="text-xs text-neon-purple font-black">SELECIONAR →</span>
                                </div>
                            </motion.div>
                        ))}
                        {[...Array(Math.max(0, 6 - scripts.length))].map((_, i) => (
                             <div key={`empty-${i}`} className="glass-card border border-dashed border-white/5 opacity-20 flex items-center justify-center h-[180px]">
                                <span className="text-[10px] uppercase tracking-widest text-gray-500">Espaço Vazio</span>
                             </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto h-full flex flex-col overflow-y-auto custom-scrollbar pb-20">
            <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                <div>
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl md:text-5xl font-black text-glow-purple text-white flex items-center gap-4"
                    >
                        <ImageIcon className="text-neon-purple w-12 h-12" />
                        Capa de Vídeo
                    </motion.h2>
                    <p className="text-gray-400 mt-3 text-lg">
                        Gerando capas para: <strong className="text-neon-purple">{selectedScript.title}</strong>
                    </p>
                </div>
                
                <button 
                    onClick={handleReset}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-white/10 text-gray-400 hover:text-white hover:border-neon-purple/50 bg-white/5 transition-all font-bold"
                >
                    <RefreshCw className="w-5 h-5" /> Selecionar Outro
                </button>
            </header>

            {/* Engine Selector */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                    <Wand2 className="w-5 h-5 text-gray-500" />
                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Selecione o Motor Gráfico da Capa</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {ENGINES.map(eng => {
                        const isSelected = selectedEngine === eng.id;
                        return (
                            <div 
                                key={eng.id}
                                onClick={() => setSelectedEngine(eng.id)}
                                className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 border flex flex-col gap-4 relative overflow-hidden group
                                    ${isSelected ? eng.focus : 'bg-dark/40 border-white/5 hover:border-white/20 hover:bg-white/5'}
                                `}
                            >
                                <div className="flex justify-between items-center relative z-10">
                                    <div className={`p-2 rounded-xl bg-${eng.color}/10 border border-${eng.color}/20 flex items-center justify-center`}>
                                        <eng.icon className={`w-5 h-5 text-${eng.color}`} />
                                    </div>
                                    <div className={`w-4 h-4 rounded-full border-2 ${isSelected ? `border-${eng.color} bg-${eng.color}` : 'border-gray-600'} flex items-center justify-center transition-colors`}>
                                        {isSelected && <div className="w-1.5 h-1.5 bg-dark rounded-full" />}
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    <h4 className="text-white font-black uppercase tracking-tight">{eng.name}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed mt-1 line-clamp-2 md:line-clamp-none">{eng.desc}</p>
                                </div>
                                {isSelected && <div className={`absolute -right-8 -top-8 w-24 h-24 blur-[40px] bg-${eng.color}/20 pointer-events-none`} />}
                            </div>
                        )
                    })}
                </div>
            </div>
            
            {/* Shock Words Section */}
            <AnimatePresence>
                {shockWords.one && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10"
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <Zap className="w-5 h-5 text-neon-cyan" />
                            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Palavras Choque para a Capa</h3>
                            <div className="h-px flex-1 bg-white/5 ml-2" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { id: 'one', title: '1 Palavra', color: 'neon-cyan', text: shockWords.one },
                                { id: 'two', title: '2 Palavras', color: 'neon-pink', text: shockWords.two },
                                { id: 'three', title: '3 Palavras', color: 'neon-purple', text: shockWords.three }
                            ].map((card) => (
                                <div 
                                    key={card.id}
                                    className={`glass-card p-5 border flex flex-col gap-3 group relative overflow-hidden
                                        ${card.id === 'one' ? 'border-neon-cyan/20 bg-neon-cyan/5' : ''}
                                        ${card.id === 'two' ? 'border-neon-pink/20 bg-neon-pink/5' : ''}
                                        ${card.id === 'three' ? 'border-neon-purple/20 bg-neon-purple/5' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-center relative z-10">
                                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] text-${card.color}`}>{card.title}</span>
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(card.text);
                                                // Optional: alert or toast
                                            }}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
                                            title="Copiar"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="relative z-10">
                                        <h4 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all">
                                            {card.text || '...'}
                                        </h4>
                                    </div>
                                    <div className={`absolute -right-4 -bottom-4 w-16 h-16 blur-[30px] bg-${card.color}/10 pointer-events-none group-hover:bg-${card.color}/20 transition-all`} />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-8">
                {titles.map((titleObj, idx) => {
                    const titleText = titleObj?.text || '';
                    const labelText = titleObj?.label || 'Variação';
                    const isBest = titleObj?.is_best;
                    const isOriginal = titleObj?.isOriginal;
                    
                    let badgeColor = 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
                    let glowClass = '';

                    if (isOriginal) {
                        badgeColor = 'bg-white/10 text-white border border-white/20';
                    } else if (isBest) {
                        badgeColor = 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]';
                        glowClass = 'border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.05)]';
                    } else {
                        badgeColor = 'bg-neon-cyan/5 text-neon-cyan border border-neon-cyan/20';
                        glowClass = 'border-neon-cyan/20';
                    }

                    return (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`glass-card overflow-hidden flex flex-col lg:flex-row border border-white/10 group transition-all duration-500 relative ${glowClass} ${!isOriginal && 'hover:border-neon-purple/50'}`}
                    >
                        {/* Left: Title & Controls */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-white/5 relative">
                            {isBest && (
                                <div className="absolute top-0 right-0 bg-yellow-500 text-dark font-black text-[9px] md:text-[10px] px-3 py-1.5 rounded-bl-xl uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                                    <Sparkles className="w-3.5 h-3.5" /> Mais Viral
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2 mb-3 mt-1">
                                    <span className={`px-2 md:px-3 py-1 rounded text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-widest ${badgeColor}`}>
                                        {labelText}
                                    </span>
                                    <button 
                                        onClick={() => {
                                            if (!titleText) return;
                                            navigator.clipboard.writeText(titleText);
                                            setCopiedIndex(idx);
                                            setTimeout(() => setCopiedIndex(null), 2000);
                                        }}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 flex items-center justify-center gap-2 group/copy"
                                        title="Copiar Título"
                                    >
                                        {copiedIndex === idx ? (
                                            <Check className="w-3.5 h-3.5 text-neon-cyan" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                        )}
                                        <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover/copy:block">Copiar</span>
                                    </button>
                                    {isGeneratingTitles && !isOriginal && <LoadingSpinner size="xs" message="" />}
                                </div>
                                <h3 className={`text-xl md:text-2xl font-bold leading-tight mb-4 transition-colors ${isBest ? 'text-yellow-400 group-hover:text-yellow-300' : 'text-white group-hover:text-neon-purple'}`}>
                                    {titleText || (isGeneratingTitles ? 'Identificando o melhor ângulo viral...' : 'Aguardando...')}
                                </h3>

                                {/* Show generated prompt hint */}
                                {covers[idx]?.prompt && (
                                    <div className="mb-6 p-5 bg-dark/60 border border-white/5 rounded-2xl block relative group/prmpt shadow-inner">
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <Wand2 className="w-4 h-4 text-neon-cyan" />
                                                <span className="text-[10px] font-black text-neon-cyan uppercase tracking-[0.2em]">Prompt Visual Gerado</span>
                                            </div>
                                            <button 
                                                onClick={() => { navigator.clipboard.writeText(covers[idx].prompt); alert("Texto copiado para a área de transferência!"); }}
                                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2 border border-white/10"
                                            >
                                                Copiar Base
                                            </button>
                                        </div>
                                        <p className="text-[11px] md:text-[13px] text-gray-400 italic max-h-[140px] overflow-y-auto custom-scrollbar pr-2 leading-relaxed font-mono">
                                            {covers[idx].prompt}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 mt-4">
                                <button
                                    onClick={() => handleGenerateCover(idx, titleText)}
                                    disabled={!titleText || covers[idx]?.loading || isGeneratingTitles}
                                    className="px-6 py-3 bg-neon-purple text-white rounded-xl font-bold flex items-center gap-2 hover:bg-neon-purple/80 transition-all disabled:opacity-50 shadow-lg shadow-neon-purple/20"
                                >
                                    {covers[idx]?.loading ? (
                                        <LoadingSpinner size="xs" message="Gerando..." />
                                    ) : covers[idx]?.url ? (
                                        <><RefreshCw className="w-5 h-5" /> Gerar Novamente</>
                                    ) : (
                                        <><Sparkles className="w-5 h-5" /> Gerar Capa com IA</>
                                    )}
                                </button>

                                {covers[idx]?.url && !covers[idx]?.loading && (
                                    <button
                                        onClick={() => handleDownload(covers[idx].url, titleText)}
                                        className="px-6 py-3 bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan rounded-xl font-bold flex items-center gap-2 hover:bg-neon-cyan/30 hover:border-neon-cyan/70 transition-all shadow-lg"
                                    >
                                        <Download className="w-5 h-5" /> Baixar JPG
                                    </button>
                                )}
                            </div>

                            {covers[idx]?.error && (
                                <div className="mt-3 p-3 bg-red-400/10 rounded-lg flex flex-col gap-2">
                                    <p className="text-red-400 text-xs">
                                        ❌ {covers[idx].error}
                                    </p>
                                    {covers[idx]?.isQuotaError && (
                                        <button 
                                            onClick={() => handleGenerateCover(idx, titleText, true)}
                                            className="text-[10px] font-bold bg-neon-cyan/20 text-neon-cyan py-1.5 rounded border border-neon-cyan/40 hover:bg-neon-cyan/30 transition-all uppercase tracking-widest"
                                        >
                                            Tentar com Gemini (Fallback)
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right: Image Preview */}
                        <div className="w-full lg:w-[520px] aspect-video bg-dark-lighter relative overflow-hidden flex items-center justify-center border-t lg:border-t-0 lg:border-l border-white/5 flex-shrink-0">
                            <AnimatePresence mode="wait">
                                {covers[idx]?.loading ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-10 bg-dark/90 flex flex-col items-center justify-center text-neon-purple gap-4"
                                    >
                                        <LoadingSpinner size="lg" message="O Motor Gráfico está Trabalhando..." />
                                        <div className="text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Isso pode levar alguns segundos dependendo da fila.</p>
                                        </div>
                                    </motion.div>
                                ) : covers[idx]?.isPromptOnly && covers[idx]?.prompt ? (
                                    <motion.div
                                        key="prompt_only"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-10 bg-dark/20 flex flex-col items-center justify-center p-8 text-center"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-neon-purple/10 flex items-center justify-center border border-neon-purple/20 mb-4">
                                           <Type className="w-8 h-8 text-neon-purple" />
                                        </div>
                                        <h3 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-2">Apenas Prompt Gerado</h3>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest max-w-[280px]">Copie o texto no painel à esquerda para renderizar sua arte no Whisk ou Midjourney.</p>
                                    </motion.div>
                                ) : covers[idx]?.url ? (
                                    <motion.div
                                        key="image"
                                        initial={{ filter: 'blur(20px)', scale: 1.1 }}
                                        animate={{ filter: 'blur(0px)', scale: 1 }}
                                        transition={{ duration: 0.6 }}
                                        className="h-full w-full relative group/img"
                                    >
                                            <img
                                                src={covers[idx].url}
                                                alt={titleText}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105"
                                            />
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                <button
                                                    onClick={() => handleDownload(covers[idx].url, titleText)}
                                                    className="p-4 bg-white text-dark rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                    title="Baixar JPG"
                                                >
                                                    <Download className="w-6 h-6" />
                                                </button>
                                                <button
                                                    onClick={() => handleGenerateCover(idx, titleText)}
                                                    className="p-4 bg-neon-purple text-white rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                    title="Gerar Novamente"
                                                >
                                                    <RefreshCw className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="text-gray-600 flex flex-col items-center gap-3 p-8 text-center">
                                            <ImageIcon className="w-16 h-16 opacity-10" />
                                            <p className="text-sm font-medium">Prévia da Capa (1280×720)</p>
                                            <p className="text-xs text-gray-600">Clique em "Gerar Capa com IA" para criar</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Info Box */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="mt-10 p-6 rounded-2xl bg-white/5 border border-white/5 flex gap-4 items-start"
            >
                <div className="p-2 bg-neon-purple/10 rounded-lg flex-shrink-0">
                    <Type className="text-neon-purple w-6 h-6" />
                </div>
                <div>
                    <h4 className="text-white font-bold mb-1">Como funciona a geração por IA</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        <strong className="text-neon-cyan">Etapa 1:</strong> A IA (Gemini) analisa o título do vídeo e cria um prompt visual detalhado em inglês.
                        <br />
                        <strong className="text-neon-purple">Etapa 2:</strong> Uma IA de geração de imagens converte esse prompt em uma capa 16:9 profissional.
                        <br />
                        Use <strong>"Gerar Novamente"</strong> para criar variações diferentes mantendo o mesmo título.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
