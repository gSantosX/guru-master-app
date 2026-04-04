import os

file_path = r"c:\Users\allam\.gemini\antigravity\scratch\guru-master-app\src\tabs\WhiskTab.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The section we want to insert before the last closing tags of the control subtab
new_section = r"""
               {/* Prompt History Section */}
               <div className="mt-20 space-y-8 pb-20">
                  <div className="flex items-center justify-between px-2">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center border border-neon-purple/20">
                           <Layout className="w-5 h-5 text-neon-purple" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-white uppercase tracking-tight">Pools de Prompts Recentes</h3>
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Seus últimos 6 lotes de alta fidelidade</p>
                        </div>
                     </div>
                     {promptPools.length > 0 && (
                        <button 
                           onClick={() => {
                              if(confirm("Limpar todo o histórico de prompts?")) {
                                 localStorage.setItem('guru_prompt_pools', '[]');
                                 setPromptPools([]);
                              }
                           }}
                           className="text-[10px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                           <Trash2 className="w-3 h-3" /> Limpar Tudo
                        </button>
                     )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {(Array.isArray(promptPools) ? [...promptPools, ...Array(Math.max(0, 6 - promptPools.length)).fill(null)] : Array(6).fill(null)).map((pool, idx) => (
                        pool ? (
                           <motion.div
                              key={pool.id}
                              whileHover={{ y: -5 }}
                              className="glass-card group relative overflow-hidden border border-white/5 hover:border-neon-purple/40 transition-all p-6 space-y-5 bg-dark-lighter/40"
                           >
                              <div className="flex justify-between items-start">
                                 <div className="space-y-1 min-w-0">
                                    <h4 className="text-sm font-black text-white group-hover:text-neon-purple transition-colors truncate uppercase pr-4">{pool.title}</h4>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{pool.date}</p>
                                 </div>
                                 <button 
                                    onClick={() => {
                                       const next = stackRemove('guru_prompt_pools', pool.id);
                                       setPromptPools(next);
                                    }}
                                    className="p-1.5 text-gray-700 hover:text-red-500 transition-colors shrink-0"
                                 >
                                    <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                              </div>

                              <div className="p-3 bg-dark/60 rounded-xl border border-white/5 space-y-2">
                                 <div className="flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 text-neon-cyan" />
                                    <span className="text-[9px] font-black text-neon-cyan uppercase tracking-widest">DNA VISUAL IDENTIFICADO</span>
                                 </div>
                                 <p className="text-[10px] text-gray-400 italic line-clamp-2 leading-relaxed">
                                    {pool.context}
                                 </p>
                              </div>

                              <div className="flex items-center justify-between pt-2">
                                 <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-purple/10 border border-neon-purple/20 rounded-lg">
                                    <Zap className="w-3 h-3 text-neon-purple" />
                                    <span className="text-[10px] font-black text-neon-purple">{pool.count} Prompts</span>
                                 </div>
                                 
                                 <div className="flex gap-2">
                                    <button 
                                       onClick={() => {
                                          navigator.clipboard.writeText(pool.content);
                                          alert("Pool de prompts copiado!");
                                       }}
                                       className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all"
                                       title="Copiar Tudo"
                                    >
                                       <Download className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                    <button 
                                       onClick={() => {
                                          setPrompts(pool.content);
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                       }}
                                       className="px-4 py-2 bg-white text-dark rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-neon-purple hover:text-white transition-all shadow-lg"
                                    >
                                       Selecionar
                                    </button>
                                 </div>
                              </div>
                           </motion.div>
                        ) : (
                           <div key={`empty-${idx}`} className="h-[220px] rounded-[32px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-gray-800 opacity-20">
                              <ImageIcon className="w-8 h-8 mb-2" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Espaço Disponível</span>
                           </div>
                        )
                     ))}
                  </div>
               </div>
"""

# Find the end of the control subtab.
# It ends with:
#               )}
#             </motion.div>
#           )}
#
#           {activeSubTab === 'settings' && (

marker = "{activeSubTab === 'settings' && ("
if marker in content:
    parts = content.split(marker)
    # The first part contains the end of 'control' tab.
    # We need to find the last two closing braces/divs of the control part.
    control_part = parts[0]
    
    # Let's find the position of the last </motion.div> in the control_part
    last_motion_div_index = control_part.rfind("</motion.div>")
    
    if last_motion_div_index != -1:
        new_content = control_part[:last_motion_div_index] + new_section + control_part[last_motion_div_index:] + marker + parts[1]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Success: Inserted history section.")
    else:
        print("Error: Could not find closing motion.div for control tab.")
else:
    print("Error: Could not find settings tab marker.")
