import React, { useState, useEffect } from 'react';
import { Zap, Globe, Loader2, Copy, Check, ShieldCheck, XCircle, TrendingUp, AlertCircle, CheckCircle, Sparkles, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { callGemini, callGPT } from '../utils/aiUtils';
import { resolveApiUrl } from '../utils/apiUtils';
import { t } from '../utils/i18n';

const VIRAL_HOOKS = [
  { id: 'secret', name: 'O Segredo Revelado', icon: ShieldCheck, color: 'neon-cyan', prompt: 'Curiosidade extrema e segredos ocultos', isHot: true },
  { id: 'error', name: 'O Grande Erro', icon: XCircle, color: 'neon-pink', prompt: 'Medo de errar e perda de dinheiro/tempo' },
  { id: 'journey', name: 'Transformação Real', icon: TrendingUp, color: 'green-400', prompt: 'Jornada de superação e resultados práticos' },
  { id: 'truth', name: 'Verdade Chocante', icon: AlertCircle, color: 'orange-400', prompt: 'Controvérsia e fatos que ninguém conta' },
  { id: 'fast', name: 'Caminho Rápido', icon: Zap, color: 'yellow-400', prompt: 'Velocidade, hacks e atalhos de eficiência' },
  { id: 'proof', name: 'A Prova Social', icon: CheckCircle, color: 'neon-purple', prompt: 'Estudo de caso e prova de conceito' }
];

export const ViralHacker = ({ result, configs, selectedLanguage, setSelectedLanguage, translateChannelNames }) => {
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState([]);
  const [activeHook, setActiveHook] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [brainContext, setBrainContext] = useState("");

  useEffect(() => {
    const fetchBrain = async () => {
       try {
         const niche = result?.sections?.[2] || 'Geral';
         const res = await fetch(resolveApiUrl('/api/brain/context?niche=' + niche));
         const data = await res.json();
         setBrainContext(data.experience || "");
       } catch (err) { console.error('Brain Error', err); }
    };
    if (result) fetchBrain();
  }, [result]);

  const handleGenerateHookTitles = async (hook) => {
    if (!result || isGeneratingTitles) return;
    setIsGeneratingTitles(true);
    setActiveHook(hook);
    setGeneratedTitles([]);
    
    const niche = result.sections?.[2] || 'Canal Viral';
    const mainTopic = result.channelMeta?.title || 'este nicho';
    const langName = selectedLanguage?.name || 'Português';

    const prompt = `Você é o MAIOR Estrategista de CTR e Viralização do Mundo.
Use sua MEMÓRIA DE GURU e as táticas abaixo:
${brainContext}

Sua tarefa: Criar 4 títulos virais numerados de 1 a 4 para um NOVO canal que vai dominar este nicho.
Gatilho Tático: ${hook.name} (${hook.prompt}).

REGRAS CIRÚRGICAS:
1. NÃO siga padrões prontos. Analise os nichos ${niche} e o canal ${mainTopic}.
2. Identifique falhas de CTR do concorrente e crie algo MAIS ASSERTIVO.
3. Se o tema em alta dele for X, crie o título com o gancho viral mais forte possível para X.
4. Escreva em ${langName.toUpperCase()}. Responda apenas com os 4 títulos numerados.`;

    try {
      const gptKey = configs.gpt_key?.trim();
      const geminiKey = configs.gemini_key?.trim();
      let responseText = "";
      
      if (!gptKey && !geminiKey) {
        setGeneratedTitles(["ERROR:CHAVE DE API NÃO CONFIGURADA. Vá em Ajustes para ativar a Inteligência Cirúrgica."]);
        setIsGeneratingTitles(false);
        return;
      }
      
      try { 
        if (gptKey) responseText = await callGPT(gptKey, prompt); 
        else responseText = await callGemini(geminiKey, prompt);
      } catch (err) { 
        console.error('AI Strategy Fail', err);
        setGeneratedTitles(["ERROR:FALHA NA CONEXÃO COM A IA. Verifique sua chave ou conexão de rede."]);
        setIsGeneratingTitles(false);
        return;
      }
      
      const rawLines = responseText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
      // More robust title detection: Look for lines with quotes or starting with numbers
      let titles = rawLines
        .filter(l => /^\d+[\.\s\)]+|^\-\s+/.test(l))
        .map(l => l.replace(/^[\d\s\.\-\)]+/, '').replace(/^["']|["']$/g, '').trim())
        .filter(l => l.length > 5);
      
      // If no numbered list found, take first 4 reasonable lines
      if (titles.length === 0) {
        titles = rawLines.filter(l => !l.includes(': ') || l.length < 150).slice(0, 4);
      }
      
      const intro = rawLines.find(l => l.length > 5 && !/^\d+[\.\s\)]+|^\-\s+/.test(l)) || "";
      const finalTitles = titles.length > 0 ? titles.slice(0, 4) : [];
      
      setGeneratedTitles(finalTitles);
      if (intro && finalTitles.length > 0 && finalTitles.indexOf(intro) === -1 && intro.length < 200) {
        setGeneratedTitles(prev => [ `INFO:${intro}`, ...prev ]);
      }

      // Auto-Learn Brain Integration
      fetch(resolveApiUrl('/api/brain/learn'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          niche, 
          report: 'ESTRATÉGIA DE TÍTULO GERADO: ' + finalTitles.join(' | '),
          metadata: { type: 'titles', hook: hook.name }
        })
      }).catch(e => console.error('Learning Error', e));

    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsGeneratingTitles(false); 
    }
  };

  const copyTitle = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <section className="bg-black/40 p-10 rounded-3xl border border-white/5 relative group overflow-hidden mt-10">
      <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 blur-[100px] -z-10 group-hover:bg-neon-cyan/10 transition-all" />
      
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start gap-8">
         <div className="flex-1">
            <h3 className="text-md font-black text-white flex items-center gap-2 uppercase tracking-widest text-shadow-neon">
               <Zap className="w-5 h-5 text-neon-cyan fill-current shadow-[0_0_15px_rgba(34,211,238,0.5)]" /> Hacker de Viralização 3.0
            </h3>
            <p className="text-[10px] text-neon-cyan font-bold uppercase mt-1 tracking-widest opacity-80 animate-pulse">Status: Inteligência Elite Ativa</p>
            
            {/* Country Opportunity Cards */}
            {result?.sections?.countries && (
              <div className="mt-8 space-y-4">
                 <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                   <Globe className="w-3 h-3" /> Mercados de Replicação:
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {result.sections.countries.map((c, i) => (
                     <button 
                       key={i} 
                       onClick={() => { 
                         setSelectedLanguage(c); 
                         if (translateChannelNames) translateChannelNames(c);
                         if (activeHook) handleGenerateHookTitles(activeHook); 
                       }} 
                       className={`p-4 rounded-2xl border transition-all flex flex-col items-start gap-2 relative overflow-hidden group/c
                         ${selectedLanguage?.code === c.code 
                           ? 'bg-neon-cyan/20 border-neon-cyan text-white shadow-[0_0_20px_rgba(34,211,238,0.2)]' 
                           : i === 0 
                             ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 hover:border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]' 
                             : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10'
                         }
                       `}
                     >
                        <div className="flex items-center gap-3">
                           <span className="text-2xl leading-none">{c.flag}</span> 
                           <span className="text-[11px] font-black uppercase tracking-tight">{c.name}</span>
                        </div>
                        {i === 0 ? (
                          <span className="text-[8px] text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">MÁXIMO POTENCIAL</span>
                        ) : (
                          <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Oportunidade</span>
                        )}
                        {selectedLanguage?.code === c.code && (
                          <div className="absolute top-2 right-2 flex gap-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(34,211,238,1)]" />
                          </div>
                        )}
                     </button>
                   ))}
                 </div>
              </div>
            )}
         </div>
         
         <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 uppercase tracking-widest">
            Foco: {selectedLanguage?.name || 'Global'}
         </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
         {VIRAL_HOOKS.map(h => (
           <button 
             key={h.id} 
             onClick={() => handleGenerateHookTitles(h)} 
             disabled={isGeneratingTitles} 
             className={`p-5 rounded-2xl border text-[10px] font-black transition-all flex flex-col items-center gap-4 relative overflow-hidden group/h
               ${activeHook?.id === h.id 
                 ? `bg-${h.color}/20 border-${h.color} text-white shadow-[0_0_20px_rgba(34,211,238,0.2)]` 
                 : h.isHot 
                   ? 'bg-neon-pink/5 border-neon-pink/20 text-neon-pink hover:bg-neon-pink/10 hover:border-neon-pink/40 shadow-[0_0_15px_rgba(255,18,131,0.05)]'
                   : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10 hover:border-white/10 shadow-sm'
               }
             `}
           >
              <h.icon className={`w-6 h-6 ${activeHook?.id === h.id ? `text-${h.color}` : h.isHot ? 'text-neon-pink' : 'text-gray-600'}`} /> 
              <span className="uppercase tracking-tighter leading-none text-center">{h.name}</span>
              {activeHook?.id === h.id && (
                <motion.div layoutId="activeHookTab" className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent" />
              )}
           </button>
         ))}
      </div>

      <AnimatePresence mode="wait">
        {isGeneratingTitles ? (
          <motion.div 
            key="loader"
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-5 border-t border-white/5 overflow-hidden"
          >
             <div className="w-16 h-16 rounded-full border-4 border-neon-cyan/20 border-t-neon-cyan animate-spin shadow-neon" />
             <div className="text-center">
                <p className="text-sm font-black text-neon-cyan uppercase tracking-[0.4em] animate-pulse">IA Guru Analisando Dominação...</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-2">Consultando Memória Tática do Cérebro Global</p>
             </div>
          </motion.div>
        ) : generatedTitles.length > 0 && (
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-4 pt-10 border-t border-white/10"
          >
             <div className="flex items-center gap-3 mb-6">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
                <Sparkles className="w-4 h-4 text-neon-cyan" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Resultados de Elite</span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
             </div>
             
             {generatedTitles.map((t, i) => {
               const isInfo = t.startsWith('INFO:');
               const isError = t.startsWith('ERROR:');
               const cleanText = isInfo ? t.replace('INFO:', '') : isError ? t.replace('ERROR:', '') : t;
               
               return (
                 <motion.div 
                   key={i} 
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.1 }}
                   className={`flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-3xl border transition-all shadow-2xl relative overflow-hidden 
                     ${isError ? 'bg-red-500/10 border-red-500/40' : isInfo ? 'bg-black/40 opacity-70 italic border-dashed border-white/10' : 'bg-black/60 border-white/10 hover:border-neon-cyan/50 hover:bg-black/90'}
                   `}
                 >
                    {isError ? (
                      <div className="flex items-center gap-4 w-full">
                         <AlertCircle className="w-6 h-6 text-red-500 animate-pulse" />
                         <span className="text-[11px] font-black text-red-400 uppercase tracking-widest">{cleanText}</span>
                      </div>
                    ) : (
                      <>
                        {activeHook && !isInfo && (
                          <div className={`absolute top-0 left-0 w-1.5 h-full bg-${activeHook.color} shadow-[0_0_15px_rgba(0,243,255,0.5)]`} />
                        )}
                        <div className="flex-1 pr-6">
                           {isInfo && <span className="text-[9px] font-black text-neon-purple uppercase block mb-1 tracking-widest">Sabedoria do Guru</span>}
                           <span className={`${isInfo ? 'text-[11px] text-gray-400' : 'text-[13.5px] font-black text-white leading-relaxed tracking-tight'}`}>{cleanText}</span>
                        </div>
                        {!isInfo && (
                          <button 
                            onClick={() => copyTitle(cleanText, i)} 
                            title="Injetar no Canal (Copiar)"
                            className={`mt-4 md:mt-0 p-4 rounded-full transition-all shrink-0 border flex items-center justify-center
                              ${copiedIndex === i 
                                ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                                : 'bg-neon-cyan/5 border-white/10 text-neon-cyan hover:bg-neon-cyan/20 hover:border-white/30 hover:shadow-neon-cyan'
                              }`}
                          >
                             {copiedIndex === i ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                          </button>
                        )}
                      </>
                    )}
                 </motion.div>
               );
             })}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
