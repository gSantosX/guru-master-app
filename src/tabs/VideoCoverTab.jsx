import React, { useState, useEffect } from 'react';
import { ImageIcon, Wand2, Download, RefreshCw, Loader2, AlertCircle, Type, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';

// Helper: use Gemini to build a detailed visual prompt for the cover
async function buildCoverPromptWithGemini(title, apiKey) {
    const instruction = `You are an expert YouTube thumbnail art director. 
Given the video title: "${title}"
Generate a detailed, vivid image generation prompt (in English) for a professional YouTube thumbnail.
The prompt must describe: main subject, background, lighting, colors, mood, composition, style.
Example style: "cinematic wide shot of [subject], dramatic lighting, vibrant colors, ..."
Return ONLY the raw image prompt, no explanations, no quotes, no markdown.`;

    // Try to pick best available model
    try {
        const modelsRes = await fetch(`/api/gemini/v1beta/models?key=${apiKey}`);
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
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: instruction }] }] })
            });
            const data = await res.json();
            if (data.candidates?.length > 0) return data.candidates[0].content.parts[0].text.trim();
            if (data.error) throw new Error(data.error.message);
        }
    } catch (e) {
        console.warn('Gemini model list failed, trying fallback:', e);
    }
    // Fallback to direct model
    const res = await fetch(`/api/gemini/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: instruction }] }] })
    });
    const data = await res.json();
    if (data.candidates?.length > 0) return data.candidates[0].content.parts[0].text.trim();
    throw new Error(data.error?.message || 'Gemini: Falha ao gerar prompt de imagem.');
}

// Helper: generate actual image via Pollinations.ai (free, no key)
function buildPollinationsUrl(prompt, seed) {
    const encoded = encodeURIComponent(prompt + ', youtube thumbnail, high quality, vibrant, 16:9');
    return `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&seed=${seed}&nologo=true&enhance=true`;
}

export const VideoCoverTab = ({ isActive }) => {
    const { configs } = useSystemStatus();
    const [lastScript, setLastScript] = useState(null);
    const [titles, setTitles] = useState([]);
    const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
    // covers: { [index]: { url, prompt, loading, error } }
    const [covers, setCovers] = useState({});

    useEffect(() => {
        if (!isActive) return;
        const scripts = JSON.parse(localStorage.getItem('guru_scripts') || '[]');
        if (scripts.length > 0) {
            const script = scripts[0];
            if (!lastScript || lastScript.id !== script.id) {
                setLastScript(script);
                setTitles([script.title, '', '']);
                setCovers({});
                generateTitleVariations(script.title);
            }
        } else {
            setLastScript(null);
            setTitles([]);
        }
    }, [isActive]);

    const generateTitleVariations = async (originalTitle) => {
        if (!originalTitle) return;
        setIsGeneratingTitles(true);
        try {
            const apiKey = configs?.gemini_key || localStorage.getItem('guru_gemini_key');
            if (!apiKey) throw new Error('Chave Gemini não configurada.');

            const prompt = `Com base no título de vídeo: "${originalTitle}", crie mais 2 variações de títulos chamativos e virais para o YouTube.
Retorne APENAS os 2 novos títulos, um em cada linha, sem numeração ou texto adicional.`;

            const modelsRes = await fetch(`/api/gemini/v1beta/models?key=${apiKey}`);
            const modelsData = await modelsRes.json();
            const targetModel =
                modelsData.models?.find(m => m.name.includes('gemini-1.5-flash') && m.supportedGenerationMethods?.includes('generateContent')) ||
                modelsData.models?.find(m => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'));

            let result;
            if (targetModel) {
                const res = await fetch(`/api/gemini/v1beta/models/${targetModel.name.replace('models/', '')}:generateContent?key=${apiKey}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
                });
                const data = await res.json();
                if (data.candidates?.length > 0) result = data.candidates[0].content.parts[0].text;
            }

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

    const handleGenerateCover = async (index, title) => {
        const apiKey = configs?.gemini_key || localStorage.getItem('guru_gemini_key');
        if (!apiKey) {
            alert('Chave Gemini não configurada! Configure nas Configurações antes de gerar capas.');
            return;
        }

        setCovers(prev => ({ ...prev, [index]: { loading: true, url: null, prompt: null, error: null } }));

        try {
            // Step 1: Use Gemini to generate a rich visual prompt
            const visualPrompt = await buildCoverPromptWithGemini(title, apiKey);
            console.log(`[Cover ${index}] Generated prompt:`, visualPrompt);

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
            setCovers(prev => ({ ...prev, [index]: { loading: false, url: null, prompt: null, error: error.message } }));
        }
    };

    const handleDownload = async (imageUrl, title) => {
        try {
            // Use backend proxy to avoid CORS restrictions on download
            const proxyUrl = `/api/system/image-proxy?url=${encodeURIComponent(imageUrl)}`;
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

    if (!lastScript) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center m-6">
                <AlertCircle className="w-16 h-16 text-neon-purple mb-4 opacity-40" />
                <h2 className="text-2xl font-bold text-white mb-2">Nenhum roteiro encontrado</h2>
                <p className="text-gray-400 max-w-md">Para gerar capas, primeiro crie um roteiro na aba <strong className="text-neon-cyan">"Criar Roteiro"</strong>.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto h-full flex flex-col overflow-y-auto custom-scrollbar pb-20">
            <header className="mb-8">
                <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-3xl md:text-5xl font-black text-glow-purple text-white flex items-center gap-4"
                >
                    <ImageIcon className="text-neon-purple w-12 h-12" />
                    Capa de Vídeo
                </motion.h2>
                <p className="text-gray-400 mt-3 text-lg">
                    A IA analisa o título, cria um prompt visual e gera a capa em <strong className="text-neon-purple">1280×720 (16:9)</strong>.
                </p>
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
                                    {isGeneratingTitles && idx > 0 && <Loader2 className="w-3 h-3 animate-spin text-neon-purple" />}
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
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Gerando...</>
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
                                <p className="text-red-400 text-xs mt-3 bg-red-400/10 p-2 rounded-lg">
                                    ❌ {covers[idx].error}
                                </p>
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
                                        <Loader2 className="w-12 h-12 animate-spin" />
                                        <div className="text-center">
                                            <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Criando Arte Digital...</p>
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
