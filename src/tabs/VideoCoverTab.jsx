import React, { useState, useEffect } from 'react';
import { ImageIcon, Wand2, Download, RefreshCw, AlertCircle, Type, Sparkles, Zap, Box, Copy, Check, Palette, CloudMoon, Target, Maximize, MousePointer2, Globe, Terminal, AlertTriangle, Loader2, Camera, Brush, PenTool, Monitor, Ghost, Sun, Moon, Star, Flame, Droplet, Wind, Tv } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { usePersistence } from '../contexts/PersistenceContext';
import { resolveApiUrl } from '../utils/apiUtils';
import { callAI, generateGeminiImage } from '../utils/aiUtils';
import { useCloudStorage } from '../hooks/useCloudStorage';
const detectLanguage = (title) => {
  const text = (title || '').toLowerCase();
  const ptWords = ['como', 'o', 'a', 'e', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'não', 'mais', 'é', 'você', 'seu', 'sua'];
  const esWords = ['como', 'el', 'la', 'y', 'del', 'de', 'en', 'un', 'una', 'para', 'con', 'no', 'más', 'es', 'usted', 'su', 'sus'];
  const enWords = ['how', 'the', 'a', 'and', 'of', 'in', 'to', 'with', 'not', 'more', 'is', 'you', 'your', 'for', 'on', 'at', 'this'];
  
  let ptCount = 0;
  let esCount = 0;
  let enCount = 0;
  
  const words = text.split(/\s+/);
  for (const w of words) {
    if (ptWords.includes(w)) ptCount++;
    if (esWords.includes(w)) esCount++;
    if (enWords.includes(w)) enCount++;
  }
  
  if (enCount > ptCount && enCount > esCount) return 'en';
  if (esCount > ptCount && esCount > enCount) return 'es';
  return 'pt';
};

const getInstantVariations = (title) => {
  const lang = detectLanguage(title);
  const cleanTitle = title.replace(/[^\w\s\u00C0-\u00FF]/gi, '').trim();
  
  if (lang === 'en') {
    return {
      variations: [
        { text: `The Shocking Truth About: ${cleanTitle}`, label: 'Curiosity Loop', is_best: false },
        { text: `How I Mastered ${cleanTitle} Fast`, label: 'Viral Hook ⭐', is_best: true }
      ],
      shockWords: {
        one: 'REVEALED',
        two: 'DONT MISS',
        three: 'WATCH THIS NOW'
      }
    };
  } else if (lang === 'es') {
    return {
      variations: [
        { text: `Lo Que Nadie Dice Sobre: ${cleanTitle}`, label: 'Bucle de Curiosidad', is_best: false },
        { text: `Cómo Dominar ${cleanTitle} Rápido`, label: 'Gancho Viral ⭐', is_best: true }
      ],
      shockWords: {
        one: 'REVELADO',
        two: 'GRAN ERROR',
        three: 'NO HAGAS ESTO'
      }
    };
  } else {
    // Default: pt
    return {
      variations: [
        { text: `O Que Ninguém Te Conta Sobre: ${cleanTitle}`, label: 'Loop de Curiosidade', is_best: false },
        { text: `Como Dominar ${cleanTitle} Rápido`, label: 'Gatilho Viral ⭐', is_best: true }
      ],
      shockWords: {
        one: 'REVELADO',
        two: 'ERRO GRAVE',
        three: 'NÃO FAÇA ISSO'
      }
    };
  }
};

