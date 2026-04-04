import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Terminal, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink, 
  Download, 
  Loader2,
  FileVideo
} from 'lucide-react';
import { resolveApiUrl } from '../utils/apiUtils';

/**
 * ActiveRenderMonitor — Elite Video Generation Feedback
 * Shows real-time progress, logs, and final actions for a specific Job ID.
 */
export const ActiveRenderMonitor = ({ jobId, onFinished }) => {
  const [job, setJob] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(resolveApiUrl(`/api/status/${jobId}`));
        if (res.ok) {
          const data = await res.json();
          setJob(data);
          
          if (data.progress >= 100) {
            clearInterval(statusInterval);
            clearInterval(logInterval);
            if (onFinished) onFinished(data);
          }
        } else {
          setError("O servidor perdeu o sinal deste processo.");
        }
      } catch (err) {
        console.error("Status Poll Error:", err);
      }
    };

    const pollLogs = async () => {
      try {
        const res = await fetch(resolveApiUrl(`/api/render/log/${jobId}`));
        if (res.ok) {
          const data = await res.json();
          setLogs(data.log || []);
        }
      } catch {}
    };

    const statusInterval = setInterval(pollStatus, 1500);
    const logInterval = setInterval(pollLogs, 3000);

    pollStatus();
    pollLogs();

    return () => {
      clearInterval(statusInterval);
      clearInterval(logInterval);
    };
  }, [jobId]);

  const handleDownload = () => {
    if (!jobId) return;
    window.open(resolveApiUrl(`/api/download/${jobId}`), '_blank');
  };

  if (error) {
    return (
      <div className="glass-card p-8 border-neon-pink/30 flex flex-col items-center text-center">
        <AlertTriangle className="w-12 h-12 text-neon-pink mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Ops! Algo saiu do trilho</h3>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="glass-card p-12 flex flex-col items-center justify-center space-y-6">
        <Loader2 className="w-10 h-10 text-neon-purple animate-spin" />
        <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Iniciando Motor de Renderização...</p>
      </div>
    );
  }

  const isComplete = job.progress >= 100;

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full max-w-xl mx-auto bg-dark/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm shadow-2xl">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/30 shadow-[0_0_15px_rgba(157,78,221,0.2)]`}>
            <FileVideo className="w-5 h-5 text-neon-purple" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-white italic uppercase tracking-tight truncate" title={job.name}>{job.name}</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest opacity-70">ID: {jobId.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-baseline gap-1 justify-end">
          <span className="text-3xl font-black text-glow-purple text-white leading-none">{job.progress}</span>
          <span className="text-sm font-bold text-neon-purple">%</span>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="relative h-4 bg-dark/80 rounded-full border border-white/5 overflow-hidden shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${job.progress}%` }}
          transition={{ type: "spring", stiffness: 50 }}
          className="h-full bg-gradient-to-r from-purple-600 via-neon-purple to-cyan-400 relative"
        >
          {/* Neon Glow */}
          <div className="absolute inset-x-0 bottom-0 top-0 bg-white/20 animate-pulse" />
          <div className="absolute top-0 right-0 h-full w-12 bg-white/40 blur-md translate-x-1/2" />
        </motion.div>
      </div>

      {/* Status & Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4 bg-white/[0.02] border-white/5">
          <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Zap className="w-3 h-3 text-neon-purple" /> Status do Motor
          </h4>
          <p className="text-sm font-bold text-white flex items-center gap-2">
            {!isComplete && <Loader2 className="w-3 h-3 animate-spin text-neon-purple" />}
            {job.status}
          </p>
        </div>

        <div className="glass-card p-4 bg-white/[0.02] border-white/5 flex flex-col">
          <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
             <Terminal className="w-3 h-3 text-neon-cyan" /> Telemetria FFmpeg
          </h4>
          <div className="flex-1 font-mono text-[10px] text-gray-400 overflow-hidden line-clamp-1 italic">
             {job.last_log || "Sincronizando logs..."}
          </div>
        </div>
      </div>

      {/* Real-time Log Feed */}
      <div className="glass-card bg-dark/80 border-white/5 p-4 font-mono text-[11px] leading-relaxed relative overflow-hidden group">
        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
           <span className="text-gray-600 font-black uppercase tracking-widest text-[9px]">Console Log Output</span>
           <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
           </div>
        </div>
        <div className="space-y-1 h-32 overflow-y-auto custom-scrollbar text-gray-500 selection:bg-neon-purple selection:text-white">
          {logs.map((line, i) => (
            <div key={i} className={i === logs.length - 1 ? "text-neon-cyan/80" : ""}>
               <span className="text-gray-800 mr-2">[{i}]</span> {line}
            </div>
          ))}
          {logs.length === 0 && <p className="italic opacity-30">Aguardando dados estruturais...</p>}
        </div>
        {/* CRT Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%]" />
      </div>

      {/* Completion Actions */}
      <AnimatePresence>
        {isComplete && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row gap-3 pt-2"
          >
            <button 
              onClick={handleDownload}
              className="flex-1 py-4 bg-neon-purple/20 border border-neon-purple/40 text-neon-purple hover:bg-neon-purple hover:text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group"
            >
              <Download className="w-4 h-4 group-hover:animate-bounce" /> Baixar Master (.MP4)
            </button>
            <button 
              onClick={() => window.electronAPI?.openDirectory(job.result_file)}
              className="flex-1 py-4 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
            >
              <ExternalLink className="w-4 h-4" /> Localizar Arquivo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isComplete && (
        <div className="flex justify-center pt-4">
           <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Renderização Concluída com Sucesso</span>
           </div>
        </div>
      )}
    </div>
  );
};
