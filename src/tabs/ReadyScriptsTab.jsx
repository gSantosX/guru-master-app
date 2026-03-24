import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Trash2, AlertTriangle, ChevronRight, ArrowLeft, Download, FileJson, File as FilePdf, Copy, Check } from 'lucide-react';
import jsPDF from 'jspdf';

export const ReadyScriptsTab = () => {
  const [scripts, setScripts] = useState([]);
  const [activeScript, setActiveScript] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('guru_scripts') || '[]');
    setScripts(saved);
    // Auto-select latest script if none is active
    if (saved.length > 0 && !activeScript) {
      setActiveScript(saved[0]);
    }
  }, [activeScript]);

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
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // VIEWER MODE
  if (activeScript) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-full md:h-full flex flex-col pt-4 overflow-y-auto md:overflow-hidden">
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
              <div className="flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm text-gray-400 font-medium">
                <span className="bg-neon-cyan/10 text-neon-cyan px-2 py-1 rounded">{activeScript.niche}</span>
                <span className="bg-white/5 px-2 py-1 rounded flex items-center">{activeScript.date}</span>
                <span className="bg-white/5 px-2 py-1 rounded flex items-center">{activeScript.length} chars</span>
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
              className={`flex-1 py-3 md:py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all group overflow-hidden relative shadow-lg text-sm md:text-base ${
                isCopied 
                ? 'bg-green-500/20 border border-green-500 text-green-400' 
                : 'bg-white text-dark hover:bg-gray-100'
              }`}
            >
              {isCopied ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          <AnimatePresence>
            {[...scripts, ...Array(Math.max(0, 6 - scripts.length)).fill(null)].map((script, idx) => (
              script ? (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={script.id}
                  className="glass-card flex flex-col group relative overflow-hidden border border-white/5 hover:border-neon-cyan/30 shadow-lg transition-all h-[320px]"
                >
                  {/* Header with Title & Date */}
                  <div className="p-4 border-b border-white/5 bg-white/5">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className="text-base font-black text-white group-hover:text-neon-cyan transition-colors line-clamp-2 leading-tight uppercase flex-1">
                        {script.title}
                      </h3>
                      <button 
                        onClick={(e) => handleDelete(script.id, e)}
                        className="p-1 text-gray-600 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-gray-400">
                      <span className="bg-dark px-2 py-0.5 rounded border border-white/5">{script.date}</span>
                      <span className="text-neon-pink font-bold">{script.length} chars</span>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div 
                    onClick={() => setActiveScript(script)}
                    className="flex-1 p-4 text-[11px] font-mono text-gray-500 overflow-hidden relative cursor-pointer group-hover:bg-white/5 transition-colors"
                  >
                    <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-dark to-transparent z-10" />
                    <p className="whitespace-pre-wrap leading-relaxed italic line-clamp-5">
                      {script.content}
                    </p>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-dark/40 backdrop-blur-[1px]">
                      <span className="bg-neon-cyan/20 text-neon-cyan px-3 py-1.5 rounded-lg border border-neon-cyan font-bold text-[10px]">VER ROTEIRO</span>
                    </div>
                  </div>

                  {/* Quick Actions Footer */}
                  <div className="p-2.5 bg-dark/60 border-t border-white/5 flex gap-2">
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(script);
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-neon-cyan hover:text-neon-cyan text-gray-400 text-[9px] font-bold transition-all flex flex-col items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> COPIAR
                    </button>
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadTxt(script);
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-neon-cyan hover:text-neon-cyan text-gray-400 text-[9px] font-bold transition-all flex flex-col items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> .TXT
                    </button>
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSrt(script);
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-neon-pink hover:text-neon-pink text-gray-400 text-[9px] font-bold transition-all flex flex-col items-center gap-1"
                    >
                      <FileJson className="w-3.5 h-3.5" /> .SRT
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div key={`empty-${idx}`} className="glass-card border border-dashed border-white/10 h-[320px] flex flex-col items-center justify-center text-gray-700">
                   <div className="w-10 h-10 border-2 border-dashed border-gray-800 rounded-full flex items-center justify-center mb-2">
                     <span className="text-xl font-bold">?</span>
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-widest">Espaço Vazio</span>
                </div>
              )
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