const THUMBNAIL_STYLES = [
    { id: 'cinematic', label: 'Cinematográfico', icon: Sparkles, prompt: 'Cinematic lighting, high contrast, shallow depth of field, blockbuster movie poster aesthetic, extremely detailed textures.' },
    { id: 'documentary', label: 'Documentário', icon: Zap, prompt: 'Realistic documentary style, raw and authentic, natural lighting, gritty textures, high fidelity, 8k resolution.' },
    { id: '3d_render', label: '3D Render', icon: Box, prompt: 'Stylized 3D render, Octane render, vibrant colors, expressive character design, high-end digital art aesthetic.' },
    { id: 'anime', label: 'Anime/Manga', icon: Palette, prompt: 'Dynamic anime style, strong character outlines, vibrant cel-shaded colors, dramatic perspective.' },
    { id: 'cyberpunk', label: 'Cyberpunk', icon: Zap, prompt: 'Retro-futuristic cyberpunk aesthetic, neon lights (cyan and magenta), high contrast, rainy atmosphere, foggy depth.' },
    { id: 'suspense', label: 'Suspense/Horror', icon: AlertTriangle, prompt: 'Dark and atmospheric, high contrast shadows, moody lighting, ominous feeling, mysterious silhouette.' },
    { id: 'minimalist', label: 'Minimalista', icon: Maximize, prompt: 'Clean minimalist composition, single focal point, soft neutral background, focus on essential details.' },
    // Novas +16 estilos:
    { id: 'vaporwave', label: 'Vaporwave', icon: Monitor, prompt: '80s retrowave aesthetic, synthwave, glowing grid, magenta and cyan neon lighting, VHS glitch effect.' },
    { id: 'oil_painting', label: 'Pintura a Óleo', icon: Brush, prompt: 'Classic oil painting masterpiece, dramatic chiaroscuro lighting, rich visible brushstrokes, museum quality.' },
    { id: 'watercolor', label: 'Aquarela', icon: Droplet, prompt: 'Soft watercolor illustration, ethereal blending, paper texture, delicate washes of color.' },
    { id: 'low_poly', label: 'Low Poly', icon: Box, prompt: 'Low poly 3D art, flat shading, geometric facets, vibrant pastel colors, isometric perspective.' },
    { id: 'photoreal', label: 'Fotorealismo 8k', icon: Camera, prompt: 'Ultra-photorealistic macro photography, shot on 85mm lens, f/1.2, insanely detailed, studio lighting, hyper-sharp.' },
    { id: 'steampunk', label: 'Steampunk', icon: Zap, prompt: 'Victorian steampunk aesthetic, brass gears, steam clouds, warm sepia and gold tones, intricate mechanical details.' },
    { id: 'pixel_art', label: 'Pixel Art', icon: Monitor, prompt: '16-bit retro pixel art, sharp pixels, vibrant SNES color palette, nostalgic gaming aesthetic.' },
    { id: 'noir', label: 'Filme Noir', icon: Moon, prompt: 'Classic film noir, harsh shadows, pure black and white, high contrast lighting, moody detective aesthetic.' },
    { id: 'pop_art', label: 'Pop Art', icon: Palette, prompt: 'Andy Warhol pop art style, Ben-Day dots, ultra-saturated flat colors, thick comic book outlines.' },
    { id: 'vector', label: 'Vetor Corporativo', icon: PenTool, prompt: 'Clean vector illustration, flat colors, modern corporate tech aesthetic, geometric shapes, minimal shading.' },
    { id: 'epic_fantasy', label: 'Fantasia Épica', icon: Flame, prompt: 'High fantasy epic scale, glowing magic, dramatic lighting, legendary heroic atmosphere, highly detailed concept art.' },
    { id: 'scifi', label: 'Ficção Científica', icon: Star, prompt: 'Futuristic sci-fi space opera, glowing holographic UI, deep space blues and purples, highly advanced tech.' },
    { id: 'studio', label: 'Retrato Estúdio', icon: Camera, prompt: 'Professional studio portrait photography, softbox lighting, crisp solid backdrop, high-end editorial fashion look.' },
    { id: 'vlog', label: 'Vlog Lifestyle', icon: Tv, prompt: 'GoPro ultra-wide angle, bright sunny day, highly saturated natural colors, authentic YouTube vlogger aesthetic.' },
    { id: 'liminal', label: 'Terror Psicológico', icon: Ghost, prompt: 'Unsettling liminal space, slightly off-putting, harsh fluorescent lighting, empty and cold, psychological horror.' },
    { id: 'origami', label: 'Papercraft', icon: Box, prompt: 'Constructed entirely from folded paper, papercraft art, visible paper textures, warm studio lighting casting soft shadows.' }
];

