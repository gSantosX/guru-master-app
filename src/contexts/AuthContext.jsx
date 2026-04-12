import React, { createContext, useContext, useState, useEffect } from 'react';
import { resolveApiUrl } from '../utils/apiUtils';
import { supabase } from '../utils/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user should be remembered
    const remember = localStorage.getItem('guru_remember') === 'true';
    const storedUser = localStorage.getItem('guru_user');
    const activeSession = sessionStorage.getItem('guru_active_session') === 'true';

    if (storedUser && (remember || activeSession)) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('guru_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, remember = false) => {
    try {
      // Direct Supabase Verification
      const { data, error } = await supabase
        .from('guru_users')
        .select('*')
        .eq('email', email)
        .single();
        
      if (error || !data) {
          throw new Error("Credenciais inválidas ou e-mail não encontrado na Nuvem Mestra.");
      }
      
      if (data.password !== password) {
          throw new Error("Senha Incorreta.");
      }

      const userData = { name: data.name, email: data.email };
      setUser(userData);
      localStorage.setItem('guru_user', JSON.stringify(userData));
      localStorage.setItem('guru_remember', remember ? 'true' : 'false');
      sessionStorage.setItem('guru_active_session', 'true');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const sendVerificationCode = async (email) => {
    try {
      const res = await fetch(resolveApiUrl('/api/auth/send-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar código');
      return { success: true };
    } catch (error) {
      console.error('Send code error:', error);
      return { success: false, error: "Motor E-mail Offline. Verifique sua conexão local Python." };
    }
  };

  const verifyCode = async (email, code) => {
    try {
      const res = await fetch(resolveApiUrl('/api/auth/verify-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido');
      return { success: true };
    } catch (error) {
      console.error('Verify code error:', error);
      return { success: false, error: "Erro de Comunicação com Python Local." };
    }
  };

  const register = async (name, email, password, code, remember = false) => {
    try {
      // 1. Verify code again locally
      const res = await fetch(resolveApiUrl('/api/auth/verify-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      if (!res.ok) {
         throw new Error("Código expirado ou inválido.");
      }

      // 2. Insert into Supabase Central Database
      const { data: existingUser } = await supabase
        .from('guru_users')
        .select('email')
        .eq('email', email)
        .single();
        
      if (existingUser) {
        throw new Error("Este e-mail já está registrado na Nuvem.");
      }

      const { data, error } = await supabase
         .from('guru_users')
         .insert([{ 
             name, 
             email, 
             password, 
             is_active: false // A ativação virá pelo Webhook da Kiwify futuramente
         }])
         .select()
         .single();
         
      if (error) {
         throw new Error(error.message);
      }
      
      const userData = { name, email };
      setUser(userData);
      localStorage.setItem('guru_user', JSON.stringify(userData));
      localStorage.setItem('guru_remember', remember ? 'true' : 'false');
      sessionStorage.setItem('guru_active_session', 'true');
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateConfig = async (newConfig) => {
    try {
      const res = await fetch(resolveApiUrl('/api/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar config');
      return { success: true };
    } catch (error) {
      console.error('Update config error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('guru_user');
    localStorage.removeItem('guru_remember');
    sessionStorage.removeItem('guru_active_session');
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      sendVerificationCode,
      verifyCode,
      updateConfig,
      isAuthenticated: !!user, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
