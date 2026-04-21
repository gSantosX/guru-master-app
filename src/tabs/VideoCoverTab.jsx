import React, { useState, useEffect } from 'react';
import { ImageIcon, Wand2, Download, RefreshCw, AlertCircle, Type, Sparkles, Zap, Box, Copy, Check, Palette, CloudMoon, Target, Maximize, MousePointer2, Globe, Terminal, AlertTriangle, Loader2 } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { usePersistence } from '../contexts/PersistenceContext';
import { resolveApiUrl } from '../utils/apiUtils';
import { callAI } from '../utils/aiUtils';
import { useCloudStorage } from '../hooks/useCloudStorage';

const THUMBNAIL_STYLES = [
    { id: 'cinematic', label: 'Cinematográfico', icon: Sparkles, prompt: 'Cinematic lighting, high contrast, shallow depth of field, blockbuster movie poster aesthetic, extremely detailed textures.' },
    { id: 'documentary', label: 'Documentário', icon: Zap, prompt: 'Realistic documentary style, raw and authentic, natural lighting, gritty textures, high fidelity, 8k resolution.' },
    { id: '3d_render', label: '3D Render', icon: Box, prompt: 'Stylized 3D render, Octane render, vibrant colors, expressive character design, high-end digital art aesthetic.' },
    { id: 'anime', label: 'Anime/Manga', icon: Palette, prompt: 'Dynamic anime style, strong character outlines, vibrant cel-shaded colors, dramatic perspective.' },
    { id: 'cyberpunk', label: 'Cyberpunk', icon: Zap, prompt: 'Retro-futuristic cyberpunk aesthetic, neon lights (cyan and magenta), high contrast, rainy atmosphere, foggy depth.' },
    { id: 'suspense', label: 'Suspense/Horror', icon: AlertTriangle, prompt: 'Dark and atmospheric, high contrast shadows, moody lighting, ominous feeling, mysterious silhouette.' },
    { id: 'minimalist', label: 'Minimalista', icon: Maximize, prompt: 'Clean minimalist composition, single focal point, soft neutral background, focus on essential details.' }
];

// Helper: build a detailed visual prompt for the cover using universal callAI
async function buildDetailedCoverPrompt(title, prefs = {}) {
    const { includeText, colorStyle, distance, styleId } = prefs;
    const selectedStyle = THUMBNAIL_STYLES.find(s => s.id === styleId) || THUMBNAIL_STYLES[0];

    const textInstruction = includeText 
        ? `MANDATORY: Detect the language of "${title}" and add punchy, viral overlay text in that SAME language. Use large, bold, high-contrast typography.`
        : `ABSOLUTE RESTRICTION: Do NOT include ANY text, letters, subtitles, labels, watermarks, symbols, or alphabetic characters in the image. Pure visual storytelling ONLY.`;

    const instruction = `You are a WORLD-CLASS YouTube Thumbnail Art Director specialized in viral CTR and cinematic lighting.

VIDEO TITLE: "${title}"

MISSION: Create a hyper-detailed, production-ready "GOLD STANDARD" image generation prompt.

VISUAL STYLE: ${selectedStyle.label}
DIRECTIVES: ${selectedStyle.prompt}

USER PREFERENCES:
- Text: ${textInstruction}
- Colors: ${colorStyle === 'bw' ? 'MONOCHROME — high contrast black & white.' : colorStyle === 'selective' ? 'COLOR POP — subject in full color, background desaturated.' : 'CINEMATIC COLOR — rich, saturated grading.'}
- Composition: ${distance === 'wide' ? 'WIDE EPIC SHOT.' : 'EXTREME CLOSE-UP.'}

MANDATORY ELITE RULES:
1. SUBJECT: Describe the main subject with microscopic detail (skin pores, sweating, hair follicles).
2. EXPRESSION: Extreme intensity (fear, awe, shock) — descriptive and visceral.
3. LIGHTING: Cinematic rim light, god rays, volumetric fog, and dramatic shadows.
4. LENS: Specify professional gear like "Shot on 35mm Sigma Art lens, f/1.4, 8k resolution".
5. NO CLICHÉS: Avoid "hyperrealistic" or "photorealistic". Use technical photography terms instead.

OUTPUT FORMAT (MANDATORY):
PROMPT: [Ultra-detailed visual description]
NEGATIVE PROMPT: [Technical anti-quality tokens, blurry, low resolution, bad anatomy, text in image, artifacts, watermarks, cartoonish (unless specified)]

Return ONLY the prompt and negative prompt in English. No markdown, no quotes.`;

    return await callAI(instruction, { model: "gpt-4o-mini" });
}

