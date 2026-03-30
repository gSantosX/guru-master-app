import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { User, Lock, Mail, ArrowRight, Sparkles, LogIn, UserPlus, Info, ShieldCheck, Key, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Login = () => {
  const { login, register, sendVerificationCode, verifyCode } = useAuth();
  const { isInitialized, checkConnectivity } = useSystemStatus();
  
  // UI States
  const [isLogin, setIsLogin] = useState(true);
  const [regStep, setRegStep] = useState('details'); // 'details' | 'verify' | 'security'
  
  // Form Data
  const [formData, setFormData] = useState({ 
    name: '', 
    email: localStorage.getItem('guru_last_email') || '', 
    password: '', 
    confirmPassword: '',
    code: ''
  });
  
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('guru_remember_me') !== 'false'); // Default to true
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSendCode = async () => {
    if (!formData.email || !formData.name) {
      setError('Preencha seu nome e e-mail para continuar.');
      return;
    }
    setIsSubmitting(true);
    const res = await sendVerificationCode(formData.email);
    setIsSubmitting(false);
    
    if (res.success) {
      setRegStep('verify');
      setSuccess('Código enviado! Verifique sua caixa de entrada.');
    } else {
      setError(res.error);
    }
  };

  const handleVerifyCode = async () => {
    if (formData.code.length !== 4) {
      setError('O código deve ter 4 dígitos.');
      return;
    }
    setIsSubmitting(true);
    const res = await verifyCode(formData.email, formData.code);
    setIsSubmitting(false);
    
    if (res.success) {
      setRegStep('security');
      setError('');
    } else {
      setError(res.error);
    }
  };

  const handleFinalRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    const res = await register(formData.name, formData.email, formData.password, formData.code, rememberMe);
    setIsSubmitting(false);
    
    if (!res.success) {
      setError(res.error);
    } else {
      checkConnectivity();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await login(formData.email, formData.password, rememberMe);
    setIsSubmitting(false);
    if (!res.success) {
       setError(res.error);
    } else {
       // Persist "Remember Login" preference
       localStorage.setItem('guru_remember_me', rememberMe ? 'true' : 'false');
       if (rememberMe) {
          localStorage.setItem('guru_last_email', formData.email);
       } else {
          localStorage.removeItem('guru_last_email');
       }
       checkConnectivity();
    }
  };

  if (!isInitialized) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a0a0f] flex items-center justify-center p-6 overflow-hidden font-sans">
      {/* Background Animated Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-cyan/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-pink/20 rounded-full blur-[120px] animate-pulse delay-700" />
      
      {/* Main Glass Card */}
      <div className="relative w-full max-w-xl">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink rounded-[2.5rem] opacity-30 blur-md"></div>
        
        <motion.div 
          layout
          className="relative bg-[#1a1a24]/80 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-12 lg:p-16 shadow-2xl flex flex-col items-center overflow-hidden"
        >
          {/* Progress Bar (Registration Only) */}
          {!isLogin && (
            <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
              <motion.div 
                initial={{ width: '0%' }}
                animate={{ width: regStep === 'details' ? '33.3%' : regStep === 'verify' ? '66.6%' : '100%' }}
                className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple shadow-[0_0_10px_rgba(0,243,255,1)]"
              />
            </div>
          )}

          {/* Logo */}
          <div className="w-20 h-20 mb-8 relative group">
             <div className="absolute inset-0 bg-neon-cyan rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
             <div className="relative w-full h-full p-1 bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-pink rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.3)] overflow-hidden border border-white/20">
                <img src="/logo.jpg" alt="Guru Master Logo" className="w-full h-full object-cover rounded-full" />
             </div>
          </div>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div 
                key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="w-full flex flex-col items-center"
              >
                <h1 className="text-3xl font-bold text-white mb-2 text-glow-cyan tracking-tight">Login</h1>
                <p className="text-gray-500 mb-10 text-xs font-bold tracking-widest uppercase">Bem-vindo de volta</p>

                <form onSubmit={handleLogin} className="w-full space-y-6">
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-neon-cyan transition-colors" />
                    <input type="email" name="email" placeholder="E-mail" required value={formData.email} onChange={handleChange} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-white outline-none focus:border-neon-cyan transition-all" />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-neon-cyan transition-colors" />
                    <input type="password" name="password" placeholder="Senha" required value={formData.password} onChange={handleChange} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-white outline-none focus:border-neon-cyan transition-all" />
                  </div>

                  <div className="flex items-center justify-between px-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only" />
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-neon-cyan border-neon-cyan' : 'border-white/10'}`}>
                        {rememberMe && <CheckCircle2 className="w-4 h-4 text-black" />}
                      </div>
                      <span className="text-xs font-bold text-gray-500 group-hover:text-gray-300">Lembrar acesso</span>
                    </label>
                    <button type="button" className="text-xs text-gray-500 hover:text-white transition-colors">Esqueceu a senha?</button>
                  </div>

                  {error && <div className="text-neon-pink text-xs font-bold text-center bg-neon-pink/5 p-4 rounded-xl border border-neon-pink/20 flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

                  <button type="submit" disabled={isSubmitting} className="w-full h-16 bg-neon-cyan text-black font-black uppercase tracking-widest rounded-2xl hover:shadow-neon-cyan transition-all disabled:opacity-50">
                    {isSubmitting ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="w-full flex flex-col items-center"
              >
                <h1 className="text-3xl font-bold text-white mb-2 text-glow-cyan tracking-tight">Cadastro</h1>
                <p className="text-gray-500 mb-10 text-[10px] font-bold tracking-[0.3em] uppercase">
                  {regStep === 'details' ? 'Passo 1: Identificação' : regStep === 'verify' ? 'Passo 2: Verificação' : 'Passo 3: Segurança'}
                </p>

                <div className="w-full space-y-6">
                  {regStep === 'details' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="relative"><User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /><input type="text" name="name" placeholder="Nome Completo" value={formData.name} onChange={handleChange} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-white outline-none focus:border-neon-cyan transition-all" /></div>
                      <div className="relative"><Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /><input type="email" name="email" placeholder="E-mail" value={formData.email} onChange={handleChange} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-white outline-none focus:border-neon-cyan transition-all" /></div>
                      <button onClick={handleSendCode} disabled={isSubmitting} className="w-full h-16 bg-[#12121c] border border-neon-cyan/50 text-neon-cyan font-bold uppercase tracking-widest rounded-2xl hover:bg-neon-cyan/10 transition-all">
                        {isSubmitting ? 'Enviando...' : 'Enviar Código'}
                      </button>
                    </motion.div>
                  )}

                  {regStep === 'verify' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="text-center mb-4"><p className="text-gray-400 text-sm">Enviamos um código de 4 dígitos para:</p><p className="text-neon-cyan font-bold text-sm">{formData.email}</p></div>
                      <div className="relative">
                        <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input type="text" name="code" maxLength="4" placeholder="Código de 4 dígitos" value={formData.code} onChange={handleChange} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-white text-center text-3xl font-black tracking-[1em] outline-none focus:border-neon-purple transition-all" />
                      </div>
                      <button onClick={handleVerifyCode} disabled={isSubmitting} className="w-full h-16 bg-neon-purple text-white font-bold uppercase tracking-widest rounded-2xl hover:shadow-neon-purple transition-all">
                        {isSubmitting ? 'Validando...' : 'Validar Código'}
                      </button>
                      <button onClick={() => setRegStep('details')} className="w-full text-xs text-gray-500 hover:text-white transition-colors">Voltar e alterar e-mail</button>
                    </motion.div>
                  )}

                  {regStep === 'security' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="relative"><Key className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /><input type="password" name="password" placeholder="Nova Senha" value={formData.password} onChange={handleChange} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-white outline-none focus:border-neon-pink transition-all" /></div>
                      <div className="relative"><Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /><input type="password" name="confirmPassword" placeholder="Confirmar Senha" value={formData.confirmPassword} onChange={handleChange} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 text-white outline-none focus:border-neon-pink transition-all" /></div>
                      <button onClick={handleFinalRegister} disabled={isSubmitting} className="w-full h-16 bg-neon-pink text-white font-bold uppercase tracking-widest rounded-2xl hover:shadow-neon-pink transition-all">
                        {isSubmitting ? 'Finalizando...' : 'Concluir Cadastro'}
                      </button>
                    </motion.div>
                  )}

                  {error && <div className="text-neon-pink text-xs font-bold text-center bg-neon-pink/5 p-4 rounded-xl border border-neon-pink/20">{error}</div>}
                  {success && <div className="text-neon-cyan text-xs font-bold text-center bg-neon-cyan/5 p-4 rounded-xl border border-neon-cyan/20 flex gap-2 justify-center"><CheckCircle2 className="w-4 h-4" /> {success}</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Screen */}
          <button 
            onClick={() => { setIsLogin(!isLogin); setRegStep('details'); setError(''); setSuccess(''); }}
            className="mt-10 text-xs text-gray-500 hover:text-neon-cyan transition-colors flex items-center gap-2 group"
          >
            {isLogin ? 'Não tem conta? Começar registro' : 'Já tem conta? Voltar ao Login'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
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
