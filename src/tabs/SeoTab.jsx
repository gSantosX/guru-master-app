import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, Copy, Check, Sparkles, Type, Loader2, Search, Zap, Layers, ChevronDown } from 'lucide-react';
import { callAI } from '../utils/aiUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useCloudStorage } from '../hooks/useCloudStorage';

export const SeoTab = () => {
  const [videoTitle, setVideoTitle] = useState('');
  const [videoScript, setVideoScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [seoResult, setSeoResult] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [scripts] = useCloudStorage('scripts', []);

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

TÍTULO DO VÍDEO: "${videoTitle}"
ROTEIRO/RESUMO: "${videoScript || 'Sem roteiro detalhado. Baseie-se apenas no título para inferir o contexto.'}"

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
Gere 3 títulos virais alternativos baseados no tema. Eles devem ser muito fortes em CTR (Click-Through Rate) e utilizar diferentes emoções (curiosidade, medo, choque, urgência). Formate como uma lista 1. 2. 3.`;

    try {
      const response = await callAI(prompt, { model: 'gemini-1.5-pro' });
      
      const sections = {
        description: '',
        hashtags: '',
        tags: '',
        comment: '',
        titles: ''
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
      if (titlesMatch) sections.titles = titlesMatch[1].trim();

      setSeoResult(sections);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar SEO: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto font-sans overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 flex flex-col gap-6 pb-12 pt-4">
        <header className="mb-4">
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

        <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        {/* Lado Esquerdo: Inputs */}
        <div className="w-full lg:w-[450px] flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pr-2 pb-10">
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
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-8">
               
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
                     onClick={() => handleCopy(seoResult.titles, 'titles')}
                     className="text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                   >
                     {copiedField === 'titles' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                     {copiedField === 'titles' ? 'Copiado!' : 'Copiar'}
                   </button>
                 </div>
                 <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-white font-bold text-sm leading-loose whitespace-pre-wrap">
                   {seoResult.titles}
                 </div>
               </div>

            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