// Helper: generate actual image via Pollinations.ai (free, no key)
function buildPollinationsUrl(fullText, seed) {
    // Extract only the positive prompt part to avoid breaking the image generator
    let cleanPrompt = fullText;
    if (fullText.includes('PROMPT:')) {
        const parts = fullText.split('NEGATIVE PROMPT:');
        cleanPrompt = parts[0].replace('PROMPT:', '').trim();
    }
    
    const encoded = encodeURIComponent(cleanPrompt + ', youtube thumbnail, high quality, vibrant, 16:9');
    return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=576&seed=${seed}&nologo=true&enhance=true`;
}

export const VideoCoverTab = ({ isActive }) => {
    const { configs } = useSystemStatus();
    const { coverState, setCoverState } = usePersistence();
    
    // Destructuring global state for easier use
    const { 
        selectedScript, 
        titles, 
        shockWords, 
        covers, 
        coverPrefs, 
        description, 
        lastSelectedTitle 
    } = coverState;

    // Helper to update specific parts of the coverState
    const updateCoverState = (updates) => setCoverState(prev => ({ ...prev, ...updates }));

    const [scripts, setScripts] = useState([]);
    const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [withDisclaimer, setWithDisclaimer] = useState(false);
    const [descCopied, setDescCopied] = useState(false);
    const [copiedSection, setCopiedSection] = useState(null);

    const handleCopy = (text, section) => {
        navigator.clipboard.writeText(text);
        setCopiedSection(section);
        setTimeout(() => setCopiedSection(null), 2000);
    };
    
    const ENGINES = []; // Keep empty or just remove entirely. Let's just remove them.

    const [cloudScripts] = useCloudStorage('scripts', []);
    const [scripts, setScripts] = useState([]);

    useEffect(() => {
        if (!isActive) return;
        const fallback = JSON.parse(localStorage.getItem('guru_cloud_scripts') || '[]');
        setScripts(cloudScripts.length > 0 ? cloudScripts : fallback);
    }, [isActive, cloudScripts]);

    const handleSelectScript = (script) => {
        updateCoverState({
            selectedScript: script,
            lastSelectedTitle: script.title,
            titles: [
                { text: script.title, label: 'Titulo Original', isOriginal: true },
                { text: '', label: 'Carregando Oportunidades...', isOriginal: false },
                { text: '', label: 'Carregando Oportunidades...', isOriginal: false }
            ],
            shockWords: { one: '', two: '', three: '' },
            covers: {},
            coverPrefs: {},
            description: ''
        });
        generateTitleVariations(script.title);
    };

    const handleReset = () => {
        updateCoverState({
            selectedScript: null,
            titles: [],
            shockWords: { one: '', two: '', three: '' },
            covers: {},
            coverPrefs: {},
            description: '',
            lastSelectedTitle: ''
        });
    };

    const generateTitleVariations = async (originalTitle) => {
        if (!originalTitle) return;
        setIsGeneratingTitles(true);
        try {
            const apiKey = configs?.gemini_key || localStorage.getItem('guru_gemini_key');
            if (!apiKey) throw new Error('Chave Gemini não configurada.');

            const prompt = `Você é um ESPECIALISTA ELITE em CTR, Copywriting e Algoritmos do YouTube.

TÍTULO ORIGINAL DO VÍDEO: "${originalTitle}"

MISSÃO: Criar 2 variações de título com altíssimo potencial de viralização, MAIS 3 Palavras Choque para a thumbnail.

---
## ANATOMIA DE TÍTULO VIRAL (aplique em AMBAS as variações)
Todo título deve ter simultaneamente:
1. ESPECIFICIDADE: Número, nome, dado concreto ou contexto preciso (nunca genérico)
2. LACUNA COGNITIVA: Entrega informação suficiente para criar curiosidade, mas não resolve — o cérebro exige clicar
3. EMOÇÃO PRIMÁRIA: Escolha UMA — medo, curiosidade, esperança, indignação ou surpresa
4. COMPRIMENTO: Entre 40 e 80 caracteres (ideal para YouTube feed e Shorts)
5. PALAVRA DE ABERTURA DE IMPACTO: A primeira palavra deve ser a mais forte da frase

---
## VARIAÇÃO 1 — GATILHO: CURIOSIDADE EXTREMA
Estrutura obrigatória: [Revelação inesperada] + [Contexto específico] + [Implicação pessoal implícita]
- Use a lacuna cognitiva máxima — o ouvinte deve pensar "isso não pode ser verdade"
- Evite explicar demais — o mistério é o gancho
- A variação NÃO deve repetir palavras do título original
- is_best: false

## VARIAÇÃO 2 — GATILHO: PROMESSA IRRESISTÍVEL + URGÊNCIA
Estrutura obrigatória: [Resultado específico e concreto] + [Tempo ou condição] + [Elemento de exclusividade ou urgência]
- Use números quando possível (aumentam CTR em até 36%)
- A promessa deve parecer alcançável mas surpreendente
- A variação NÃO deve repetir palavras da Variação 1
- is_best: true (esta é a mais viral)

---
## PALAVRAS CHOQUE PARA THUMBNAIL
Palavras de impacto visual máximo para usar em sobreposição de texto na capa:
- "one": UMA palavra só — de impacto emocional brutal (máx 8 letras). Exemplos de referência: REVELADO, ERROU, JAMAIS, NUNCA, CAIU
- "two": DUAS palavras — cria contradição ou promessa (máx 12 letras cada). Exemplos: SÓ ISSO?, POR QUÊ?, FOI TARDE
- "three": TRÊS palavras — frase de impacto completa. Exemplos: VAI MUDAR TUDO, NÃO ERA ASSIM, SABIA DESDE SEMPRE
IMPORTANTE: Use o MESMO IDIOMA do título original. Letras maiúsculas.

---
## BLACKLIST — NÃO USE
❌ Palavras genéricas: "incrível", "surpreendente", "chocante" sem substância
❌ Estruturas batidas: "A verdade que ninguém conta", "O segredo que escondem"
❌ Títulos com mais de 85 caracteres
❌ Títulos que serviriam para qualquer vídeo

---
## FORMATO DE RETORNO
Retorne ESTRITAMENTE um objeto JSON exatamente como este (sem markdown, sem explicações):
{
  "variations": [
    { "text": "...", "label": "Variação de Curiosidade", "is_best": false },
    { "text": "...", "label": "Promessa Viral ⭐", "is_best": true }
  ],
  "shockWords": {
    "one": "...",
    "two": "...",
    "three": "..."
  }
}`;

            const result = await callAI(prompt, { gptKey: configs.gpt_key });

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

            // Robust parsing for shock words
            const sw = parsed.shockWords || parsed.shock_words || parsed.palavras_choque || {};
            updateCoverState({
                titles: [
                    { text: originalTitle.substring(0, 100), label: 'Título Original', isOriginal: true },
                    { text: (parsed.variations?.[0]?.text || 'Erro ao gerar').substring(0, 100), label: parsed.variations?.[0]?.label || 'Variação 1', is_best: Boolean(parsed.variations?.[0]?.is_best) },
                    { text: (parsed.variations?.[1]?.text || 'Erro ao gerar').substring(0, 100), label: parsed.variations?.[1]?.label || 'Variação 2', is_best: Boolean(parsed.variations?.[1]?.is_best) }
                ],
                shockWords: {
                    one: sw.one || sw.palavra1 || sw.first || '-',
                    two: sw.two || sw.palavra2 || sw.second || '-',
                    three: sw.three || sw.palavra3 || sw.third || '-'
                }
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

    const handleGenerateDescription = async () => {
        if (!selectedScript || !lastSelectedTitle) return;
        setIsGeneratingDescription(true);
        try {
            const apiKey = configs?.gemini_key || localStorage.getItem('guru_gemini_key');
            if (!apiKey) throw new Error('Chave Gemini não configurada.');

            const prompt = `Você é um ESPECIALISTA ELITE em SEO para YouTube, Copywriting e Storytelling Digital.

CONTEXTO:
- Título do Vídeo: "${lastSelectedTitle}"
- Trecho do Roteiro: """${selectedScript.content?.substring(0, 1500) || 'Use apenas o título como base'}"""

---
## ESTRUTURA OBRIGATÓRIA DA DESCRIÇÃO
A descrição deve seguir exatamente esta arquitetura em ordem:

**BLOCO 1 — GANCHO INICIAL (primeiras 2 linhas)**
As primeiras 2 linhas aparecem no feed ANTES do "Ver mais". São o único texto que o algoritmo e o usuário veem primeiro. Devem:
- Criar curiosidade imediata ou fazer uma afirmação impactante
- Conter a palavra-chave principal do vídeo naturalmente
- NUNCA começar com "Neste vídeo" ou "Olá pessoal"

**BLOCO 2 — SOBRE O VÍDEO (3-4 linhas)**
- Descreva o que o espectador vai descobrir/aprender/sentir
- Use bullet points implícitos com linguagem dinâmica
- Inclua 2-3 variações semânticas da palavra-chave principal

**BLOCO 3 — CTA (1-2 linhas)**
- Peça uma ação específica (se inscrever, comentar com uma palavra, ativar notificações)
- A CTA deve surgir naturalmente da narrativa, não como obrigação
- NUNCA use: "não se esqueça de curtir", "ativa o sininho"

**BLOCO 4 — HASHTAGS (última linha)**
- Exatamente 5 hashtags estratégicas
- Mix: 1 hashtag ampla (nicho), 2 hashtags médias (subtópico), 2 hashtags específicas (tema do vídeo)
- Format: #HashtagSemEspaço

---
## REQUISITOS TÉCNICOS
- IDIOMA: Obrigatoriamente o MESMO IDIOMA do título "${lastSelectedTitle}"
- COMPRIMENTO: Entre 600 e 800 caracteres TOTAIS (incluindo hashtags)
- DISCLAIMER: ${withDisclaimer ? 'OBRIGATÓRIO: Adicione antes das hashtags: "⚠️ Este vídeo é uma obra de ficção/entretenimento. Qualquer semelhança com pessoas ou eventos reais é mera coincidência."' : 'NÃO inclua avisos de ficção.'}
- COERÊNCIA: Seja fiel ao título e ao espírito do roteiro
- ZERO marketing genérico: Cada frase deve ser específica para ESTE vídeo

Retorne APENAS o texto da descrição pronto para copiar, sem introduções, sem aspas, sem markdown.`;

            const result = await callAI(prompt, { gptKey: configs.gpt_key });
            updateCoverState({ description: result.replace(/```markdown/g, '').replace(/```/g, '').trim() });
        } catch (error) {
            console.error('Erro ao gerar descrição:', error);
            alert("Falha ao gerar descrição: " + error.message);
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleGenerateCover = async (idx, title) => {
        updateCoverState({ covers: { ...covers, [idx]: { loading: true, prompt: null, error: null } } });
        try {
            const prefs = coverPrefs[idx] || { includeText: false, colorStyle: 'standard', distance: 'close', styleId: 'cinematic' };
            const visualPrompt = await buildDetailedCoverPrompt(title, prefs);
            updateCoverState({ covers: { ...covers, [idx]: { loading: false, prompt: visualPrompt, error: null } } });
        } catch (error) {
            console.error('Erro ao gerar prompt da capa:', error);
            updateCoverState({ 
                covers: { 
                    ...covers, 
                    [idx]: { 
                        loading: false, 
                        prompt: null, 
                        error: error.message
                    } 
                } 
            });
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
            <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto min-h-full md:h-full flex flex-col overflow-y-auto custom-scrollbar">
                <header className="mb-12">
                    <h2 className="text-3xl md:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan p-[2px] shadow-[0_0_20px_rgba(176,38,255,0.3)]">
                            <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        Gerar Capa
                    </h2>
                    <p className="text-gray-400 mt-3 font-bold text-sm uppercase tracking-[0.2em] border-l-4 border-neon-purple pl-4 ml-2 italic">
                        DESIGN CENTER V3: Criação de Identidade Visual para Vídeos de Alta Conversão
                    </p>
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
        <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto h-full flex flex-col overflow-y-auto custom-scrollbar pb-20">
                <header className="mb-12">
                    <h2 className="text-3xl md:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-cyan p-[2px] shadow-[0_0_20px_rgba(176,38,255,0.3)]">
                            <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        Capa de Vídeo
                    </h2>
                    <p className="text-gray-400 mt-3 font-bold text-sm uppercase tracking-[0.2em] border-l-4 border-neon-purple pl-4 ml-2 italic">
                        Gerando protocolos visuais para: <strong className="text-neon-purple">{selectedScript.title}</strong>
                    </p>
                </header>
                
                <div className="mb-10 flex">
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-neon-purple/50 hover:bg-neon-purple/5 bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4" /> Selecionar Outro Roteiro
                    </button>
                </div>

            {/* Engine Selector removed */}
            
            {/* Shock Words Section */}
            <AnimatePresence>
                {selectedScript && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10"
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <Zap className="w-5 h-5 text-neon-cyan" />
                            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Centro de Controle de Variações</h3>
                            <button 
                                onClick={() => generateTitleVariations(selectedScript.title)}
                                disabled={isGeneratingTitles}
                                className="ml-4 px-3 py-1.5 rounded-lg border border-neon-cyan/20 bg-neon-cyan/5 text-[9px] font-black text-neon-cyan uppercase tracking-widest hover:bg-neon-cyan/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-30"
                            >
                                <RefreshCw className={`w-3 h-3 ${isGeneratingTitles ? 'animate-spin' : ''}`} />
                                Regenerar Variações
                            </button>
                            <div className="h-px flex-1 bg-white/5 ml-2" />
                        </div>

                        {shockWords.one && (
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
                                                onClick={() => handleCopy(card.text, `shock-${card.id}`)}
                                                className={`p-2 rounded-lg border transition-all active:scale-95
                                                    ${copiedSection === `shock-${card.id}` 
                                                        ? 'bg-green-500/20 border-green-500 text-green-400' 
                                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}
                                                `}
                                                title="Copiar"
                                            >
                                                {copiedSection === `shock-${card.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
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
                        )}
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
                                    <h3 
                                        onClick={() => updateCoverState({ lastSelectedTitle: titleText })}
                                        className={`text-xl md:text-2xl font-black leading-[1.2] transition-colors max-w-4xl cursor-pointer hover:opacity-80
                                            ${lastSelectedTitle === titleText ? 'bg-white/10 p-2 rounded-lg' : ''}
                                            ${isBest ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'text-white'}
                                        `}
                                    >
                                        {titleText || (isGeneratingTitles ? 'Projetando o melhor ângulo...' : 'Aguardando...')}
                                    </h3>
                                    <button 
                                        onClick={() => handleCopy(titleText, `title-${idx}`)}
                                        className={`shrink-0 h-11 w-11 lg:w-40 rounded-xl border transition-all flex items-center justify-center gap-2 group/copy transform active:scale-95 shadow-md
                                            ${copiedSection === `title-${idx}` 
                                                ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}
                                        `}
                                    >
                                        {copiedSection === `title-${idx}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest hidden lg:block">{copiedSection === `title-${idx}` ? 'Copiado!' : 'Copiar Título'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Section 2: Laboratory Control Center */}
                            <div className="p-6 bg-dark/40 border border-white/5 rounded-2xl relative overflow-hidden group/lab">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="p-1.5 bg-neon-pink/10 rounded-lg">
                                        <Wand2 className="w-4 h-4 text-neon-pink" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Direção de Arte e Customização</h3>
                                </div>
                                
                                <div className="space-y-8">
                                    {/* Visual Style Cards */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Palette className="w-3 h-3 text-gray-500" />
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Estilos Visuais (Cartões)</label>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                            {THUMBNAIL_STYLES.map(style => {
                                                const isSelected = (coverPrefs[idx]?.styleId || 'cinematic') === style.id;
                                                return (
                                                    <button
                                                        key={style.id}
                                                        onClick={() => {
                                                            const newPrefs = { ...coverPrefs[idx], styleId: style.id };
                                                            updateCoverState({ coverPrefs: { ...coverPrefs, [idx]: newPrefs } });
                                                        }}
                                                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all group/card
                                                            ${isSelected 
                                                                ? 'bg-neon-purple/20 border-neon-purple shadow-[0_0_15px_rgba(176,38,255,0.2)]' 
                                                                : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'}
                                                        `}
                                                    >
                                                        <div className={`p-2 rounded-lg transition-transform group-hover/card:scale-110 ${isSelected ? 'text-neon-purple' : 'text-gray-500'}`}>
                                                            <style.icon className="w-5 h-5" />
                                                        </div>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest text-center ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                                                            {style.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                                        {/* Text Toggle Chip */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Type className="w-3 h-3 text-gray-500" />
                                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Modo de Texto</label>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const newPrefs = { ...coverPrefs[idx], includeText: !coverPrefs[idx]?.includeText };
                                                    updateCoverState({ coverPrefs: { ...coverPrefs, [idx]: newPrefs } });
                                                }}
                                                className={`w-full h-11 rounded-xl px-4 transition-all flex items-center justify-between border ${coverPrefs[idx]?.includeText ? 'bg-neon-cyan/10 border-neon-cyan/50 shadow-[0_0_10px_rgba(0,243,255,0.05)]' : 'bg-red-500/5 border-red-500/30'}`}
                                            >
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${coverPrefs[idx]?.includeText ? 'text-neon-cyan' : 'text-red-400'}`}>
                                                    {coverPrefs[idx]?.includeText ? 'Com Texto' : 'Sem Texto'}
                                                </span>
                                                <div className={`w-7 h-3.5 rounded-full p-0.5 transition-all flex items-center ${coverPrefs[idx]?.includeText ? 'bg-neon-cyan' : 'bg-gray-700'}`}>
                                                    <div className={`w-2.5 h-2.5 bg-white rounded-full transition-all ${coverPrefs[idx]?.includeText ? 'translate-x-3.5' : 'translate-x-0'}`} />
                                                </div>
                                            </button>
                                            <p className="text-[7px] font-bold text-gray-600 uppercase tracking-tighter">
                                                {coverPrefs[idx]?.includeText ? 'AI irá gerar frases de impacto.' : 'AI proibida de gerar letras.'}
                                            </p>
                                        </div>
                                        
                                        {/* Color Style Pills */}
                                        <div className="space-y-2 lg:col-span-1">
                                            <div className="flex items-center gap-2">
                                                <Palette className="w-3 h-3 text-gray-500" />
                                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Tratamento de Cor</label>
                                            </div>
                                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 h-11">
                                                {[
                                                    { id: 'standard', label: 'Cores', icon: Zap },
                                                    { id: 'bw', label: 'P&B', icon: CloudMoon },
                                                    { id: 'selective', label: 'Selective', icon: Target }
                                                ].map(c => (
                                                    <button 
                                                        key={c.id}
                                                        onClick={() => {
                                                            const newPrefs = { ...coverPrefs[idx], colorStyle: c.id };
                                                            updateCoverState({ coverPrefs: { ...coverPrefs, [idx]: newPrefs } });
                                                        }}
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
                                                    { id: 'close', label: 'Close', icon: MousePointer2 },
                                                    { id: 'wide', label: 'Full', icon: Globe }
                                                ].map(d => (
                                                    <button 
                                                        key={d.id}
                                                        onClick={() => {
                                                            const newPrefs = { ...coverPrefs[idx], distance: d.id };
                                                            updateCoverState({ coverPrefs: { ...coverPrefs, [idx]: newPrefs } });
                                                        }}
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
                                            className="h-11 bg-neon-purple text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neon-purple/80 shadow-lg shadow-neon-purple/20 active:scale-95 disabled:opacity-30"
                                        >
                                            {covers[idx]?.loading ? <LoadingSpinner size="xs" message="" /> : <><Sparkles className="w-4 h-4" /> Gerar Prompt Elite</>}
                                        </button>
                                    </div>
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
                                                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">ELITE PROMPT GENERATOR</h4>
                                                        <p className="text-[8px] text-neon-cyan font-mono uppercase tracking-widest italic animate-pulse">FIDELIDADE MÁXIMA ATIVADA</p>
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    onClick={() => handleCopy(covers[idx].prompt, `prompt-${idx}`)}
                                                    className={`px-4 py-2 rounded-lg border transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transform active:scale-95 shadow-md
                                                        ${copiedSection === `prompt-${idx}` 
                                                            ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                                                            : 'bg-neon-cyan/10 border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/20 hover:border-neon-cyan/40'}
                                                    `}
                                                >
                                                    {copiedSection === `prompt-${idx}` ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                                                    {copiedSection === `prompt-${idx}` ? 'Copiado!' : 'Copiar Prompt'}
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

            {/* Description Optimizer Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 glass-card p-8 border border-neon-cyan/20 relative shrink-0 min-h-[140px]"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="w-6 h-6 text-neon-cyan" />
                            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic">Otimizador de Descrição Apex</h3>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-l-2 border-neon-cyan pl-3">
                            Gerando para: <span className="text-neon-cyan">{lastSelectedTitle || 'Selecione um título acima'}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer" htmlFor="disclaimer-toggle">
                                Aviso de Ficção
                            </label>
                            <button 
                                id="disclaimer-toggle"
                                onClick={() => setWithDisclaimer(!withDisclaimer)}
                                className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${withDisclaimer ? 'bg-neon-cyan' : 'bg-white/10'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-all ${withDisclaimer ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <button 
                            onClick={handleGenerateDescription}
                            disabled={isGeneratingDescription || !lastSelectedTitle}
                            className="px-8 py-3 bg-gradient-to-r from-neon-cyan to-blue-600 text-dark font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2"
                        >
                            {isGeneratingDescription ? <Loader2 className="w-4 h-4 animate-spin text-dark" /> : <RefreshCw className="w-4 h-4 text-dark" />}
                            Gerar Descrição
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {description ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="relative group/desc"
                        >
                            <div className="bg-dark/60 border border-white/5 rounded-2xl p-8 font-medium text-gray-300 leading-relaxed text-sm md:text-base whitespace-pre-line shadow-inner">
                                {description}
                            </div>
                            
                            <div className="absolute top-4 right-4 group-hover/desc:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleCopy(description, 'final-desc')}
                                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all border shadow-lg active:scale-95
                                        ${copiedSection === 'final-desc' 
                                            ? 'bg-green-500/20 border-green-500 text-green-400' 
                                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-neon-cyan'}
                                    `}
                                >
                                    {copiedSection === 'final-desc' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copiedSection === 'final-desc' ? 'Copiado!' : 'Copiar Descrição'}
                                </button>
                            </div>

                            <div className="mt-4 flex justify-between items-center px-2">
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                                    Contagem: <span className={description.length < 600 || description.length > 800 ? 'text-red-500' : 'text-neon-cyan'}>{description.length}</span> caracteres
                                </span>
                                <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex gap-4">
                                    <span>Resumo ✓</span>
                                    <span>Sobre ✓</span>
                                    <span>CTA ✓</span>
                                    <span>5 Hashtags ✓</span>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-32 flex items-center justify-center border border-dashed border-white/5 rounded-2xl opacity-30">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400 italic">
                                {lastSelectedTitle ? 'Pronto para otimizar. Clique em "Gerar".' : 'Aguardando seleção de título acima...'}
                            </p>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>

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
