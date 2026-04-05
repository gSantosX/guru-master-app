import React, { useState, useEffect } from 'react';
import { ImageIcon, Wand2, Download, RefreshCw, AlertCircle, Type, Sparkles, Zap, Box, Copy, Check, Palette, CloudMoon, Target, Maximize, MousePointer2, Globe, Terminal, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { resolveApiUrl } from '../utils/apiUtils';
import { callGemini, callGPT } from '../utils/aiUtils';

// Helper: use GPT to build a detailed visual prompt for the cover
async function buildCoverPromptWithGPT(title, apiKey, prefs = {}) {
    const { includeText, colorStyle, distance } = prefs;
    const instruction = `You are an expert YouTube thumbnail art director. 
Given the video title: "${title}"
Generate a detailed, vivid image generation prompt (in English) for a professional YouTube thumbnail.

User Preferences:
- Include Text: ${includeText ? `YES (Detect the language of "${title}" and add the text overlay in that SAME language)` : 'NO'}
- Color Style: ${colorStyle === 'bw' ? 'Black and White / Grisaille' : colorStyle === 'selective' ? 'Selective Color (Main objects in color, background muted/classic)' : 'Vibrant Colors'}
- Shot Type: ${distance === 'wide' ? 'Wide Cinema Shot / Far' : 'Close-Up / Focused'}

The prompt must describe: main subject, background, lighting, colors, mood, composition, style.
Example style: "cinematic wide shot of [subject], dramatic lighting, vibrant colors, ..."
Return ONLY the raw image prompt, no explanations, no quotes, no markdown.`;

    return await callGPT(apiKey, instruction);
}

// Helper: use Gemini to build a detailed visual prompt for the cover (fallback)
async function buildCoverPromptWithGemini(title, apiKey, prefs = {}) {
    const { includeText, colorStyle, distance } = prefs;
    const instruction = `You are an expert YouTube thumbnail art director. 
Given the video title: "${title}"
Generate a detailed, vivid image generation prompt (in English) for a professional YouTube thumbnail.

User Preferences:
- Include Text: ${includeText ? `YES (Detect the language of "${title}" and add the text overlay in that SAME language)` : 'NO'}
- Color Style: ${colorStyle === 'bw' ? 'Black and White / Monochrome' : colorStyle === 'selective' ? 'Color Pop (Subject in color, background black and white)' : 'Cinematic Color Grading'}
- Shot Type: ${distance === 'wide' ? 'Long Shot / Wide perspective' : 'Extreme Close-Up / Portrait style'}

The prompt must describe: main subject, background, lighting, colors, mood, composition, style.
Example style: "cinematic wide shot of [subject], dramatic lighting, vibrant colors, ..."
Return ONLY the raw image prompt, no explanations, no quotes, no markdown.`;

    return await callGemini(apiKey, instruction);
}

// Helper: generate actual image via Pollinations.ai (free, no key)
function buildPollinationsUrl(prompt, seed) {
    const encoded = encodeURIComponent(prompt + ', youtube thumbnail, high quality, vibrant, 16:9');
    return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=576&seed=${seed}&nologo=true&enhance=true`;
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
    
    // coverPrefs: { [index]: { includeText, colorStyle, distance } }
    const [coverPrefs, setCoverPrefs] = useState({});

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
        setCoverPrefs({});
        generateTitleVariations(script.title);
    };

    const handleReset = () => {
        setSelectedScript(null);
        setTitles([]);
        setShockWords({ one: '', two: '', three: '' });
        setCovers({});
        setCoverPrefs({});
    };

    const generateTitleVariations = async (originalTitle) => {
        if (!originalTitle) return;
        setIsGeneratingTitles(true);
        try {
            const apiKey = configs?.gemini_key || localStorage.getItem('guru_gemini_key');
            if (!apiKey) throw new Error('Chave Gemini não configurada.');

            const prompt = `Analise o título de vídeo original: "${originalTitle}".
Crie 2 novas opções de títulos com altíssimo potencial de viralização no YouTube, na mesma língua do original.
IMPORTANTE: Os títulos devem ter no MÁXIMO 100 caracteres cada. Seja direto e impactante.
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
                { text: originalTitle.substring(0, 100), label: 'Título Original', isOriginal: true },
                { text: (parsed.variations?.[0]?.text || 'Erro ao gerar').substring(0, 100), label: parsed.variations?.[0]?.label || 'Variação 1', is_best: Boolean(parsed.variations?.[0]?.is_best) },
                { text: (parsed.variations?.[1]?.text || 'Erro ao gerar').substring(0, 100), label: parsed.variations?.[1]?.label || 'Variação 2', is_best: Boolean(parsed.variations?.[1]?.is_best) }
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

    const handleGenerateCover = async (index, title) => {
        setCovers(prev => ({ ...prev, [index]: { loading: true, prompt: null, error: null } }));

        try {
            const prefs = coverPrefs[index] || { includeText: false, colorStyle: 'standard', distance: 'close' };
            let visualPrompt;
            
            const geminiKey = configs?.gemini_key || localStorage.getItem('guru_gemini_key');
            const gptKey = configs?.gpt_key || localStorage.getItem('guru_gpt_key');

            if (geminiKey) {
                try {
                    visualPrompt = await buildCoverPromptWithGemini(title, geminiKey, prefs);
                } catch (e) {
                    if (gptKey) {
                        visualPrompt = await buildCoverPromptWithGPT(title, gptKey, prefs);
                    } else {
                        throw e;
                    }
                }
            } else if (gptKey) {
                visualPrompt = await buildCoverPromptWithGPT(title, gptKey, prefs);
            } else {
                throw new Error('Nenhuma chave de IA configurada (Gemini ou GPT) nas Configurações.');
            }

            setCovers(prev => ({ ...prev, [index]: { loading: false, prompt: visualPrompt, error: null } }));
        } catch (error) {
            console.error('Erro ao gerar prompt da capa:', error);
            setCovers(prev => ({ 
                ...prev, 
                [index]: { 
                    loading: false, 
                    prompt: null, 
                    error: error.message
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
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1, duration: 0.4 }}
                        className={`glass-card overflow-hidden border border-white/10 group transition-all duration-500 relative mb-6 shadow-[0_10px_30px_rgba(0,0,0,0.4)] ${glowClass} ${!isOriginal && 'hover:border-neon-purple/50'}`}
                    >
                        <div className="p-5 md:p-8 flex flex-col gap-6 bg-white/5 relative">
                            {isBest && (
                                <div className="absolute top-0 right-0 bg-yellow-500 text-dark font-black text-[9px] md:text-[10px] px-4 py-1.5 rounded-bl-xl uppercase tracking-[0.2em] flex items-center gap-2 shadow-2xl z-30 animate-pulse">
                                    <Sparkles className="w-3.5 h-3.5" /> Mais Viral
                                </div>
                            )}

                            {/* Section 1: Title Header */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${badgeColor}`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                                        {labelText}
                                    </span>
                                    {isGeneratingTitles && !isOriginal && <LoadingSpinner size="xs" message="" />}
                                </div>
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <h3 className={`text-xl md:text-2xl font-black leading-[1.2] transition-colors max-w-4xl ${isBest ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'text-white'}`}>
                                        {titleText || (isGeneratingTitles ? 'Projetando o melhor ângulo...' : 'Aguardando...')}
                                    </h3>
                                    <button 
                                        onClick={() => {
                                            if (!titleText) return;
                                            navigator.clipboard.writeText(titleText);
                                            setCopiedIndex(idx);
                                            setTimeout(() => setCopiedIndex(null), 2000);
                                        }}
                                        className="shrink-0 h-10 w-10 lg:w-36 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10 flex items-center justify-center gap-2 group/copy active:scale-95"
                                    >
                                        {copiedIndex === idx ? <Check className="w-4 h-4 text-neon-cyan" /> : <Copy className="w-4 h-4" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest hidden lg:block">{copiedIndex === idx ? 'Copiado!' : 'Copiar Título'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Section 2: Laboratory Control Center */}
                            <div className="p-5 bg-dark/40 border border-white/5 rounded-2xl relative overflow-hidden group/lab">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-neon-pink/10 rounded-lg">
                                        <Wand2 className="w-4 h-4 text-neon-pink" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Centro de Customização Visual</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                                    {/* Text Toggle Chip */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Type className="w-3 h-3 text-gray-500" />
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Incluir Texto</label>
                                        </div>
                                        <button 
                                            onClick={() => setCoverPrefs(prev => ({ ...prev, [idx]: { ...prev[idx], includeText: !prev[idx]?.includeText } }))}
                                            className={`w-full h-11 rounded-xl px-4 transition-all flex items-center justify-between border ${coverPrefs[idx]?.includeText ? 'bg-neon-cyan/10 border-neon-cyan/50 shadow-[0_0_10px_rgba(0,243,255,0.05)]' : 'bg-white/5 border-white/5'}`}
                                        >
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${coverPrefs[idx]?.includeText ? 'text-neon-cyan' : 'text-gray-500'}`}>
                                                {coverPrefs[idx]?.includeText ? 'Com Texto' : 'Sem Texto'}
                                            </span>
                                            <div className={`w-7 h-3.5 rounded-full p-0.5 transition-all flex items-center ${coverPrefs[idx]?.includeText ? 'bg-neon-cyan' : 'bg-gray-700'}`}>
                                                <div className={`w-2.5 h-2.5 bg-white rounded-full transition-all ${coverPrefs[idx]?.includeText ? 'translate-x-3.5' : 'translate-x-0'}`} />
                                            </div>
                                        </button>
                                    </div>
                                    
                                    {/* Color Style Pills */}
                                    <div className="space-y-2 lg:col-span-1">
                                        <div className="flex items-center gap-2">
                                            <Palette className="w-3 h-3 text-gray-500" />
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Estilo Visual</label>
                                        </div>
                                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 h-11">
                                            {[
                                                { id: 'standard', label: 'Color', icon: Zap },
                                                { id: 'bw', label: 'P&B', icon: CloudMoon },
                                                { id: 'selective', label: 'Foco', icon: Target }
                                            ].map(c => (
                                                <button 
                                                    key={c.id}
                                                    onClick={() => setCoverPrefs(prev => ({ ...prev, [idx]: { ...prev[idx], colorStyle: c.id } }))}
                                                    className={`flex-1 flex flex-col items-center justify-center rounded-lg transition-all gap-0.5
                                                        ${(coverPrefs[idx]?.colorStyle || 'standard') === c.id ? 'bg-neon-pink text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}
                                                    `}
                                                >
                                                    <c.icon className="w-3 h-3" />
                                                    <span className="text-[7px] font-black uppercase tracking-tighter">{c.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Distance Pills */}
                                    <div className="space-y-2 lg:col-span-1">
                                        <div className="flex items-center gap-2">
                                            <Maximize className="w-3 h-3 text-gray-500" />
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Enquadramento</label>
                                        </div>
                                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 h-11">
                                            {[
                                                { id: 'close', label: 'Perto', icon: MousePointer2 },
                                                { id: 'wide', label: 'Longe', icon: Globe }
                                            ].map(d => (
                                                <button 
                                                    key={d.id}
                                                    onClick={() => setCoverPrefs(prev => ({ ...prev, [idx]: { ...prev[idx], distance: d.id } }))}
                                                    className={`flex-1 flex flex-col items-center justify-center rounded-lg transition-all gap-0.5
                                                        ${(coverPrefs[idx]?.distance || 'close') === d.id ? 'bg-neon-cyan text-dark shadow-lg' : 'text-gray-500 hover:text-gray-300'}
                                                    `}
                                                >
                                                    <d.icon className="w-3 h-3" />
                                                    <span className="text-[7px] font-black uppercase tracking-tighter">{d.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Main Magic Button */}
                                    <button 
                                        onClick={() => handleGenerateCover(idx, titleText)}
                                        disabled={!titleText || covers[idx]?.loading}
                                        className="h-11 bg-neon-purple text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neon-purple/80 shadow-lg shadow-neon-purple/10 active:scale-95 disabled:opacity-30"
                                    >
                                        {covers[idx]?.loading ? <LoadingSpinner size="xs" message="" /> : <><Sparkles className="w-4 h-4" /> Criar Prompt</>}
                                    </button>
                                </div>
                            </div>

                            {/* Section 3: Prompt Master Output */}
                            <AnimatePresence mode="wait">
                                {covers[idx]?.prompt && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className="relative group/pbox"
                                    >
                                        <div className="p-5 bg-dark/80 border border-neon-cyan/20 rounded-2xl shadow-[inset_0_1px_10px_rgba(0,243,255,0.03)] overflow-hidden">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/20">
                                                        <Terminal className="w-4 h-4 text-neon-cyan" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Direct Prompt Output</h4>
                                                        <p className="text-[8px] text-gray-500 font-mono uppercase tracking-widest italic">Optimized by Gemini Advanced</p>
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    onClick={() => { 
                                                        navigator.clipboard.writeText(covers[idx].prompt);
                                                        alert("Prompt copiado!");
                                                    }}
                                                    className="px-4 py-2 bg-neon-cyan text-dark rounded-lg transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:brightness-110 active:scale-95"
                                                >
                                                    <Zap className="w-3 h-3" /> Copiar Prompt
                                                </button>
                                            </div>

                                            <div className="bg-dark/40 p-5 rounded-xl border border-white/5 font-mono text-xs md:text-sm text-neon-cyan/80 leading-relaxed italic select-all scrollbar-hide overflow-y-auto max-h-[150px]">
                                                {covers[idx].prompt}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {covers[idx]?.error && (
                                <div className="p-6 bg-red-400/5 rounded-2xl flex items-center gap-4 border border-red-500/10">
                                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-red-400 font-black text-xs uppercase tracking-widest mb-1">Módulo de IA Interrompido</h4>
                                        <p className="text-red-400/70 text-xs font-medium">{covers[idx].error}</p>
                                    </div>
                                </div>
                            )}
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
                    <h4 className="text-white font-bold mb-1">Como funciona a geração de Prompts</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        <strong className="text-neon-cyan">Etapa 1:</strong> O Gemini analisa o título viral e cria uma descrição visual cinematográfica em inglês.
                        <br />
                        <strong className="text-neon-purple">Etapa 2:</strong> Copie o prompt gerado e use no **Auto Flow** ou **Midjourney** para criar sua arte final.
                        <br />
                        Use o **Centro de Customização** para ajustar o estilo antes de gerar um novo prompt.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