// Helper: build a detailed visual prompt for the cover using universal callAI
async function buildDetailedCoverPrompt(title, scriptContext, prefs = {}) {
    const { includeText, colorStyle, distance, styleId } = prefs;
    const selectedStyle = THUMBNAIL_STYLES.find(s => s.id === styleId) || THUMBNAIL_STYLES[0];

    const textInstruction = includeText 
        ? `MANDATORY: Detect the exact language of "${title}". Add a punchy, viral overlay text (max 3 words) in that SAME language. You MUST enclose the text in double quotes in the prompt so Imagen 3 can render it (e.g., A large text overlay reading "YOUR TEXT HERE").`
        : `ABSOLUTE RESTRICTION: Do NOT include ANY text, letters, subtitles, labels, watermarks, symbols, or alphabetic characters in the image. Pure visual storytelling ONLY.`;

    const instruction = `You are a WORLD-CLASS YouTube Thumbnail Art Director specialized in viral CTR and cinematic lighting.

VIDEO TITLE: "${title}"
VIDEO CONTEXT / SEO DESCRIPTION: "${scriptContext ? scriptContext.substring(0, 500) : 'No context provided. Base the imagery purely on the title.'}"

MISSION: Create a hyper-detailed, production-ready "GOLD STANDARD" image generation prompt specifically optimized for Google Imagen 3.

VISUAL STYLE: ${selectedStyle.label}
DIRECTIVES: ${selectedStyle.prompt}

USER PREFERENCES:
- Text: ${textInstruction}
- Colors: ${colorStyle === 'bw' ? 'MONOCHROME — high contrast black & white.' : colorStyle === 'selective' ? 'COLOR POP — subject in full color, background desaturated.' : 'CINEMATIC COLOR — rich, saturated grading.'}
- Composition: ${distance === 'wide' ? 'WIDE EPIC SHOT.' : 'EXTREME CLOSE-UP.'}

MANDATORY ELITE RULES:
1. SUBJECT: Describe the main subject with microscopic detail, directly reflecting the core message of the Video Title and Context.
2. EXPRESSION: Extreme intensity (fear, awe, shock) — descriptive and visceral.
3. LIGHTING: Cinematic rim light, god rays, volumetric fog, and dramatic shadows.
4. LENS: Specify professional gear like "Shot on 35mm Sigma Art lens, f/1.4, 8k resolution".
5. IMAGEN 3 OPTIMIZATION: Write the prompt as a continuous, flowing description. Avoid comma-separated keyword salads.

OUTPUT FORMAT (MANDATORY):
PROMPT: [Ultra-detailed continuous flowing visual description]
NEGATIVE PROMPT: [Technical anti-quality tokens, blurry, low resolution, bad anatomy, text in image (unless requested), artifacts, watermarks, cartoonish (unless specified)]

Return ONLY the prompt and negative prompt in English. No markdown, no quotes around the whole block.`;

    return await callAI(instruction, { model: "gemini-2.5-flash" });
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
    return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=576&seed=${seed}`;
}

export const VideoCoverTab = ({ isActive }) => {
    const { configs, showToast } = useSystemStatus();
    const { coverState, setCoverState, coverTrigger, setCoverTrigger } = usePersistence();
    
    // Destructuring global state for easier use
    const { 
        selectedScript, 
        titles: rawTitles, 
        shockWords, 
        covers, 
        coverPrefs, 
        lastSelectedTitle 
    } = coverState;

    // Helper to update specific parts of the coverState
    const updateCoverState = (updates) => setCoverState(prev => ({ ...prev, ...updates }));

    // Filter to ensure only Título Original, Teste A/B 1, and Teste A/B 2 remain
    const titles = [];
    let abCount = 0;
    for (const t of (rawTitles || [])) {
        if (t.isOriginal) {
            titles.push(t);
        } else {
            abCount++;
            if (abCount <= 2) {
                titles.push({
                    ...t,
                    label: `Teste A/B ${abCount}`
                });
            }
        }
    }

    // Cleanup persisted titles to remove any stale or extra A/B states
    useEffect(() => {
        if (coverState.titles) {
            let currentAbCount = 0;
            const cleaned = [];
            let needsCleanup = false;
            for (const t of coverState.titles) {
                if (t.isOriginal) {
                    cleaned.push(t);
                } else {
                    currentAbCount++;
                    if (currentAbCount <= 2) {
                        const expectedLabel = `Teste A/B ${currentAbCount}`;
                        if (t.label !== expectedLabel) {
                            needsCleanup = true;
                        }
                        cleaned.push({
                            ...t,
                            label: expectedLabel
                        });
                    } else {
                        needsCleanup = true;
                    }
                }
            }
            if (needsCleanup) {
                setCoverState(prev => ({ ...prev, titles: cleaned }));
            }
        }
    }, [coverState.titles, setCoverState]);

    const [scripts, setScripts] = useState([]);
    const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [copiedSection, setCopiedSection] = useState(null);
    const [pools, setPools] = useState([]);
    const [cloudPools] = useCloudStorage('seo_pools', []);

    const handleCopy = (text, section) => {
        navigator.clipboard.writeText(text);
        setCopiedSection(section);
        setTimeout(() => setCopiedSection(null), 2000);
    };
    
    const ENGINES = []; // Keep empty or just remove entirely. Let's just remove them.

    useEffect(() => {
        if (!isActive) return;
        const fallback = JSON.parse(localStorage.getItem('guru_cloud_seo_pools') || '[]');
        setPools(cloudPools.length > 0 ? cloudPools : fallback);
    }, [isActive, cloudPools]);

    // Escuta o redirecionamento da Aba SEO
    useEffect(() => {
        if (!isActive) return;
        if (coverTrigger && pools && pools.length > 0) {
            const pool = pools.find(p => p.id.toString() === coverTrigger.toString());
            if (pool) {
                handleSelectPool(pool);
                setCoverTrigger(null);
            }
        }
    }, [isActive, pools, coverTrigger, setCoverTrigger]);

    const handleSelectPool = (pool) => {
        const abTitles = Array.isArray(pool.seoResult?.titles) ? pool.seoResult.titles : [];
        const newTitles = [
            { text: pool.title, label: 'Título Original', isOriginal: true },
            { text: abTitles[0] || 'Variação A/B 1', label: 'Teste A/B 1', is_best: false },
            { text: abTitles[1] || 'Variação A/B 2', label: 'Teste A/B 2', is_best: true }
        ].filter(t => t.text && t.text.trim() !== '' && !t.text.includes('Variação A/B'));

        updateCoverState({
            selectedScript: { id: pool.id, title: pool.title, content: pool.script, date: pool.date },
            lastSelectedTitle: pool.title,
            titles: newTitles,
            shockWords: { one: '', two: '', three: '' },
            covers: {},
            coverPrefs: {}
        });
    };

    const handleReset = () => {
        updateCoverState({
            selectedScript: null,
            titles: [],
            shockWords: { one: '', two: '', three: '' },
            covers: {},
            coverPrefs: {},
            lastSelectedTitle: ''
        });
    };

    const generateTitleVariations = async (originalTitle) => {
        if (!originalTitle) return;
        setIsGeneratingTitles(true);

        const instantResult = getInstantVariations(originalTitle);
        updateCoverState({
            titles: [
                { text: originalTitle.substring(0, 100), label: 'Título Original', isOriginal: true },
                { text: instantResult.variations[0].text.substring(0, 100), label: 'Teste A/B 1', is_best: false },
                { text: instantResult.variations[1].text.substring(0, 100), label: 'Teste A/B 2', is_best: true }
            ],
            shockWords: instantResult.shockWords,
            coverPrefs: Object.keys(coverPrefs).length === 0 ? { global: { includeText: false, colorStyle: 'standard', distance: 'close', styleId: 'cinematic' } } : coverPrefs
        });
        showToast("Variações de título preliminares aplicadas instantaneamente!", "info");

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
- Use numbers quando possível (aumentam CTR em até 36%)
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

            const result = await callAI(prompt, { model: 'gemini-2.5-flash', gptKey: configs.gpt_key });

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
                    { text: (parsed.variations?.[0]?.text || instantResult.variations[0].text).substring(0, 100), label: 'Teste A/B 1', is_best: Boolean(parsed.variations?.[0]?.is_best) },
                    { text: (parsed.variations?.[1]?.text || instantResult.variations[1].text).substring(0, 100), label: 'Teste A/B 2', is_best: Boolean(parsed.variations?.[1]?.is_best || true) }
                ],
                shockWords: {
                    one: sw.one || sw.palavra1 || sw.first || instantResult.shockWords.one,
                    two: sw.two || sw.palavra2 || sw.second || instantResult.shockWords.two,
                    three: sw.three || sw.palavra3 || sw.third || instantResult.shockWords.three
                },
                coverPrefs: Object.keys(coverPrefs).length === 0 ? { global: { includeText: false, colorStyle: 'standard', distance: 'close', styleId: 'cinematic' } } : coverPrefs
            });
            showToast("IA: Variações e Palavras Choque refinadas com sucesso!", "success");
        } catch (error) {
            console.error('Erro ao gerar variações:', error);
            showToast('Erro ao refinar variações com IA: ' + error.message, 'error');
        } finally {
            setIsGeneratingTitles(false);
        }
    };

    const handleGenerateCover = async (idx, title) => {
        setCoverState(prev => ({ ...prev, covers: { ...prev.covers, [idx]: { loading: true, prompt: null, error: null } } }));
        try {
            const prefs = coverPrefs.global || { includeText: false, colorStyle: 'standard', distance: 'close', styleId: 'cinematic' };
            const visualPrompt = await buildDetailedCoverPrompt(title, selectedScript?.content || '', prefs);
            setCoverState(prev => ({ ...prev, covers: { ...prev.covers, [idx]: { loading: false, prompt: visualPrompt, error: null } } }));
        } catch (error) {
            console.error('Erro ao gerar prompt da capa:', error);
            setCoverState(prev => ({ 
                ...prev, 
                covers: { 
                    ...prev.covers, 
                    [idx]: { loading: false, prompt: null, error: error.message } 
                } 
            }));
        }
    };

    const handleGenerateImage = async (idx, title) => {
        setCoverState(prev => ({ 
            ...prev, 
            covers: { 
                ...prev.covers, 
                [idx]: { ...(prev.covers?.[idx] || {}), isGeneratingImage: true, imageError: null } 
            } 
        }));
        
        try {
            // Pegamos o estado mais atualizado de covers para evitar staled closures
            let finalPrompt = covers[idx]?.prompt; 
            
            if (!finalPrompt) {
                const prefs = coverPrefs.global || { includeText: false, colorStyle: 'standard', distance: 'close', styleId: 'cinematic' };
                finalPrompt = await buildDetailedCoverPrompt(title, selectedScript?.content || '', prefs);
            }

            // LIMPEZA DO PROMPT: O modelo do Imagen 4 não entende a estrutura "PROMPT: ... NEGATIVE PROMPT: ...".
            // Precisamos extrair apenas a descrição visual para ele gerar a imagem correspondente ao título!
            let cleanPrompt = finalPrompt;
            if (cleanPrompt.includes('PROMPT:')) {
                const parts = cleanPrompt.split('NEGATIVE PROMPT:');
                cleanPrompt = parts[0].replace('PROMPT:', '').trim();
            }

            // OBRIGA O SISTEMA A USAR A CHAVE PAGA (GLOBAL) DIRETAMENTE PARA O IMAGEN 4
            const base64Image = await generateGeminiImage(cleanPrompt, 'GLOBAL');
            
            setCoverState(prev => ({ 
                ...prev, 
                covers: { 
                    ...prev.covers, 
                    [idx]: { 
                        ...(prev.covers?.[idx] || {}),
                        prompt: finalPrompt, 
                        isGeneratingImage: false, 
                        image: base64Image, 
                        imageError: null 
                    } 
                } 
            }));
        } catch (error) {
            console.error('Erro ao gerar imagem:', error);
            setCoverState(prev => ({ 
                ...prev, 
                covers: { 
                    ...prev.covers, 
                    [idx]: { 
                        ...(prev.covers?.[idx] || {}),
                        isGeneratingImage: false, 
                        imageError: error.message || "Falha na geração." 
                    } 
                } 
            }));
            showToast("Erro ao gerar imagem: " + (error.message || "Verifique sua cota."), "error");
        }
    };

    const handleDownload = async (imageUrl, title) => {
        try {
            const fileName = `Capa_${title.replace(/[^a-z0-9]/gi, '_').substring(0, 40)}.jpg`;
            
            // Se for uma imagem Base64 (gerada internamente), baixa diretamente
            if (imageUrl.startsWith('data:image')) {
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = fileName;
                link.click();
                return;
            }

            // Use backend proxy to avoid CORS restrictions on download and ensure JPG
            const proxyUrl = resolveApiUrl(`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`);
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Falha ao baixar via proxy.');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
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
            <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto font-sans overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-6 pb-12 pt-4 px-4 md:px-8">
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

                {pools.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 glass-card p-12 border border-white/5 opacity-50">
                        <AlertCircle className="w-20 h-20 text-gray-600 mb-6" />
                        <h3 className="text-2xl font-bold text-white mb-2">Sem Pools Disponíveis</h3>
                        <p className="text-lg text-gray-500 text-center max-w-md">Gere pacotes na aba "SEO & Publicação" primeiro.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
                        {pools.slice(0, 6).map((pool) => (
                            <motion.div
                                key={pool.id}
                                whileHover={{ scale: 1.02, border: '1px solid rgba(191, 64, 255, 0.4)' }}
                                onClick={() => handleSelectPool(pool)}
                                className="glass-card p-6 cursor-pointer border border-white/5 bg-white/5 flex flex-col justify-between h-[180px] group transition-all"
                            >
                                <div>
                                    <div className="text-[10px] font-bold text-neon-purple uppercase tracking-[0.2em] mb-2 bg-neon-purple/10 w-max px-2 py-1 rounded">Pool de SEO</div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-neon-purple transition-colors line-clamp-3">
                                        {pool.title}
                                    </h3>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-[10px] font-mono text-gray-500">{pool.date}</span>
                                    <span className="text-xs text-neon-purple font-black">SELECIONAR →</span>
                                </div>
                            </motion.div>
                        ))}
                        {[...Array(Math.max(0, 6 - pools.length))].map((_, i) => (
                             <div key={`empty-${i}`} className="glass-card border border-dashed border-white/5 opacity-20 flex items-center justify-center h-[180px]">
                                <span className="text-[10px] uppercase tracking-widest text-gray-500">Espaço Vazio</span>
                             </div>
                        ))}
                    </div>
                )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto font-sans overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-6 pb-12 pt-4 px-4 md:px-8">
                <header className="mb-12 shrink-0">
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
                
                <div className="mb-10 flex shrink-0">
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
                        className="mb-10 shrink-0"
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

            {/* PAINEL GLOBAL DE DIREÇÃO DE ARTE (Unificado para despoluir) */}
            <div className="mb-10 p-6 bg-dark/40 border border-white/5 rounded-3xl relative overflow-hidden group/lab shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-pink/5 rounded-full blur-[60px] pointer-events-none" />
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-neon-pink/10 rounded-xl">
                        <Wand2 className="w-5 h-5 text-neon-pink" />
                    </div>
                    <div>
                        <h3 className="text-[12px] font-black text-white uppercase tracking-[0.2em]">Direção de Arte Mestre</h3>
                        <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Defina o estilo visual para todas as variações</p>
                    </div>
                </div>
                
                <div className="space-y-10">
                    {/* Estilos Visuais em Chips Minimalistas */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Palette className="w-3 h-3 text-neon-purple" />
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Selecione o Estilo Visual</label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {THUMBNAIL_STYLES.map(style => {
                                const isSelected = (coverPrefs.global?.styleId || 'cinematic') === style.id;
                                return (
                                    <button
                                        key={style.id}
                                        onClick={() => {
                                            const newPrefs = { ...(coverPrefs.global || {}), styleId: style.id };
                                            updateCoverState({ coverPrefs: { ...coverPrefs, global: newPrefs } });
                                        }}
                                        className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 transition-all
                                            ${isSelected 
                                                ? 'bg-neon-purple/20 border-neon-purple text-white shadow-[0_0_15px_rgba(176,38,255,0.15)]' 
                                                : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/20'}
                                        `}
                                    >
                                        <style.icon className={`w-3.5 h-3.5 ${isSelected ? 'text-neon-purple' : ''}`} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{style.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Toggle de Texto */}
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Type className="w-3 h-3 text-neon-cyan" /> Modo de Texto
                            </label>
                            <button 
                                onClick={() => {
                                    const newPrefs = { ...(coverPrefs.global || {}), includeText: !coverPrefs.global?.includeText };
                                    updateCoverState({ coverPrefs: { ...coverPrefs, global: newPrefs } });
                                }}
                                className={`w-full h-12 rounded-2xl px-5 transition-all flex items-center justify-between border ${coverPrefs.global?.includeText ? 'bg-neon-cyan/10 border-neon-cyan/30' : 'bg-white/5 border-white/5'}`}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-widest ${coverPrefs.global?.includeText ? 'text-neon-cyan' : 'text-gray-500'}`}>
                                    {coverPrefs.global?.includeText ? 'Com Texto Viral' : 'Visual Puro (Sem Texto)'}
                                </span>
                                <div className={`w-8 h-4 rounded-full p-0.5 transition-all flex items-center ${coverPrefs.global?.includeText ? 'bg-neon-cyan' : 'bg-gray-700'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full transition-all ${coverPrefs.global?.includeText ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>
                        </div>
                        
                        {/* Tratamento de Cor */}
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Palette className="w-3 h-3 text-neon-pink" /> Tratamento de Cor
                            </label>
                            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 h-12">
                                {[
                                    { id: 'standard', label: 'Cores', icon: Zap },
                                    { id: 'bw', label: 'P&B', icon: CloudMoon },
                                    { id: 'selective', label: 'Selective', icon: Target }
                                ].map(c => (
                                    <button 
                                        key={c.id}
                                        onClick={() => {
                                            const newPrefs = { ...(coverPrefs.global || {}), colorStyle: c.id };
                                            updateCoverState({ coverPrefs: { ...coverPrefs, global: newPrefs } });
                                        }}
                                        className={`flex-1 flex items-center justify-center rounded-xl transition-all gap-2
                                            ${(coverPrefs.global?.colorStyle || 'standard') === c.id ? 'bg-neon-pink text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}
                                        `}
                                    >
                                        <c.icon className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{c.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Enquadramento */}
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Maximize className="w-3 h-3 text-neon-cyan" /> Enquadramento
                            </label>
                            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 h-12">
                                {[
                                    { id: 'close', label: 'Close', icon: MousePointer2 },
                                    { id: 'wide', label: 'Full', icon: Globe }
                                ].map(d => (
                                    <button 
                                        key={d.id}
                                        onClick={() => {
                                            const newPrefs = { ...(coverPrefs.global || {}), distance: d.id };
                                            updateCoverState({ coverPrefs: { ...coverPrefs, global: newPrefs } });
                                        }}
                                        className={`flex-1 flex items-center justify-center rounded-xl transition-all gap-2
                                            ${(coverPrefs.global?.distance || 'close') === d.id ? 'bg-neon-cyan text-dark shadow-lg' : 'text-gray-500 hover:text-gray-300'}
                                        `}
                                    >
                                        <d.icon className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{d.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
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
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`glass-card overflow-hidden border border-white/5 group transition-all duration-300 relative mb-4 shadow-xl ${glowClass} ${!isOriginal && 'hover:border-neon-purple/30'}`}
                        >
                            <div className="p-4 md:p-6 flex flex-col md:flex-row gap-6 relative">
                                {isBest && (
                                    <div className="absolute top-0 right-0 bg-yellow-500 text-dark font-black text-[9px] px-3 py-1 rounded-bl-lg uppercase tracking-widest flex items-center gap-1.5 z-30 shadow-lg">
                                        <Sparkles className="w-3 h-3" /> Viral
                                    </div>
                                )}
    
                                {/* Lado Esquerdo: Título e Botões de Ação */}
                                <div className="flex flex-col gap-4 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${badgeColor}`}>
                                            {labelText}
                                        </span>
                                        {isGeneratingTitles && !isOriginal && (
                                            <span className="flex items-center gap-1.5 text-[8px] font-bold text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20 px-2 py-0.5 rounded animate-pulse">
                                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                Refinando com IA...
                                            </span>
                                        )}
                                    </div>
                                    
                                    <h3 
                                        onClick={() => updateCoverState({ lastSelectedTitle: titleText })}
                                        className={`text-base md:text-lg font-bold leading-tight cursor-pointer transition-all hover:text-neon-purple
                                            ${lastSelectedTitle === titleText ? 'text-white' : 'text-gray-400'}
                                        `}
                                    >
                                        {titleText || 'Processando...'}
                                    </h3>
    
                                    <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
                                        <button 
                                            onClick={() => handleCopy(titleText, `title-${idx}`)}
                                            className={`h-10 w-10 md:w-auto md:px-4 rounded-xl border transition-all flex items-center justify-center gap-2 active:scale-95
                                                ${copiedSection === `title-${idx}` 
                                                    ? 'bg-green-500/20 border-green-500 text-green-400' 
                                                    : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:border-white/20'}
                                            `}
                                            title="Copiar Título"
                                        >
                                            {copiedSection === `title-${idx}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            <span className="text-[9px] font-black uppercase tracking-widest hidden md:block">{copiedSection === `title-${idx}` ? 'Copiado!' : 'Copiar'}</span>
                                        </button>
    
                                        <button 
                                            onClick={() => handleGenerateImage(idx, titleText)}
                                            disabled={!titleText || covers[idx]?.isGeneratingImage}
                                            className={`h-10 px-4 md:px-6 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30
                                                ${covers[idx]?.image ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40'}
                                            `}
                                        >
                                            {covers[idx]?.isGeneratingImage ? <LoadingSpinner size="xs" message="" /> : (
                                                <>
                                                    {covers[idx]?.image ? <RefreshCw className="w-3.5 h-3.5" /> : <Wand2 className="w-3.5 h-3.5" />}
                                                    {covers[idx]?.image ? 'Regerar Capa' : 'Gerar Capa (I.A.)'}
                                                </>
                                            )}
                                        </button>

                                        <button 
                                            onClick={() => handleGenerateCover(idx, titleText)}
                                            disabled={!titleText || covers[idx]?.loading}
                                            className={`h-10 px-4 md:px-6 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30
                                                ${covers[idx]?.prompt ? 'bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan' : 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20 hover:bg-neon-purple/80'}
                                            `}
                                        >
                                            {covers[idx]?.loading ? <LoadingSpinner size="xs" message="" /> : (
                                                <>
                                                    {covers[idx]?.prompt ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                    {covers[idx]?.prompt ? 'Refazer Prompt' : 'Gerar Prompt Elite'}
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* ERRO NA GERAÇÃO DA IMAGEM */}
                                    {covers[idx]?.imageError && (
                                        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-black uppercase tracking-wider">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <span>Erro: {covers[idx].imageError}</span>
                                        </div>
                                    )}
                                </div>
    
                                {/* Lado Direito: Espaço Reservado para a Imagem (Tamanho Cartão) */}
                                <div className="w-full md:w-64 shrink-0 flex flex-col justify-center mt-2 md:mt-0">
                                    <div className={`relative w-full aspect-video rounded-xl overflow-hidden border transition-all duration-500
                                        ${covers[idx]?.image ? 'border-white/10 shadow-2xl group/img' : 'border-dashed border-white/10 bg-dark/30 flex items-center justify-center'}
                                    `}>
                                        {covers[idx]?.image ? (
                                            <>
                                                <img src={covers[idx].image} alt={titleText} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-dark/60 opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                                                    <button 
                                                        onClick={() => handleDownload(covers[idx].image, titleText)}
                                                        className="px-4 py-2 bg-neon-cyan text-dark font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-white transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,255,0.5)] hover:scale-105 active:scale-95"
                                                    >
                                                        <Download className="w-3.5 h-3.5" /> Baixar
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-2 text-gray-500/30">
                                                <ImageIcon className="w-8 h-8" />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-center px-4">Espaço Reservado<br/>Para a Capa</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
    
                                {/* Prompt Output - Compacto e Elegante */}
                                <AnimatePresence>
                                    {covers[idx]?.prompt && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden mt-2"
                                        >
                                            <div className="p-4 bg-dark/60 border border-neon-cyan/10 rounded-xl">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Terminal className="w-3.5 h-3.5 text-neon-cyan" />
                                                        <span className="text-[8px] font-black text-neon-cyan uppercase tracking-widest">ELITE PROMPT</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleCopy(covers[idx].prompt, `prompt-${idx}`)}
                                                        className={`px-3 py-1.5 rounded-lg border transition-all text-[8px] font-black uppercase tracking-widest flex items-center gap-2
                                                            ${copiedSection === `prompt-${idx}` ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-neon-cyan/5 border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/20'}
                                                        `}
                                                    >
                                                        {copiedSection === `prompt-${idx}` ? <Check className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                                        Copiar Prompt
                                                    </button>
                                                </div>
                                                <p className="font-mono text-[11px] text-gray-400 leading-relaxed italic select-all line-clamp-3 hover:line-clamp-none transition-all">
                                                    {covers[idx].prompt}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
    
                                {covers[idx]?.error && (
                                    <div className="p-4 bg-red-400/5 rounded-xl flex items-center gap-3 border border-red-500/10 mt-2">
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                        <p className="text-red-400/70 text-[10px] font-bold uppercase tracking-tight">{covers[idx].error}</p>
                                    </div>
                                )}
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
        </div>
    );
};
