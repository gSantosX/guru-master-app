import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Trash2, AlertTriangle, ChevronRight, ArrowLeft, Download, FileJson, File as FilePdf } from 'lucide-react';
import jsPDF from 'jspdf';

export const ReadyScriptsTab = () => {
  const [scripts, setScripts] = useState([]);
  const [activeScript, setActiveScript] = useState(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('guru_scripts') || '[]');
    setScripts(saved);
  }, []);

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

  const handleDownloadTxt = () => {
    if (!activeScript) return;
    const blob = new Blob([activeScript.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeScript.title.replace(/ /g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSrt = () => {
    if (!activeScript) return;
    const lines = activeScript.content.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('['));
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
    a.download = `${activeScript.title.replace(/ /g, '_')}.srt`;
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
          </div>
        </div>
      </div>
    );
  }

  // GRID MODE
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full md:h-full flex flex-col overflow-y-auto md:overflow-hidden">
      <header className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-glow-cyan text-white flex items-center gap-2 md:gap-3 tracking-tight">
            <FileText className="text-neon-cyan w-8 h-8 md:w-10 md:h-10 shrink-0" />
            Meus Projetos
          </h2>
          <p className="text-neon-cyan/80 mt-2 font-medium text-sm md:text-lg">Gerencie e acesse todos os seus roteiros criados pela IA</p>
        </div>
        
        {scripts.length > 0 && (
          <button 
            onClick={handleDeleteAll}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500 transition-all font-bold shadow-lg"
          >
            <Trash2 className="w-5 h-5" /> Excluir Todos
          </button>
        )}
      </header>

      {scripts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 glass-card p-12 border border-white/5 shadow-inner">
          <AlertTriangle className="w-20 h-20 text-gray-600 mb-6" />
          <h3 className="text-2xl font-bold text-white mb-2">Nenhum Roteiro Encontrado</h3>
          <p className="text-lg text-gray-500 text-center max-w-md">Sua biblioteca de projetos está vazia. Vá para "Criar Roteiro" para começar sua jornada narrativa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr pb-10">
          <AnimatePresence>
            {scripts.map((script) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                key={script.id}
                onClick={() => setActiveScript(script)}
                className="glass-card flex flex-col group relative overflow-hidden h-72 hover:-translate-y-2 transition-transform cursor-pointer border border-white/5 hover:border-neon-cyan/30 shadow-lg hover:shadow-neon-cyan/10"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="pr-4">
                      <h3 className="text-xl font-black text-white group-hover:text-neon-cyan transition-colors line-clamp-2 leading-tight">{script.title}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs font-bold text-neon-purple bg-neon-purple/10 px-2 py-0.5 rounded">{script.niche}</span>
                        <span className="text-xs font-medium text-gray-500 px-1">{script.date}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(script.id, e)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors z-10 flex-shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 bg-dark/40 rounded-xl p-4 text-sm font-mono text-gray-400 overflow-hidden relative shadow-inner">
                    <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-dark to-transparent z-10" />
                    <p className="whitespace-pre-wrap leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                      {script.content?.substring(0, 200)}...
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-white/50 group-hover:text-white transition-colors">
                    <span className="text-xs font-medium">{script.length} chars</span>
                    <span className="flex items-center gap-1 text-sm font-bold text-neon-cyan">
                      Abrir no Editor <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
