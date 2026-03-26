import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Trash2, AlertTriangle, ChevronRight, ArrowLeft, Download, FileJson, File as FilePdf, Copy, Check } from 'lucide-react';
import jsPDF from 'jspdf';

export const ReadyScriptsTab = ({ setActiveTab, isActive = true }) => {
  const [scripts, setScripts] = useState([]);
  const [activeScript, setActiveScript] = useState(null);
  const [copyingId, setCopyingId] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('guru_scripts') || '[]');
      setScripts(Array.isArray(saved) ? saved : []);
    } catch (e) {
      console.error("Error loading scripts:", e);
      setScripts([]);
    }
  }, [isActive]);

  const saveScripts = (newScripts) => {
    setScripts(newScripts);
    localStorage.setItem('guru_scripts', JSON.stringify(newScripts));
  };

  const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    saveScripts(scripts.filter((s) => s.id !== id));
    if (activeScript && activeScript.id === id) setActiveScript(null);
  };

  const handleDeleteAll = () => {
    if (confirm("Tem certeza de que deseja excluir TODOS os roteiros?")) {
      saveScripts([]);
      setActiveScript(null);
    }
  };

  const handleDownloadTxt = (scriptToDownload) => {
    const target = scriptToDownload || activeScript;
    if (!target) return;
    const blob = new Blob([target.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${target.title.replace(/ /g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSrt = (scriptToDownload) => {
    const target = scriptToDownload || activeScript;
    if (!target) return;
    const lines = target.content.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('['));
    let srtData = "";
    lines.forEach((line, idx) => {
      srtData += `${idx + 1}\n`;
      srtData += `00:00:${String(idx*2).padStart(2,'0')},000 --> 00:00:${String((idx*2)+2).padStart(2,'0')},000\n`;
      srtData += `${line}\n\n`;
    });
    const blob = new Blob([srtData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${target.title.replace(/ /g, '_')}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!activeScript) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    const splitText = doc.splitTextToSize(activeScript.content, 180);
    doc.text(splitText, 15, 20);
    doc.save(`${activeScript.title.replace(/ /g, '_')}.pdf`);
  };

  const handleCopy = async (scriptToCopy) => {
    const target = scriptToCopy || activeScript;
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.content);
      setCopyingId(target.id);
      setTimeout(() => setCopyingId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // VIEWER MODE
  if (activeScript) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-full md:h-full flex flex-col pt-4 overflow-y-auto md:overflow-hidden custom-scrollbar">
        <button 
          onClick={() => setActiveScript(null)}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-max"
        >
          <ArrowLeft className="w-5 h-5" /> Voltar para Meus Projetos
        </button>

        <div className="glass-card flex flex-col h-full relative overflow-hidden flex-1 shadow-2xl border border-neon-cyan/20">
          <div className="p-4 md:p-6 border-b border-white/10 bg-dark/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 z-10">
            <div>
              <h2 className="text-xl md:text-3xl font-black text-white mb-2">{activeScript.title}</h2>
              <div className="flex flex-wrap gap-2 md:gap-3 text-xs font-medium">
                <span className="bg-neon-cyan/10 text-neon-cyan px-2.5 py-1.5 rounded-lg border border-neon-cyan/20 flex items-center">{activeScript.niche}</span>
                <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg flex flex-col justify-center leading-tight">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">{activeScript.date ? activeScript.date.split(',')[0] : ''}</span>
                  <span className="text-white font-bold text-xs">{activeScript.date && activeScript.date.includes(',') ? activeScript.date.split(',')[1].trim() : ''}</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg flex flex-col justify-center items-center leading-tight min-w-[60px]">
                  <span className="text-white font-black text-sm">{activeScript.length}</span>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider">CHARS</span>
                </div>
              </div>
            </div>
            <button 
              onClick={(e) => handleDelete(activeScript.id, e)}
              className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors w-full md:w-auto"
              title="Excluir Roteiro"
            >
              <Trash2 className="w-5 h-5 mx-auto md:mx-0" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 relative z-10 bg-dark/30 custom-scrollbar font-mono text-base text-gray-300 whitespace-pre-wrap leading-relaxed">
            {activeScript.content}
          </div>

          <div className="p-4 bg-dark/60 border-t border-white/10 z-10 flex flex-col sm:flex-row gap-3 md:gap-4 backdrop-blur-md">
            <button onClick={handleDownloadTxt} className="flex-1 py-3 md:py-4 rounded-xl bg-dark-lighter border border-white/10 hover:border-white/30 text-white font-bold flex items-center justify-center gap-2 transition-all hover:bg-white/5 hover:scale-[1.01] shadow-lg text-sm md:text-base">
              <Download className="w-5 h-5 text-neon-cyan" /> Baixar TXT
            </button>
            <button onClick={handleDownloadSrt} className="flex-1 py-3 md:py-4 rounded-xl bg-dark-lighter border border-white/10 hover:border-white/30 text-white font-bold flex items-center justify-center gap-2 transition-all hover:bg-white/5 hover:scale-[1.01] shadow-lg text-sm md:text-base">
              <FileJson className="w-5 h-5 text-neon-pink" /> Baixar SRT (Gerado)
            </button>
            <button onClick={handleExportPdf} className="flex-1 py-3 md:py-4 rounded-xl bg-dark-lighter border border-white/10 hover:border-white/30 text-white font-bold flex items-center justify-center gap-2 transition-all hover:bg-white/5 hover:scale-[1.01] shadow-lg text-sm md:text-base">
              <FilePdf className="w-5 h-5 text-neon-purple" /> Exportar PDF
            </button>
            <button 
              onClick={handleCopy}
              className={`flex-1 py-3 md:py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all group overflow-hidden relative shadow-lg text-sm md:text-base ${
                copyingId === activeScript.id 
                ? 'bg-green-500/20 border border-green-500 text-green-400' 
                : 'bg-white text-dark hover:bg-gray-100'
              }`}
            >
              {copyingId === activeScript.id ? (
                <>
                  <Check className="w-5 h-5 animate-bounce" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 group-hover:scale-110 transition-transform" /> Copiar Texto
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // GRID MODE
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full md:h-full flex flex-col overflow-y-auto custom-scrollbar">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-glow-cyan text-white flex items-center gap-2 md:gap-3 tracking-tight">
            <FileText className="text-neon-cyan w-8 h-8 md:w-10 md:h-10 shrink-0" />
            Roteiros Prontos
          </h2>
          <p className="text-neon-cyan/80 mt-2 font-medium text-sm md:text-lg">Seus últimos 6 roteiros gerados pela IA</p>
        </div>
        
        {scripts.length > 0 && (
          <button 
            onClick={handleDeleteAll}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500 transition-all font-bold shadow-lg"
          >
            <Trash2 className="w-5 h-5" /> Limpar Histórico
          </button>
        )}
      </header>

      {scripts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 glass-card p-12 border border-white/5 shadow-inner">
          <AlertTriangle className="w-20 h-20 text-gray-600 mb-6" />
          <h3 className="text-2xl font-bold text-white mb-2">Histórico Vazio</h3>
          <p className="text-lg text-gray-500 text-center max-w-md">Crie seu primeiro roteiro para vê-lo aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
          <AnimatePresence>
            {(Array.isArray(scripts) ? [...scripts, ...Array(Math.max(0, 6 - scripts.length)).fill(null)] : Array(6).fill(null)).map((script, idx) => (
              script ? (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={script.id}
                  className="glass-card flex flex-col group relative overflow-hidden border border-white/5 hover:border-neon-cyan/50 shadow-2xl transition-all h-[340px] bg-dark-lighter/40 backdrop-blur-xl"
                >
                  {/* Premium Header with Title & Char Count ABOVE */}
                  <div className="p-5 border-b border-white/10 bg-gradient-to-br from-white/10 to-transparent">
                    <div className="flex justify-between items-start gap-3 mb-2">
                       <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-black text-white group-hover:text-neon-cyan transition-colors truncate uppercase tracking-tight">
                            {script.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-neon-cyan/60 uppercase tracking-widest">{script.niche}</span>
                          </div>
                       </div>
                       <button 
                        onClick={(e) => handleDelete(script.id, e)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-col justify-center leading-tight bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                        <span className="text-[8px] text-gray-500 uppercase tracking-wider mb-0.5">{script.date ? script.date.split(',')[0] : ''}</span>
                        <span className="text-white font-bold text-[10px]">{script.date && script.date.includes(',') ? script.date.split(',')[1].trim() : ''}</span>
                      </div>
                      
                      <div className="flex flex-col justify-center items-end leading-tight bg-neon-cyan/5 border border-neon-cyan/20 px-3 py-1 rounded-lg">
                         <div className="flex items-center gap-1">
                            <span className="text-neon-cyan font-black text-xs">{script.length || script.content?.length || 0}</span>
                            <span className="text-[7px] text-neon-cyan/60 font-black uppercase tracking-tighter">CHARS</span>
                         </div>
                         <span className="text-[7px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">Tamanho Total</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div 
                    onClick={() => setActiveScript(script)}
                    className="flex-1 p-5 text-[12px] font-mono text-gray-400 overflow-hidden relative cursor-pointer group-hover:bg-white/5 transition-all"
                  >
                    <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-dark-lighter to-transparent z-10" />
                    <p className="whitespace-pre-wrap leading-relaxed italic line-clamp-4 text-gray-500 group-hover:text-gray-300 transition-colors">
                      {script.content}
                    </p>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-dark/60 backdrop-blur-[2px]">
                      <div className="bg-neon-cyan text-dark px-4 py-2 rounded-xl font-black text-xs shadow-[0_0_20px_rgba(0,255,255,0.4)] flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                        <ChevronRight className="w-4 h-4" /> VISUALIZAR
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-dark/80 border-t border-white/10 flex gap-2">
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(script);
                      }}
                      className={`flex-1 py-2.5 rounded-xl border font-black text-[10px] transition-all flex flex-col items-center gap-1 shadow-lg ${
                        copyingId === script.id
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-white/5 border-white/10 hover:border-neon-cyan hover:text-neon-cyan text-gray-400 hover:scale-[1.02]'
                      }`}
                    >
                      {copyingId === script.id ? (
                        <>
                          <Check className="w-4 h-4 animate-bounce" /> COPIADO
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> COPIAR
                        </>
                      )}
                    </button>
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadTxt(script);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-black transition-all flex flex-col items-center gap-1 hover:scale-[1.02] shadow-lg"
                    >
                      <Download className="w-4 h-4 text-neon-cyan" /> .TXT
                    </button>
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSrt(script);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-black transition-all flex flex-col items-center gap-1 hover:scale-[1.02] shadow-lg"
                    >
                      <FileJson className="w-4 h-4 text-neon-pink" /> .SRT
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div key={`empty-${idx}`} className="glass-card border border-dashed border-white/5 h-[340px] flex flex-col items-center justify-center text-gray-800 bg-white/2 opacity-30">
                   <div className="w-12 h-12 border-2 border-dashed border-gray-800 rounded-2xl flex items-center justify-center mb-3">
                     <FileText className="w-6 h-6 text-gray-800" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-700">Slot Disponível</span>
                </div>
              )
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
