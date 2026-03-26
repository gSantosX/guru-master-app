import React, { useState, useEffect } from 'react';
import { ImageIcon, Wand2, Download, RefreshCw, AlertCircle, Type, Sparkles } from 'lucide-react';
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
    const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
    // covers: { [index]: { url, prompt, loading, error } }
    const [covers, setCovers] = useState({});

    useEffect(() => {
        if (!isActive) return;
        const saved = JSON.parse(localStorage.getItem('guru_scripts') || '[]');
        setScripts(Array.isArray(saved) ? saved : []);
    }, [isActive]);

    const handleSelectScript = (script) => {
        setSelectedScript(script);
        setTitles([script.title, '', '']);
        setCovers({});
        generateTitleVariations(script.title);
    };

    const handleReset = () => {
        setSelectedScript(null);
        setTitles([]);
        setCovers({});
    };

    const generateTitleVariations = async (originalTitle) => {
        if (!originalTitle) return;
        setIsGeneratingTitles(true);
        try {
            const apiKey = configs?.gemini_key || localStorage.getItem('guru_gemini_key');
            if (!apiKey) throw new Error('Chave Gemini não configurada.');

            const prompt = `Identifique a língua do título de vídeo original: "${originalTitle}".
Crie 2 variações de títulos chamativos e virais para o YouTube NA MESMA LÍNGUA identificada.
Retorne APENAS os 2 novos títulos, um em cada linha, sem numeração ou texto adicional.`;

            const result = await callGemini(apiKey, prompt);

            if (result) {
                const variations = result.split('\n').filter(t => t.trim().length > 0).slice(0, 2);
                setTitles([originalTitle, variations[0] || 'Variação Viral 1', variations[1] || 'Variação Viral 2']);
            }
        } catch (error) {
            console.error('Erro ao gerar variações:', error);
            setTitles([originalTitle, 'Variação Viral 1', 'Variação Viral 2']);
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

            // Step 2: Build image URL from Pollinations.ai
            const seed = Math.floor(Math.random() * 999999);
            const imageUrl = buildPollinationsUrl(visualPrompt, seed);

            // Step 3: Preload image to verify it loaded
            await new Promise((resolve, reject) => {
                const img = new window.Image();
                img.onload = resolve;
                img.onerror = () => reject(new Error('Falha ao carregar a imagem gerada.'));
                img.src = imageUrl;
                setTimeout(() => reject(new Error('Timeout ao carregar imagem.')), 30000);
            });

            setCovers(prev => ({ ...prev, [index]: { loading: false, url: imageUrl, prompt: visualPrompt, error: null } }));
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

            <div className="grid grid-cols-1 gap-8">
                {titles.map((title, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="glass-card overflow-hidden flex flex-col lg:flex-row border border-white/10 group hover:border-neon-purple/50 transition-all duration-500"
                    >
                        {/* Left: Title & Controls */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-white/5">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${idx === 0 ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-neon-purple/20 text-neon-purple'}`}>
                                        {idx === 0 ? 'Original' : `Variação ${idx}`}
                                    </span>
                                    {isGeneratingTitles && idx > 0 && <LoadingSpinner size="xs" message="" />}
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-white leading-tight mb-4 group-hover:text-neon-purple transition-colors">
                                    {title || (isGeneratingTitles ? 'Gerando título...' : 'Aguardando...')}
                                </h3>

                                {/* Show generated prompt hint */}
                                {covers[idx]?.prompt && (
                                    <p className="text-xs text-gray-500 italic mb-4 line-clamp-2">
                                        🧠 <span className="text-gray-400">{covers[idx].prompt.substring(0, 120)}...</span>
                                    </p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 mt-4">
                                <button
                                    onClick={() => handleGenerateCover(idx, title)}
                                    disabled={!title || covers[idx]?.loading || isGeneratingTitles}
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
                                        onClick={() => handleDownload(covers[idx].url, title)}
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
                                            onClick={() => handleGenerateCover(idx, title, true)}
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
                                        <LoadingSpinner size="lg" message="Criando Arte Digital..." />
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 mt-1">IA analisando título e gerando imagem</p>
                                        </div>
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
                                            alt={title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105"
                                        />
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                            <button
                                                onClick={() => handleDownload(covers[idx].url, title)}
                                                className="p-4 bg-white text-dark rounded-full hover:scale-110 transition-transform shadow-2xl"
                                                title="Baixar JPG"
                                            >
                                                <Download className="w-6 h-6" />
                                            </button>
                                            <button
                                                onClick={() => handleGenerateCover(idx, title)}
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
                ))}
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
