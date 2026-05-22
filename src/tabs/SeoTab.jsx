import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, Copy, Check, Sparkles, Type, Loader2, Search, Zap, Layers, ChevronDown, MonitorPlay, CreditCard, Plus, Minus } from 'lucide-react';
import { callAI } from '../utils/aiUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useCloudStorage } from '../hooks/useCloudStorage';

export const SeoTab = ({ isActive, setActiveTab }) => {
  const [videoTitle, setVideoTitle] = useState('');
  const [videoScript, setVideoScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [seoResult, setSeoResult] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [isFiction, setIsFiction] = useState(false);
  const [scripts, setScripts] = useCloudStorage('scripts', []);
  const [seoPools, setSeoPools] = useCloudStorage('seo_pools', []);

  // Sync scripts from cache instantly when a new script is saved in ScriptTab
  useEffect(() => {
    const syncFromCache = () => {
      try {
        const cached = localStorage.getItem('guru_cloud_scripts');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setScripts(parsed);
          }
        }
      } catch (e) {
        console.warn('[SeoTab] Falha ao sincronizar cache de roteiros:', e);
      }
    };

    syncFromCache();
    window.addEventListener('guru_scripts_updated', syncFromCache);
    return () => window.removeEventListener('guru_scripts_updated', syncFromCache);
  }, [setScripts]);

  // Tela Final & Cards
  const [endScreenCount, setEndScreenCount] = useState(3);
  const [cardsCount, setCardsCount] = useState(3);
  const [endScreenResult, setEndScreenResult] = useState(null);
  const [cardsResult, setCardsResult] = useState(null);
  const [isGeneratingEndScreen, setIsGeneratingEndScreen] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);

  useEffect(() => {
    const triggerTitle = localStorage.getItem('guru_seo_trigger_title');
    const triggerScript = localStorage.getItem('guru_seo_trigger_script');
    
    if (triggerTitle || triggerScript) {
      setVideoTitle(triggerTitle || '');
      setVideoScript(triggerScript || '');
      
      localStorage.removeItem('guru_seo_trigger_title');
      localStorage.removeItem('guru_seo_trigger_script');
    }
  }, []);

  const handleScriptSelect = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    const selected = scripts.find(s => s.id.toString() === selectedId);
    if (selected) {
      setVideoTitle(selected.title || '');
      setVideoScript(selected.content || '');
    }
    // Reseta o select para permitir escolher o mesmo caso ele edite e queira voltar
    e.target.value = "";
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAllTitles = () => {
    const titlesToCopy = [];
    if (videoTitle) titlesToCopy.push(videoTitle);
    if (Array.isArray(seoResult?.titles)) {
      titlesToCopy.push(...seoResult.titles);
    } else if (seoResult?.titles) {
      titlesToCopy.push(seoResult.titles);
    }
    const text = titlesToCopy.filter(Boolean).join('\n');
    handleCopy(text, 'all-titles');
  };

  const handleGenerate = async () => {
    if (!videoTitle.trim()) {
      alert("Por favor, insira o título do vídeo.");
      return;
    }

    setIsGenerating(true);
    setSeoResult(null);

    const prompt = `Você é um ESPECIALISTA EM SEO PARA YOUTUBE, especializado em otimização de metadados para maximizar o alcance (CTR e Retenção) no algoritmo.
Eu vou te passar o Título e o Resumo/Roteiro de um vídeo.
Sua missão é gerar o "Pacote de Upload" perfeito.

REGRA CRÍTICA DE IDIOMA: Você deve detectar automaticamente o idioma em que o "TÍTULO DO VÍDEO" foi escrito. Todo o conteúdo gerado (Descrição, Hashtags, Tags, Comentário e Títulos A/B) DEVE ser escrito estritamente neste mesmo idioma detectado, para garantir coerência no upload.

TÍTULO DO VÍDEO: "${videoTitle}"
ROTEIRO/RESUMO: "${videoScript || 'Sem roteiro detalhado. Baseie-se apenas no título para inferir o contexto.'}"
${isFiction ? '\nATENÇÃO: O usuário marcou este conteúdo como FICÇÃO. É OBRIGATÓRIO incluir um disclaimer formal e profissional no final da "DESCRIÇÃO OTIMIZADA" informando que os eventos ou entidades apresentados são fictícios e qualquer semelhança com a realidade é coincidência. O disclaimer DEVE estar no mesmo idioma do título.\n' : ''}
Gere as seguintes 4 seções usando EXATAMENTE estes cabeçalhos (com os asteriscos duplos):

**1. DESCRIÇÃO OTIMIZADA**
Escreva uma descrição persuasiva para o YouTube (2 a 3 parágrafos). O primeiro parágrafo deve conter palavras-chave fortes baseadas no título para SEO. Termine a descrição com uma call to action (CTA) sutil para inscrição.

**2. HASHTAGS**
Forneça exatamente 3 hashtags principais e relevantes para colocar no final da descrição. Formato: #exemplo #exemplo2

**3. TAGS DE VÍDEO**
Forneça uma lista de 15 a 20 tags de alta busca (incluindo cauda longa e cauda curta) separadas estritamente por vírgulas. Sem marcadores de lista, apenas texto separado por vírgula.

**4. COMENTÁRIO FIXADO**
Crie um comentário curto e extremamente engajador para ser fixado no topo do vídeo. Ele deve fazer uma pergunta instigante ao público para forçar comentários e aumentar o engajamento geral.

**5. TÍTULOS PARA TESTE A/B**
Gere 2 títulos virais alternativos baseados no tema. Eles devem ser muito fortes em CTR (Click-Through Rate) e utilizar diferentes emoções (curiosidade, medo, choque, urgência). NÃO use números (1, 2, 3), marcadores ou aspas. Apenas escreva 1 título por linha.`;

    try {
      const response = await callAI(prompt, { model: 'gemini-1.5-pro' });
      
      const sections = {
        description: '',
        hashtags: '',
        tags: '',
        comment: '',
        titles: []
      };
      
      const descMatch = response.match(/\*\*1\. DESCRIÇÃO OTIMIZADA\*\*([\s\S]*?)(?=\*\*2\. HASHTAGS\*\*|$)/);
      const hashMatch = response.match(/\*\*2\. HASHTAGS\*\*([\s\S]*?)(?=\*\*3\. TAGS DE VÍDEO\*\*|$)/);
      const tagsMatch = response.match(/\*\*3\. TAGS DE VÍDEO\*\*([\s\S]*?)(?=\*\*4\. COMENTÁRIO FIXADO\*\*|$)/);
      const commentMatch = response.match(/\*\*4\. COMENTÁRIO FIXADO\*\*([\s\S]*?)(?=\*\*5\. TÍTULOS PARA TESTE A\/B\*\*|$)/);
      const titlesMatch = response.match(/\*\*5\. TÍTULOS PARA TESTE A\/B\*\*([\s\S]*?)$/);

      if (descMatch) sections.description = descMatch[1].trim();
      if (hashMatch) sections.hashtags = hashMatch[1].trim();
      if (tagsMatch) sections.tags = tagsMatch[1].trim();
      if (commentMatch) sections.comment = commentMatch[1].trim();
      if (titlesMatch) {
        sections.titles = titlesMatch[1].trim().split('\n')
          .map(t => t.replace(/^[\d\.\-\*\s]+/, '').replace(/^["']|["']$/g, '').trim())
          .filter(t => t.length > 0)
          .slice(0, 2);
      }

      setSeoResult(sections);

      // Salva no Pool de Publicações (Limite 6)
      const newPool = {
        id: Date.now().toString(),
        title: videoTitle,
        script: videoScript,
        seoResult: sections,
        date: new Date().toLocaleString('pt-BR')
      };
      setSeoPools(prev => {
        const updated = [newPool, ...(prev || [])];
        return updated.slice(0, 6);
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar SEO: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateEndScreen = async () => {
    if (!videoTitle.trim()) { alert('Insira o título do vídeo primeiro.'); return; }
    setIsGeneratingEndScreen(true);
    setEndScreenResult(null);
    try {
      const descContext = seoResult?.description ? `\nDESCRIÇÃO SEO: "${seoResult.description.substring(0, 500)}"` : '';
      const prompt = `Você é um especialista em YouTube End Screens (Telas Finais).

REGRA DE IDIOMA: Detecte o idioma do título abaixo. TODO o conteúdo gerado DEVE estar nesse mesmo idioma.

TÍTULO DO VÍDEO: "${videoTitle}"${descContext}

Gere EXATAMENTE ${endScreenCount} elementos para a Tela Final do vídeo.

Para cada elemento, use EXATAMENTE este formato:
**ELEMENTO [N]**
- Tipo: [Vídeo Sugerido | Playlist | Inscrição | Link Externo]
- Texto CTA: [Texto curto e persuasivo que aparece na tela, máximo 60 caracteres]
- Posição: [Esquerda | Direita | Centro | Canto inferior esquerdo | Canto inferior direito]
- Duração: [ex: 5-20 segundos antes do fim]
- Descrição: [Explicação breve de por que este elemento funciona para reter o espectador]

Dicas: Priorize "Vídeo Sugerido" e "Inscrição" pois são os que mais aumentam Watch Time e Subs. O CTA deve ser irresistível.`;

      const response = await callAI(prompt, { model: 'gemini-1.5-flash' });
      setEndScreenResult(response.trim());
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar Tela Final: ' + err.message);
    } finally {
      setIsGeneratingEndScreen(false);
    }
  };

  const handleGenerateCards = async () => {
    if (!videoTitle.trim()) { alert('Insira o título do vídeo primeiro.'); return; }
    setIsGeneratingCards(true);
    setCardsResult(null);
    try {
      const descContext = seoResult?.description ? `\nDESCRIÇÃO SEO: "${seoResult.description.substring(0, 500)}"` : '';
      const scriptContext = videoScript ? `\nROTEIRO: "${videoScript.substring(0, 1000)}"` : '';
      const prompt = `Você é um especialista em YouTube Cards (Cartões Interativos).

REGRA DE IDIOMA: Detecte o idioma do título abaixo. TODO o conteúdo gerado DEVE estar nesse mesmo idioma.

TÍTULO DO VÍDEO: "${videoTitle}"${descContext}${scriptContext}

Gere EXATAMENTE ${cardsCount} cards estratégicos para inserir durante o vídeo.

Para cada card, use EXATAMENTE este formato:
**CARD [N]**
- Tipo: [Vídeo | Playlist | Enquete | Canal | Link]
- Timestamp: [ex: 2:30 — momento sugerido baseado no conteúdo]
- Título do Card: [Texto curto e chamativo, máximo 50 caracteres]
- Mensagem Teaser: [Texto persuasivo que aparece primeiro para o espectador clicar, máximo 80 caracteres]
- Motivo: [Por que esse momento é estratégico — qual gancho do roteiro justifica o card]

Dicas: Os cards devem aparecer em momentos de alta atenção (após um gancho, revelação ou mudança de assunto). Enquetes aumentam engajamento. Vídeos sugeridos aumentam Watch Time. Distribua os timestamps uniformemente ao longo do vídeo.`;

      const response = await callAI(prompt, { model: 'gemini-1.5-flash' });
      setCardsResult(response.trim());
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar Cards: ' + err.message);
    } finally {
      setIsGeneratingCards(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto font-sans overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-8 pb-12 pt-4 px-2 md:px-4 [&>*]:shrink-0">
        <header className="mb-8">
          <h2 className="text-3xl md:text-5xl font-black text-white flex items-center gap-4 tracking-tighter uppercase italic">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 p-[2px] shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <div className="w-full h-full bg-dark rounded-2xl flex items-center justify-center">
                <Youtube className="w-8 h-8 text-white fill-current" />
              </div>
            </div>
            SEO & Publicação
          </h2>
          <p className="text-gray-400 mt-3 font-bold text-sm uppercase tracking-[0.2em] border-l-4 border-green-500 pl-4 ml-2 italic">
            Pacote Completo de Metadados para Upload
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 flex-1">
        {/* Lado Esquerdo: Inputs */}
        <div className="w-full lg:w-[450px] flex flex-col gap-6 shrink-0 pb-10">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative group overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-transparent opacity-50" />
             <h3 className="text-sm font-black text-gray-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
               <Type className="w-4 h-4 text-green-400" /> Referência do Vídeo
             </h3>
             
             <div className="space-y-6">
                {scripts && scripts.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Importar de Roteiro Salvo</label>
                    <div className="relative">
                      <select 
                        onChange={handleScriptSelect}
                        defaultValue=""
                        className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Selecione um roteiro pronto (Opcional)</option>
                        {scripts.map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Título Final</label>
                  <input 
                    type="text" 
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Ex: Como Monetizar o YouTube em 2026..."
                    className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Roteiro / Contexto (Opcional)</label>
                  <textarea 
                    value={videoScript}
                    onChange={(e) => setVideoScript(e.target.value)}
                    placeholder="Cole aqui o seu roteiro completo ou um resumo do que é falado no vídeo para um SEO extremamente preciso..."
                    className="w-full h-48 bg-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50 transition-colors resize-none custom-scrollbar"
                  />
                </div>

                <div 
                  className="flex items-center gap-3 bg-dark border border-white/10 px-4 py-3 rounded-xl cursor-pointer hover:border-green-500/50 transition-colors group" 
                  onClick={() => setIsFiction(!isFiction)}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${isFiction ? 'bg-green-500 border-green-500' : 'border-gray-500 bg-dark group-hover:border-green-500/50'}`}>
                    {isFiction && <Check className="w-3 h-3 text-dark" />}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-white block">Conteúdo Fictício</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">Adiciona um aviso legal (disclaimer) na descrição.</span>
                  </div>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !videoTitle.trim()}
                  className="w-full py-4 bg-green-500 hover:bg-green-400 text-dark font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {isGenerating ? 'GERANDO PACOTE SEO...' : 'GERAR PACOTE DE UPLOAD'}
                </button>
             </div>
          </div>
        </div>

        {/* Lado Direito: Resultados */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col min-h-[500px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          {isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center h-full">
              <LoadingSpinner message="Otimizando palavras-chave e analisando algoritmo..." color="text-green-500" />
            </div>
          ) : !seoResult ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center h-full">
               <Search className="w-16 h-16 text-gray-600 mb-4" />
               <p className="font-black uppercase tracking-widest text-lg">Pronto para Otimizar</p>
               <p className="text-sm font-medium mt-2 max-w-sm">Insira o título e o roteiro do seu vídeo para gerar a descrição perfeita, tags e o primeiro comentário fixado.</p>
            </div>
          ) : (
            <div className="flex-1 pr-4 space-y-8">
               
               {/* Descrição */}
               <div className="relative group">
                 <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                   <h3 className="text-xs font-black text-green-400 flex items-center gap-2 uppercase tracking-widest">
                     <Layers className="w-4 h-4" /> Descrição do Vídeo
                   </h3>
                   <button 
                     onClick={() => handleCopy(seoResult.description, 'desc')}
                     className="text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                   >
                     {copiedField === 'desc' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                     {copiedField === 'desc' ? 'Copiado!' : 'Copiar'}
                   </button>
                 </div>
                 <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-gray-300 font-medium text-sm leading-relaxed whitespace-pre-wrap">
                   {seoResult.description}
                 </div>
               </div>

               {/* Hashtags */}
               <div className="relative group">
                 <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                   <h3 className="text-xs font-black text-green-400 flex items-center gap-2 uppercase tracking-widest">
                     <Type className="w-4 h-4" /> Hashtags
                   </h3>
                   <button 
                     onClick={() => handleCopy(seoResult.hashtags, 'hash')}
                     className="text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                   >
                     {copiedField === 'hash' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                     {copiedField === 'hash' ? 'Copiado!' : 'Copiar'}
                   </button>
                 </div>
                 <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-gray-300 font-bold text-base">
                   {seoResult.hashtags}
                 </div>
               </div>

               {/* Tags */}
               <div className="relative group">
                 <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                   <h3 className="text-xs font-black text-green-400 flex items-center gap-2 uppercase tracking-widest">
                     <Search className="w-4 h-4" /> Tags para Upload
                   </h3>
                   <button 
                     onClick={() => handleCopy(seoResult.tags, 'tags')}
                     className="text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                   >
                     {copiedField === 'tags' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                     {copiedField === 'tags' ? 'Copiado!' : 'Copiar'}
                   </button>
                 </div>
                 <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-gray-400 font-mono text-xs leading-relaxed">
                   {seoResult.tags}
                 </div>
               </div>

               {/* Comentário Fixado */}
               <div className="relative group">
                 <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                   <h3 className="text-xs font-black text-green-400 flex items-center gap-2 uppercase tracking-widest">
                     <Sparkles className="w-4 h-4" /> Comentário Fixado
                   </h3>
                   <button 
                     onClick={() => handleCopy(seoResult.comment, 'comment')}
                     className="text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                   >
                     {copiedField === 'comment' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                     {copiedField === 'comment' ? 'Copiado!' : 'Copiar'}
                   </button>
                 </div>
                 <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-gray-300 font-medium text-sm border-l-2 border-l-green-500">
                   {seoResult.comment}
                 </div>
               </div>

               {/* Títulos Alternativos A/B */}
               <div className="relative group">
                 <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                   <h3 className="text-xs font-black text-green-400 flex items-center gap-2 uppercase tracking-widest">
                     <Type className="w-4 h-4" /> Títulos p/ Teste A/B (Test & Compare)
                   </h3>
                   <button 
                     onClick={handleCopyAllTitles}
                     className="text-[10px] font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10"
                   >
                     {copiedField === 'all-titles' ? (
                       <>
                         <Check className="w-3.5 h-3.5 text-green-400" />
                         <span>Copiado!</span>
                       </>
                     ) : (
                       <>
                         <Copy className="w-3.5 h-3.5" />
                         <span>Copiar Todos</span>
                       </>
                     )}
                   </button>
                 </div>
                 <div className="flex flex-col gap-3">
                   {/* Título Original */}
                   {videoTitle && (
                     <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4 group/title hover:border-green-500/30 transition-colors">
                       <div className="flex items-center gap-3 flex-1 min-w-0">
                         <span className="text-[9px] font-bold uppercase tracking-wider bg-white/10 text-gray-300 border border-white/10 px-2 py-0.5 rounded shrink-0">
                           Original
                         </span>
                         <span className="text-white font-bold text-sm leading-snug flex-1">{videoTitle}</span>
                       </div>
                       <button 
                         onClick={() => handleCopy(videoTitle, 'title-original')}
                         className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                         title="Copiar Título Original"
                       >
                         {copiedField === 'title-original' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                       </button>
                     </div>
                   )}

                   {/* Títulos Gerados A/B */}
                   {Array.isArray(seoResult.titles) ? seoResult.titles.slice(0, 2).map((title, idx) => (
                     <div key={idx} className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4 group/title hover:border-green-500/30 transition-colors">
                       <div className="flex items-center gap-3 flex-1 min-w-0">
                         <span className="text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded shrink-0">
                           Teste A/B {idx + 1}
                         </span>
                         <span className="text-white font-bold text-sm leading-snug flex-1">{title}</span>
                       </div>
                       <button 
                         onClick={() => handleCopy(title, `title-${idx}`)}
                         className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                         title={`Copiar Teste A/B ${idx + 1}`}
                       >
                         {copiedField === `title-${idx}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                       </button>
                     </div>
                   )) : seoResult.titles && (
                     <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-white font-bold text-sm leading-loose whitespace-pre-wrap">
                       {seoResult.titles}
                     </div>
                   )}
                 </div>
               </div>

               {/* ── Tela Final (End Screen) ── */}
               <div className="relative group">
                 <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                   <h3 className="text-xs font-black text-green-400 flex items-center gap-2 uppercase tracking-widest">
                     <MonitorPlay className="w-4 h-4" /> Tela Final (End Screen)
                   </h3>
                 </div>
                 <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-4">
                   <div className="flex items-center gap-4">
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Elementos:</span>
                     <div className="flex items-center gap-2">
                       <button onClick={() => setEndScreenCount(Math.max(1, endScreenCount - 1))} className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-green-500/50 transition-colors"><Minus className="w-3 h-3" /></button>
                       <span className="text-white font-black text-lg w-8 text-center">{endScreenCount}</span>
                       <button onClick={() => setEndScreenCount(Math.min(4, endScreenCount + 1))} className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-green-500/50 transition-colors"><Plus className="w-3 h-3" /></button>
                     </div>
                     <button
                       onClick={handleGenerateEndScreen}
                       disabled={isGeneratingEndScreen}
                       className="ml-auto px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-green-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                     >
                       {isGeneratingEndScreen ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                       {isGeneratingEndScreen ? 'Gerando...' : 'Gerar'}
                     </button>
                   </div>
                   {isGeneratingEndScreen && (
                     <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 text-green-500 animate-spin" /></div>
                   )}
                   {endScreenResult && (
                     <div className="relative">
                       <button
                         onClick={() => handleCopy(endScreenResult, 'endscreen')}
                         className="absolute top-2 right-2 text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg z-10"
                       >
                         {copiedField === 'endscreen' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                         {copiedField === 'endscreen' ? 'Copiado!' : 'Copiar'}
                       </button>
                       <div className="bg-dark/50 border border-white/5 rounded-xl p-4 text-gray-300 font-medium text-sm leading-relaxed whitespace-pre-wrap">
                         {endScreenResult}
                       </div>
                     </div>
                   )}
                 </div>
               </div>

               {/* ── Cards (Cartões) ── */}
               <div className="relative group">
                 <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                   <h3 className="text-xs font-black text-green-400 flex items-center gap-2 uppercase tracking-widest">
                     <CreditCard className="w-4 h-4" /> Cards (Cartões Interativos)
                   </h3>
                 </div>
                 <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-4">
                   <div className="flex items-center gap-4">
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quantidade:</span>
                     <div className="flex items-center gap-2">
                       <button onClick={() => setCardsCount(Math.max(1, cardsCount - 1))} className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-green-500/50 transition-colors"><Minus className="w-3 h-3" /></button>
                       <span className="text-white font-black text-lg w-8 text-center">{cardsCount}</span>
                       <button onClick={() => setCardsCount(Math.min(5, cardsCount + 1))} className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-green-500/50 transition-colors"><Plus className="w-3 h-3" /></button>
                     </div>
                     <button
                       onClick={handleGenerateCards}
                       disabled={isGeneratingCards}
                       className="ml-auto px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-green-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                     >
                       {isGeneratingCards ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                       {isGeneratingCards ? 'Gerando...' : 'Gerar'}
                     </button>
                   </div>
                   {isGeneratingCards && (
                     <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 text-green-500 animate-spin" /></div>
                   )}
                   {cardsResult && (
                     <div className="relative">
                       <button
                         onClick={() => handleCopy(cardsResult, 'cards')}
                         className="absolute top-2 right-2 text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg z-10"
                       >
                         {copiedField === 'cards' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                         {copiedField === 'cards' ? 'Copiado!' : 'Copiar'}
                       </button>
                       <div className="bg-dark/50 border border-white/5 rounded-xl p-4 text-gray-300 font-medium text-sm leading-relaxed whitespace-pre-wrap">
                         {cardsResult}
                       </div>
                     </div>
                   )}
                 </div>
               </div>

            </div>
          )}
        </div>
      </div>
      {/* POOLS DE PUBLICAÇÃO */}
      <div className="pt-12 border-t border-white/10 space-y-8 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <Layers className="w-6 h-6 text-green-500" />
          <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic">Pools de Publicação</h3>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-2 border-l border-white/10 pl-3">Últimos {seoPools?.length || 0}/6 gerados</span>
        </div>

        {!seoPools || seoPools.length === 0 ? (
          <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center opacity-50">
            <span className="text-gray-500 text-sm uppercase tracking-widest font-bold">Nenhum pool salvo ainda. Gere seu primeiro pacote SEO acima.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {seoPools.map(pool => (
              <div key={pool.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col h-[200px] hover:border-green-500/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded">SEO Salvo</span>
                  <span className="text-[10px] font-mono text-gray-500">{pool.date}</span>
                </div>
                <h4 className="text-white font-bold text-lg leading-tight line-clamp-2 mb-auto group-hover:text-green-400 transition-colors">{pool.title}</h4>
                
                <div className="flex items-center gap-3 mt-4">
                  <button 
                    onClick={() => {
                      setVideoTitle(pool.title);
                      setVideoScript(pool.script);
                      setSeoResult(pool.seoResult);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-white uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all"
                  >
                    Abrir
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.setItem('guru_cover_trigger_pool_id', pool.id);
                      if (setActiveTab) setActiveTab('video-cover');
                    }}
                    className="flex-1 py-2 rounded-xl bg-green-500 text-dark text-xs font-black uppercase tracking-widest hover:bg-green-400 active:scale-95 transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                  >
                    Gerar Capas
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
