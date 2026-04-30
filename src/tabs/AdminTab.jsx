import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Copy, CheckCircle2, AlertCircle, RefreshCw, Hash, List, Trash2, Mail, Zap, Power } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { resolveApiUrl } from '../utils/apiUtils';

export const AdminTab = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  // Strict Admin Check
  if (!user?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
        <Shield className="w-16 h-16 text-red-500/20 mb-4" />
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Acesso Negado</h2>
        <p className="text-gray-500 mt-2 max-w-xs">Você não tem permissão para acessar o painel administrativo.</p>
      </div>
    );
  }

  useEffect(() => {
    fetchCodes();
    fetchMaintenance();
  }, []);

  const fetchMaintenance = async () => {
    try {
      const res = await fetch(resolveApiUrl('/api/maintenance'));
      if (res.ok) { const d = await res.json(); setMaintenanceActive(!!d.active); }
    } catch {}
  };

  const toggleMaintenance = async () => {
    setMaintenanceLoading(true);
    const newState = !maintenanceActive;
    try {
      const res = await fetch(resolveApiUrl('/api/maintenance'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newState }),
      });
      if (res.ok) {
        setMaintenanceActive(newState);
        // Dispara evento local para atualização instantânea na mesma aba
        window.dispatchEvent(new CustomEvent('guru_maintenance_changed', { detail: { active: newState } }));
        setSuccess(newState ? '⚠️ Modo manutenção ATIVADO — todos os usuários estão bloqueados.' : '✅ Plataforma LIBERADA — usuários podem acessar normalmente.');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        throw new Error('Falha ao comunicar com o servidor.');
      }
    } catch (err) {
      setError('Erro ao alterar modo manutenção: ' + err.message);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guru_access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (err) {
      setError('Erro ao carregar códigos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async (sendEmail = false) => {
    if (sendEmail && !targetEmail) {
      setError('Por favor, informe um e-mail válido.');
      return;
    }

    setLoading(true);
    if (sendEmail) setSendingEmail(true);
    setError('');
    
    const newCode = 'GURU-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    try {
      // 1. Save to database
      const { error: dbError } = await supabase
        .from('guru_access_codes')
        .insert([{ 
          code: newCode, 
          is_used: false,
          created_at: new Date().toISOString()
        }]);

      if (dbError) throw dbError;

      // 2. Send via Email if requested
      if (sendEmail) {
        const response = await fetch('/api/admin/send-access-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail, code: newCode })
        });
        
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || 'Erro ao enviar e-mail');
        
        setSuccess('Código enviado para ' + targetEmail);
        setTargetEmail('');
      } else {
        setSuccess('Código gerado com sucesso!');
      }

      fetchCodes();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Falha operacional: ' + err.message);
    } finally {
      setLoading(false);
      setSendingEmail(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Código copiado!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const deleteCode = async (id) => {
    if (!window.confirm('Excluir este código permanentemente?')) return;
    try {
      await supabase.from('guru_access_codes').delete().eq('id', id);
      fetchCodes();
    } catch (err) {
      setError('Erro ao excluir código');
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col overflow-y-auto custom-scrollbar pb-20">
      {/* Header Section: Title + Invitation Card Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10 items-center">
        <header className="lg:col-span-5 shrink-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-neon-purple/10 border border-neon-purple/20 shadow-[0_0_20px_rgba(157,0,255,0.1)]">
                <Shield className="text-neon-purple w-8 h-8" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
                Painel <br /> <span className="text-neon-purple">Administrativo</span>
              </h2>
            </div>
            <p className="text-xs md:text-sm text-gray-500 font-bold uppercase tracking-[0.2em] max-w-xs leading-relaxed">
              Gerenciamento de acessos vitalícios e cupons de ativação.
            </p>
          </motion.div>
        </header>

        <div className="lg:col-span-7">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 border border-white/10 bg-white/[0.02] relative overflow-hidden group"
          >
            <div className="relative z-10">
              <h3 className="text-white font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                <Key className="w-4 h-4 text-neon-purple" />
                Gerar Convite de Acesso Vitalício
              </h3>
              
              <div className="flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1 w-full">
                  <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-2 ml-1">E-mail do Cliente</label>
                  <input 
                    type="email" 
                    placeholder="exemplo@gmail.com"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-purple/50 transition-all font-medium text-sm"
                  />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                    onClick={() => generateCode(true)}
                    disabled={loading || !targetEmail}
                    className="flex-1 md:flex-none bg-gradient-to-r from-neon-purple to-purple-800 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:shadow-[0_0_25px_rgba(157,0,255,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                  >
                    {sendingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    <span>Enviar Convite</span>
                  </button>

                  <button 
                    onClick={() => generateCode(false)}
                    disabled={loading}
                    className="p-3 bg-white/5 border border-white/10 text-gray-400 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center group/btn"
                    title="Apenas Gerar Código"
                  >
                    {loading && !sendingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Hash className="w-4 h-4 group-hover/btn:text-neon-purple transition-colors" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
          </motion.div>
        </div>
      </div>

      {/* ── CONTROLE DE MANUTENÇÃO ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div
          className={`glass-card p-6 border relative overflow-hidden transition-all duration-500 ${
            maintenanceActive
              ? 'border-red-500/40 bg-red-500/[0.04]'
              : 'border-white/10 bg-white/[0.02]'
          }`}
        >
          {/* Glow de fundo condicional */}
          {maintenanceActive && (
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,50,50,0.05) 0%, transparent 70%)' }} />
          )}

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl border transition-all duration-500 ${
                maintenanceActive
                  ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_20px_rgba(255,50,50,0.2)]'
                  : 'bg-neon-purple/10 border-neon-purple/20'
              }`}>
                <Power className={`w-6 h-6 transition-colors ${maintenanceActive ? 'text-red-400' : 'text-neon-purple'}`} />
              </div>
              <div>
                <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  Tela de Atualização do Sistema
                  <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-widest ${
                    maintenanceActive
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                  }`}>
                    {maintenanceActive ? 'ATIVO' : 'INATIVO'}
                  </span>
                </h3>
                <p className="text-gray-500 text-xs mt-1 max-w-md">
                  {maintenanceActive
                    ? 'Todos os usuários estão vendo a tela de atualização e não podem interagir com a plataforma.'
                    : 'Ative para bloquear todos os usuários comuns e exibir a tela de atualização.'}
                </p>
              </div>
            </div>

            <button
              onClick={toggleMaintenance}
              disabled={maintenanceLoading}
              className={`relative flex items-center gap-3 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-300 ${
                maintenanceActive
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 hover:shadow-[0_0_25px_rgba(255,50,50,0.3)]'
                  : 'bg-gradient-to-r from-neon-purple to-purple-800 text-white hover:shadow-[0_0_25px_rgba(157,0,255,0.4)]'
              } disabled:opacity-50 shrink-0`}
            >
              {maintenanceLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : maintenanceActive ? (
                <>
                  <Zap className="w-4 h-4" />
                  Liberar Plataforma
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  Ativar Atualização
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total de Códigos', value: codes.length, color: 'border-l-gray-500', icon: List },
          { label: 'Acessos Disponíveis', value: codes.filter(c => !c.is_used).length, color: 'border-l-neon-cyan', icon: CheckCircle2 },
          { label: 'Acessos Utilizados', value: codes.filter(c => c.is_used).length, color: 'border-l-neon-pink', icon: Trash2 },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-card p-6 border-l-4 ${stat.color} bg-white/[0.01] hover:bg-white/[0.03] transition-all`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
              <stat.icon className="w-3 h-3 text-gray-600" />
            </div>
            <p className="text-4xl font-black text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="glass-panel overflow-hidden border border-white/5 bg-white/[0.01]">
        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <List className="w-4 h-4 text-neon-cyan" />
            Lista de Códigos de Acesso
          </h3>
          <button onClick={fetchCodes} className="p-2 hover:bg-white/5 rounded-lg transition-colors group">
            <RefreshCw className={`w-4 h-4 text-gray-500 group-hover:text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>


        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/40 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Data de Geração</th>
                <th className="px-6 py-4">Usuário Final</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {codes.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <code className="text-neon-cyan font-mono font-bold">{item.code}</code>
                      <button onClick={() => copyToClipboard(item.code)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg transition-all">
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.is_used ? (
                      <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded-full">Utilizado</span>
                    ) : (
                      <span className="px-3 py-1 bg-neon-cyan/10 text-neon-cyan text-[10px] font-black uppercase rounded-full border border-neon-cyan/20">Disponível</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-xs text-white font-medium">
                    {item.used_by || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteCode(item.id)} className="p-2 hover:bg-red-500/10 rounded-xl text-gray-600 hover:text-red-500 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {codes.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-600 italic">
                    Nenhum código gerado ainda. Clique em "Gerar Novo Acesso" para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Notifications */}
      <AnimatePresence>
        {(success || error) && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 border
              ${error ? 'bg-red-900/90 border-red-500 text-white' : 'bg-[#1a1a24]/90 border-neon-cyan text-white'}
            `}
          >
            {error ? <AlertCircle className="w-6 h-6 text-red-500" /> : <CheckCircle2 className="w-6 h-6 text-neon-cyan" />}
            <span className="font-bold text-sm uppercase tracking-wide">{error || success}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
