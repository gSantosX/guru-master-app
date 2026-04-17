import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Copy, CheckCircle2, AlertCircle, RefreshCw, Hash, List, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

export const AdminTab = () => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCodes();
  }, []);

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

  const generateCode = async () => {
    setLoading(true);
    setError('');
    const newCode = 'GURU-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    try {
      const { error } = await supabase
        .from('guru_access_codes')
        .insert([{ 
          code: newCode, 
          is_used: false,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      setSuccess('Código gerado com sucesso!');
      fetchCodes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro ao gerar código: ' + err.message);
    } finally {
      setLoading(false);
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
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-neon-purple shadow-neon-purple" />
            Painel Administrativo
          </h2>
          <p className="text-gray-500 text-sm mt-1">Gerenciamento de acessos vitalícios e cupons</p>
        </div>
        
        <button 
          onClick={generateCode}
          disabled={loading}
          className="bg-neon-purple text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest hover:shadow-neon-purple transition-all flex items-center gap-3 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
          Gerar Novo Acesso
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border-l-4 border-l-neon-purple">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Total de Códigos</p>
          <p className="text-4xl font-black text-white">{codes.length}</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-neon-cyan">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Acessos Disponíveis</p>
          <p className="text-4xl font-black text-white">{codes.filter(c => !c.is_used).length}</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-neon-pink">
           <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Acessos Utilizados</p>
           <p className="text-4xl font-black text-white">{codes.filter(c => c.is_used).length}</p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <h3 className="text-white font-bold flex items-center gap-2">
            <List className="w-5 h-5 text-neon-cyan" />
            Lista de Códigos de Acesso
          </h3>
          <button onClick={fetchCodes} className="text-gray-500 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
