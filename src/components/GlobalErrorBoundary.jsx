import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Guru Master — Global Error Boundary
 * Captures React crashes and provides a premium "Rescue" interface
 * instead of the dreaded "Black Screen".
 */
export class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to the console
    console.error("GURU MASTER CRASH:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRestart = () => {
    window.location.reload();
  };

  handleClearCache = () => {
    if (confirm("Isso apagará o estado temporário. Prosseguir?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-dark flex items-center justify-center p-8 font-sans">
          {/* Background Aesthetics */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-pink/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-cyan/10 rounded-full blur-[120px]" />
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-2xl glass-card border-neon-pink/20 bg-dark-lighter/40 backdrop-blur-3xl p-12 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan" />
            
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 rounded-3xl bg-neon-pink/10 border border-neon-pink/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,0,110,0.2)]">
                <AlertTriangle className="w-12 h-12 text-neon-pink animate-pulse" />
              </div>
            </div>

            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">
              Sistema Desafinado
            </h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-8">
              O Agente detectou uma anomalia crítica na interface.
            </p>

            <div className="bg-dark/60 rounded-2xl p-6 mb-10 border border-white/5 text-left font-mono">
              <p className="text-neon-pink text-xs font-black uppercase mb-3 px-3 py-1 bg-neon-pink/10 rounded-full w-fit">Erro Detectado</p>
              <div className="text-gray-300 text-sm break-words overflow-y-auto max-h-[150px] custom-scrollbar leading-relaxed">
                {this.state.error?.toString() || "Erro desconhecido na renderização."}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={this.handleRestart}
                className="flex items-center justify-center gap-3 py-4 bg-white text-dark rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-neon-cyan transition-all transform hover:scale-105 active:scale-95 shadow-xl"
              >
                <RefreshCw className="w-4 h-4" /> Reiniciar Motor
              </button>
              
              <button 
                onClick={this.handleClearCache}
                className="flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all transform hover:scale-105 active:scale-95"
              >
                <Trash2 className="w-4 h-4" /> Reset de Emergência
              </button>
            </div>
            
            <p className="mt-10 text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">
              GURU MASTER AI — PROTOCOLO DE RESGATE ATIVADO
            </p>
          </motion.div>
        </div>
      );
    }

    return this.props.children; 
  }
}
