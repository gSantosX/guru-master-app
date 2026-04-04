import os

file_path = r"c:\Users\allam\.gemini\antigravity\scratch\guru-master-app\src\tabs\ImagePromptsTab.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Fix the broken ternary at the button content
# Around line 449-456 in original view
new_lines = []
skip = False
for i, line in enumerate(lines):
    if "449: <LoadingSpinner" in str(i+1) or ("LoadingSpinner" in line and "generationProgress.step" in line):
        # This is our broken block. We want to replace it with a proper ternary.
        new_lines.append("                {isGenerating ? (\n")
        new_lines.append("                  <LoadingSpinner \n")
        new_lines.append("                    message={generationProgress.step || (generationProgress.total > 0 ? `Bloco ${generationProgress.current} de ${generationProgress.total}...` : 'Gerando Prompts...')}\n")
        new_lines.append("                    size='sm' \n")
        new_lines.append("                  />\n")
        new_lines.append("                ) : (\n")
        new_lines.append("                  <>\n")
        new_lines.append("                    <Wand2 className='w-5 h-5' /> Gerar {subtitleCount > 0 ? subtitleCount : ''} Prompts\n")
        new_lines.append("                  </>\n")
        new_lines.append("                )}\n")
        skip = True
        continue
    
    if skip:
        if "</button>" in line:
            new_lines.append(line)
            skip = False
        continue
    
    new_lines.append(line)

content = "".join(new_lines)

# 2. Add the history section before the last </div>
# The component ends with a </div> for the main container.
if "Prompt Pools History Section" not in content:
    history_section = r"""
      {/* Prompt Pools History Section */}
      <div className="mt-12 space-y-8 pb-20">
         <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-neon-pink/10 flex items-center justify-center border border-neon-pink/20">
                  <RefreshCw className="w-5 h-5 text-neon-pink" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Pools de Prompts Recentes</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Sua qualidade e formatos salvos automaticamente</p>
               </div>
            </div>
            {promptPools.length > 0 && (
               <button 
                  onClick={() => {
                     if(confirm("Limpar todo o histórico de image prompts?")) {
                        localStorage.setItem('guru_image_prompt_pools', '[]');
                        setPromptPools([]);
                     }
                  }}
                  className="text-[10px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2"
               >
                  <Trash2 className="w-3 h-3" /> Limpar Histórico
               </button>
            )}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Array.isArray(promptPools) ? [...promptPools, ...Array(Math.max(0, 6 - promptPools.length)).fill(null)] : Array(6).fill(null)).map((pool, idx) => (
               pool ? (
                  <div
                     key={pool.id}
                     className="glass-card group relative overflow-hidden border border-white/5 hover:border-neon-pink/40 transition-all p-6 space-y-5 bg-dark-lighter/40"
                  >
                     <div className="flex justify-between items-start">
                        <div className="space-y-1 min-w-0">
                           <h4 className="text-sm font-black text-white group-hover:text-neon-pink transition-colors truncate uppercase pr-4">{pool.title}</h4>
                           <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{pool.date}</p>
                        </div>
                        <button 
                           onClick={() => {
                              const next = stackRemove('guru_image_prompt_pools', pool.id);
                              setPromptPools(next);
                           }}
                           className="p-1.5 text-gray-700 hover:text-red-500 transition-colors shrink-0"
                        >
                           <Trash2 className="w-3.5 h-3.5" />
                        </button>
                     </div>

                     <div className="p-3 bg-dark/60 rounded-xl border border-white/5 space-y-2">
                        <div className="flex items-center gap-2">
                           <Sparkles className="w-3 h-3 text-neon-pink" />
                           <span className="text-[9px] font-black text-neon-pink uppercase tracking-widest">CONTEXTO VISUAL</span>
                        </div>
                        <p className="text-[10px] text-gray-400 italic line-clamp-2 leading-relaxed">
                           {pool.context}
                        </p>
                     </div>

                     <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-pink/10 border border-neon-pink/20 rounded-lg">
                           <ImageIcon className="w-3 h-3 text-neon-pink" />
                           <span className="text-[10px] font-black text-neon-pink">{pool.count} Prompts</span>
                        </div>
                        
                        <div className="flex gap-2">
                           <button 
                              onClick={() => {
                                 navigator.clipboard.writeText(pool.content);
                                 alert("Lote de prompts copiado!");
                              }}
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all"
                              title="Copiar Lote"
                           >
                              <Copy className="w-3.5 h-3.5 text-gray-400" />
                           </button>
                           <button 
                              onClick={() => {
                                 setPrompts(pool.content);
                                 window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-4 py-2 bg-white text-dark rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-neon-pink hover:text-white transition-all shadow-lg"
                           >
                              Selecionar
                           </button>
                        </div>
                     </div>
                  </div>
               ) : (
                  <div key={`empty-${idx}`} className="h-[220px] rounded-[32px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-gray-800 opacity-20">
                     <ImageIcon className="w-8 h-8 mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest">Slot Disponível</span>
                  </div>
               )
            ))}
         </div>
      </div>
"""
    # Insert before the last </div>
    last_div_index = content.rfind("</div>")
    if last_div_index != -1:
        content = content[:last_div_index] + history_section + content[last_div_index:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Success: Repaired ternary and added history section.")
