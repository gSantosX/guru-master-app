import React, { useState, useEffect } from 'react';
import { Zap, Globe, Copy, Check, ShieldCheck, XCircle, TrendingUp, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from './LoadingSpinner';
import { callGemini, callGPT, callAI } from '../utils/aiUtils';
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
  const [showTranslations, setShowTranslations] = useState({}); // { index: boolean }
  const [brainContext, setBrainContext] = useState("");
  const [titleCount, setTitleCount] = useState(10);

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
    const mainTopic = result.channelMeta?.title || result.title || 'este nicho';
    const langName = selectedLanguage?.name || 'Português';
    
    // Extracted Modeler Intelligence
    const audienceVoice = result.sections?.[6] || 'Críticas não mapeadas';
    const emotionalArc = result.sections?.[5] || 'Arco não mapeado';
    const blueprintFocus = result.sections?.[12] || 'Sem protocolo';
    const titleRules = result.sections?.[3] || 'Sem regras específicas';

    const hookInstructions = {
      secret: `TÉCNICA "SEGREDO REVELADO": Use lacuna cognitiva máxima — o título deve criar um vazio informacional que o cérebro exige preencher. Fórmula: [O que foi escondido] + [Por quem/Quanto tempo] + [Implicação pessoal]. Exemplos de estrutura: "O método que [autoridade] proibiu de publicar", "O que ninguém no [nicho] te diz sobre [resultado]", "[X] anos escondendo isso de você".`,
      error: `TÉCNICA "GRANDE ERRO": Ative o medo de perda (loss aversion) — o maior gatilho cognitivo existente. O título deve fazer o ouvinte sentir que está cometendo algo errado AGORA. Fórmula: [Erro específico] + [Consequência real] + [Urgência implícita]. Exemplos: "Se você ainda faz isso em [nicho], pare imediatamente", "O erro de [contexto] que custa [consequência] a cada dia", "[Ação comum] está destruindo seu [resultado]".`,
      journey: `TÉCNICA "TRANSFORMAÇÃO REAL": Use especificidade brutal — números reais, tempo exato, resultado concreto. Genérico mata o CTR. Fórmula: [Ponto A específico] + [Tempo real] + [Ponto B específico e surpreendente]. Exemplos: "De [situação inicial específica] para [resultado surpreendente] em [tempo exato]", "[Número] dias fazendo [ação] — o que aconteceu me surpreendeu", "Como [pessoa comum] alcançou [resultado incomum] sem [obstáculo esperado]".`,
      truth: `TÉCNICA "VERDADE CHOCANTE": Viole a crença mais comum do nicho. O título deve fazer o ouvinte pensar "isso não pode ser verdade" — e clicar para confirmar. Fórmula: [Crença popular] + [Contradição direta] + [Prova implícita]. Exemplos: "Por que [conselho comum] está completamente errado", "[Fato aceito] é mentira — e os dados provam", "A indústria de [nicho] não quer que você saiba disso".`,
      fast: `TÉCNICA "CAMINHO RÁPIDO": Combine velocidade + especificidade + ceticismo resolvido. O título deve parecer um hack legítimo, não clickbait. Fórmula: [Resultado] + [Tempo específico] + [Método inesperado]. Exemplos: "[Resultado] em [tempo surpreendentemente curto] com [método incomum]", "O método de [X minutos] que substitui [semanas de esforço]", "Como conseguir [resultado] sem [esforço esperado] — o atalho que funciona".`,
      proof: `TÉCNICA "PROVA SOCIAL": Use especificidade numérica e autoridade verificável. Números precisos convertem mais que números redondos. Fórmula: [Número específico] + [Resultado verificável] + [Contexto surpreendente]. Exemplos: "[Número exato] pessoas já fizeram isso e o resultado foi [dado específico]", "Estudei [quantidade] cases de [nicho] — o padrão me surpreendeu", "O que [número] experimentos em [contexto] revelaram sobre [tema]".`,
      viral: `TÉCNICA "VIRAL MASTER": Misture os melhores gatilhos (Curiosidade, Medo de Perda, Ganho Rápido). O título deve soar como um "Fato Proibido" ou uma "Descoberta Inesperada". Use números quebrados (ex: 93.4%, 7 segredos, 11 minutos).`
    };
    const prompt = `Você é um ESPECIALISTA ELITE EM CTR E VIRALIZAÇÃO — um sistema que domina a psicologia do clique, algoritmos de plataformas e neurociência da atenção.

CONTEXTO CIRÚRGICO DO CANAL MODELADO:
- Tema Base: ${mainTopic}
- Oportunidade Delta (Nicho Ultra-Seletivo): ${niche}
- Mercado-alvo: ${langName}

📍 ANÁLISE DE PERFORMANCE REAL (VÍDEOS VIRAIS - OUTLIERS):
${result.viralVideos?.slice(0, 5).map(v => `- Título Viral: "${v.title}" (${(v.viewCount/1000).toFixed(0)}K views)`).join('\n') || 'Nenhum dado de vídeo viral disponível.'}

📍 INTELIGÊNCIA EXECUTIVA A SER SEGUIDA CEGAMENTE:

VOZ DA AUDIÊNCIA (O que os usuários estão pedindo/criticando. Resolva isso nos títulos):
${audienceVoice}

PROTOCOLO DE RETENÇÃO E ARCO EMOCIONAL:
${emotionalArc}
${titleRules}

BLUEPRINT DE AÇÃO:
${blueprintFocus}

MISSÃO: Criar exatamente ${titleCount} títulos virais de ALTO CTR e suas respectivas traduções para o Português (Brasil).

INSTRUÇÃO CRÍTICA: 
1. Não devaneie. Seus títulos DEVEM usar as regras fornecidas pela "Inteligência Executiva" e atacar DIRETAMENTE as dores mapeadas na "Voz da Audiência". 
2. ANALISE OS VÍDEOS VIRAIS ACIMA: Identifique os temas que deram certo (o "tema em alta") e crie novos títulos baseados nesse tema, mas SEM repetir a estrutura gramatical dos vídeos originais.
3. Crie estruturas "perfeitas" que tenham gatilhos emocionais (curiosidade, medo, urgência).

${hookInstructions[hook.id] || hookInstructions.viral}

FORMATO DE RESPOSTA (OBRIGATÓRIO):
Para cada título, use exatamente este formato:
Título: [Título no Idioma Nativo] || Tradução: [Tradução em PT-BR]

REGRAS DE OURO ELITE:
Todo título deve conter TODOS os elementos abaixo:
1. ESPECIFICIDADE E CONTEXTO: Resolva as dores reais lidas no contexto acima. Nada genérico.
2. NO MARKERS: NÃO use números (1., 2.), nem hashtags, nem caracteres especiais de marcação no início ou fim do título.
3. IDIOMA: O título deve estar no MESMO IDIOMA dos títulos virais listados acima (${langName}).
4. COMPRIMENTO: Máximo de 100 caracteres por título.
5. LACUNA COGNITIVA: O título entrega informação suficiente para criar curiosidade, mas não o suficiente para satisfazê-la.
6. EMOÇÃO PRIMÁRIA: Medo, curiosidade, esperança, indignação ou surpresa — uma por título.
7. POSIÇÃO: Verbo de Ação ou Substantivo de Impacto na posição de destaque.

---
## ADAPTAÇÃO CULTURAL PARA ${langName.toUpperCase()}
Adapte o vocabulário para o mercado ${langName} usando palavras de alto impacto emocional nativas desse idioma e cultura.

---
## BLACKLIST — TÍTULOS PROIBIDOS
❌ Qualquer título com numeração ou marcadores (ex: "1. Título")
❌ Qualquer título com mais de 100 caracteres
❌ "A Verdade que Ninguém Te Conta Sobre..." (overused)
❌ "O Segredo Que Todo Mundo Esconde..." (vago)
❌ "Como Fazer [X] do Zero" (sem especificidade)

---
## FORMATO DE ENTREGA (MANDATÓRIO)
Liste os ${titleCount} títulos seguindo o formato: Título: [Texto] || Tradução: [Texto]`;

    try {
      const gptKey = configs.gpt_key?.trim();
      const geminiKey = configs.gemini_key?.trim();
      let responseText = "";
      
      if (!gptKey && !geminiKey) {
        setGeneratedTitles([{ title: "ERRO: CHAVE DE API NÃO ENCONTRADA", translation: "Vá em Ajustes e configure sua chave Gemini ou OpenAI." }]);
        setIsGeneratingTitles(false);
        return;
      }
      
      try { 
        responseText = await callAI(prompt, { temperature: 0.95 });
      } catch (err) { 
        console.error('AI Dispatch failure:', err);
        setGeneratedTitles([{ 
          title: `FALHA NA CONEXÃO (${err.message})`, 
          translation: "Verifique seu saldo, cota ou validade da chave de API nos Ajustes." 
        }]);
        setIsGeneratingTitles(false);
        return;
      }
      
      const lines = responseText.split('\n').filter(l => l.includes('||'));
      if (lines.length === 0) {
         const fallbackLines = responseText.split('\n').filter(l => l.length > 20);
         if (fallbackLines.length > 0) {
            setGeneratedTitles(fallbackLines.slice(0, titleCount).map(l => ({ 
              title: l.replace(/^\d+[\.\)]\s*/, '').replace(/^Título:\s*/i, '').trim(), 
              translation: "Tradução não disponível." 
            })));
         } else {
            throw new Error("I.A. retornou em um formato irreconhecível. Tente novamente.");
         }
      } else {
        const finalResults = lines.slice(0, titleCount).map(l => {
          let [left, right] = l.split('||');
          let cleanTitle = left.replace(/Título:\s*/i, '').replace(/^\d+[\.\)]\s*/, '').trim();
          let cleanTranslation = right?.replace(/Tradução:\s*/i, '').trim() || "";
          return { title: cleanTitle, translation: cleanTranslation };
        }).filter(r => r.title.length > 5);
        
        setGeneratedTitles(finalResults);
        
        // Auto-Learn Brain Integration (Fix: finalResults instead of finalTitles)
        if (finalResults.length > 0) {
          fetch(resolveApiUrl('/api/brain/learn'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              niche, 
              report: 'ESTRATÉGIA DE TÍTULO GERADO: ' + finalResults.map(r => r.title).join(' | '),
              metadata: { type: 'titles', hook: hook.name }
            })
          }).catch(e => console.error('Learning Error', e));
        }
      }
      
      setShowTranslations({}); 

    } catch (err) { 
      console.error(err);
      setGeneratedTitles([{ title: `FALHA: ${err.message}`, translation: "Tente trocar a I.A. ativa nos Ajustes." }]);
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
            
            {/* Country and Quantity Selection Area */}
            <div className="mt-8 flex flex-col xl:flex-row gap-8">
               {/* Left Side: Language Selection */}
               <div className="flex-1">
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 mb-4">
                     <Globe className="w-4 h-4 text-neon-cyan/60" /> Mercados Selecionados para Replicação:
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                     {result?.sections?.countries?.map((c, i) => (
                       <button 
                         key={i} 
                         onClick={() => {
                           setSelectedLanguage(c);
                           if (translateChannelNames) translateChannelNames(c);
                         }}
                         className={`p-4 rounded-2xl border transition-all text-left relative overflow-hidden group/opt
                           ${selectedLanguage?.code === c.code 
                             ? 'bg-neon-cyan/20 border-neon-cyan/40 shadow-[0_0_20px_rgba(34,211,238,0.1)]' 
                             : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                           }
                         `}
                       >
                          <div className="flex items-center gap-3 mb-2">
                             <span className="text-2xl grayscale group-hover/opt:grayscale-0 transition-all">{c.flag}</span>
                             <span className={`text-[11px] font-black uppercase tracking-tight font-outfit ${selectedLanguage?.code === c.code ? 'text-white' : 'text-gray-400'}`}>{c.name}</span>
                          </div>
                          {i === 0 ? (
                            <div className="flex items-center gap-1.5">
                               <div className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" />
                               <span className="text-[8px] font-black text-orange-400/80 uppercase">Alta Probabilidade</span>
                            </div>
                          ) : (
                            <span className="text-[8px] font-bold text-gray-600 uppercase">Opportunity Market</span>
                          )}
                          
                          {selectedLanguage?.code === c.code && (
                            <div className="absolute top-2 right-2">
                               <ShieldCheck className="w-4 h-4 text-neon-cyan" />
                            </div>
                          )}
                       </button>
                     ))}
                  </div>
               </div>

               {/* Right Side: Quantity Selection */}
               <div className="xl:w-64">
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 mb-4">
                     <CheckCircle className="w-4 h-4 text-neon-purple/60" /> Quantidade de Títulos:
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-2 grid grid-cols-3 gap-2">
                    {[5, 10, 15, 20, 25, 30].map(qty => (
                      <button
                        key={qty}
                        onClick={() => setTitleCount(qty)}
                        className={`py-2.5 rounded-xl font-black text-xs transition-all ${
                          titleCount === qty 
                            ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/30 scale-105' 
                            : 'bg-dark/40 text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {qty}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-600 font-bold uppercase mt-3 italic text-center">IA calibrada para {titleCount} títulos</p>
               </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6 mt-8">
               <button 
                 onClick={() => handleGenerateHookTitles({ name: 'Viral Master', id: 'viral' })} 
                 disabled={isGeneratingTitles || !selectedLanguage} 
                 className={`flex-1 w-full p-6 rounded-2xl flex items-center justify-between group/btn transition-all duration-500
                   ${!selectedLanguage 
                     ? 'bg-white/5 border border-white/5 cursor-not-allowed opacity-50' 
                     : 'bg-gradient-to-r from-neon-cyan/20 to-transparent border border-neon-cyan/30 hover:bg-neon-cyan/30 hover:border-neon-cyan shadow-[0_0_30px_rgba(34,211,238,0.1)]'
                   }
                 `}
               >
                  <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all
                       ${!selectedLanguage ? 'bg-white/5 text-gray-700' : 'bg-neon-cyan/10 text-neon-cyan group-hover/btn:scale-110 shadow-neon'}
                     `}>
                        <Sparkles className="w-6 h-6" />
                     </div>
                     <div className="text-left">
                        <span className={`block text-[11px] font-black uppercase tracking-[0.2em] ${!selectedLanguage ? 'text-gray-600' : 'text-neon-cyan'}`}>Hacker de Viralização</span>
                        <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                           {selectedLanguage ? `Gerar ${titleCount} Títulos para ${selectedLanguage.name}` : 'Selecione um País Acima'}
                        </span>
                     </div>
                  </div>
                  {isGeneratingTitles ? (
                    <LoadingSpinner size="xs" />
                  ) : (
                    <Zap className={`w-6 h-6 transition-colors ${!selectedLanguage ? 'text-gray-700' : 'text-neon-cyan/40 group-hover/btn:text-neon-cyan'}`} />
                  )}
               </button>
               
               <div className="hidden md:flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 uppercase tracking-widest opacity-60">
                  Foco: {selectedLanguage?.name || 'Global'}
                  <div className="w-1 h-1 rounded-full bg-neon-cyan ml-2 animate-pulse" />
               </div>
            </div>
         </div>
      </header>

      <AnimatePresence mode="wait">
        {isGeneratingTitles ? (
          <motion.div 
            key="loader"
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/5 overflow-hidden"
          >
             <LoadingSpinner 
               title="Hacker de Viralização" 
               message="Forjando títulos impossíveis de ignorar..." 
               size="lg" 
               icon={Sparkles} 
             />
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
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Blueprints de Dominação</span>
                 <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {generatedTitles.map((item, i) => {
                 return (
                   <motion.div 
                     key={i} 
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.05 }}
                     className="flex flex-col bg-black/40 border border-white/5 rounded-2xl p-4 hover:border-neon-cyan/30 hover:bg-black/40 transition-all relative overflow-hidden group/item"
                   >
                         <div className="flex flex-col justify-between h-full gap-4">
                            <div className="flex-1">
                               <div className="flex items-center justify-between mb-2">
                                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Título {i+1} • {selectedLanguage?.code.toUpperCase()}</span>
                                  <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => setShowTranslations(prev => ({ ...prev, [i]: !prev[i] }))}
                                        className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all
                                           ${showTranslations[i] ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-white/5 text-gray-500 hover:text-white border border-transparent'}
                                        `}
                                     >
                                        Tradução PT-BR
                                     </button>
                                     <button 
                                       onClick={() => copyTitle(item.title, i)} 
                                       className={`p-2 rounded-lg transition-all border transform active:scale-95
                                         ${copiedIndex === i 
                                           ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                                           : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                                         }`}
                                     >
                                        {copiedIndex === i ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                     </button>
                                  </div>
                               </div>
                               <h4 className="text-[13px] font-bold text-white leading-tight tracking-tight mt-1">{item.title}</h4>
                               
                               <AnimatePresence>
                                  {showTranslations[i] && (
                                     <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 pt-4 border-t border-white/5 bg-black/20 p-3 rounded-xl"
                                     >
                                        <p className="text-[11px] font-medium text-orange-200/60 leading-relaxed italic">
                                           {item.translation || "Tradução não disponível."}
                                        </p>
                                     </motion.div>
                                  )}
                               </AnimatePresence>
                            </div>
                         </div>
                   </motion.div>
                 );
              })}
               </div>
           </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
