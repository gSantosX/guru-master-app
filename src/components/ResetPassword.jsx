import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Key, AlertCircle, CheckCircle2, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';
import { resolveApiUrl } from '../utils/apiUtils';

export const ResetPassword = ({ onClose }) => {
  const [formData, setFormData] = useState({ 
    password: '', 
    confirmPassword: '' 
  });
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [error, setError] = useState('');
  
  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1]);
    const t = params.get('token');
    if (t) setToken(t);
    else setError('Token de recuperação não encontrado.');
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch(resolveApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: formData.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao redefinir senha');
      
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#0a0a0f] flex items-center justify-center p-6 overflow-hidden font-sans text-white">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-cyan/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-pink/20 rounded-full blur-[120px] animate-pulse delay-700" />

      <div className="relative w-full max-w-xl">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink rounded-[2.5rem] opacity-30 blur-md"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-[#1a1a24]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-12 lg:p-16 shadow-2xl flex flex-col items-center overflow-hidden"
        >
          {/* Logo */}
          <div className="w-20 h-20 mb-8 relative group">
             <div className="absolute inset-0 bg-neon-cyan rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
             <div className="relative w-full h-full p-1 bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-pink rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.3)] overflow-hidden border border-white/20">
                 <img src="logo.jpg" alt="Guru Master Logo" className="w-full h-full object-cover rounded-full" />
              </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2 text-glow-cyan tracking-tight text-center">Nova Senha</h1>
          <p className="text-gray-500 mb-10 text-xs font-bold tracking-widest uppercase text-center">Crie suas novas credenciais de acesso</p>

          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full text-center space-y-8">
                <div className="bg-neon-cyan/10 border border-neon-cyan/20 p-8 rounded-3xl">
                  <CheckCircle2 className="w-16 h-16 text-neon-cyan mx-auto mb-4" />
                  <h2 className="text-white font-bold text-xl mb-2">Sucesso!</h2>
                  <p className="text-gray-400 text-sm">Sua senha foi redefinida com sucesso.</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-full h-16 bg-neon-cyan text-black font-black uppercase tracking-widest rounded-2xl hover:shadow-neon-cyan transition-all flex items-center justify-center gap-3"
                >
                  Voltar ao Login <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleReset} className="w-full space-y-6">
                <div className="relative group">
                  <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-neon-pink transition-colors" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    placeholder="Nova Senha" 
                    required 
                    value={formData.password} 
                    onChange={handleChange} 
                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-14 text-white outline-none focus:border-neon-pink transition-all" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-neon-pink transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-neon-pink transition-colors" />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    name="confirmPassword" 
                    placeholder="Confirmar Nova Senha" 
                    required 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-14 text-white outline-none focus:border-neon-pink transition-all" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-neon-pink transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-neon-pink text-xs font-bold text-center bg-neon-pink/5 p-4 rounded-xl border border-neon-pink/20 flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" /> 
                    {error}
                  </motion.div>
                )}

                <button type="submit" disabled={status === 'submitting' || !token} className="w-full h-16 bg-neon-pink text-white font-black uppercase tracking-widest rounded-2xl hover:shadow-neon-pink transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {status === 'submitting' ? 'Redefinindo...' : 'Redefinir Senha'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-10 flex items-center gap-2 text-[10px] text-gray-600 font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3 text-neon-cyan" />
            End-to-End Secure Protocol
          </div>
        </motion.div>
      </div>

      {/* Build Info */}
      <div className="fixed bottom-6 left-6 flex items-center gap-4 text-[10px] text-gray-700 font-black tracking-widest uppercase">
         <span>Guru Master AI v2.1.1</span>
         <div className="w-px h-3 bg-gray-800"></div>
         <span>Secure SMTP Protocol Verified</span>
      </div>
    </div>
  );
};
