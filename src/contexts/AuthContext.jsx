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
      const { data, error } = await supabase
        .from('guru_users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
        
      if (error || !data) {
          throw new Error("E-mail não encontrado. Adquira seu acesso no site oficial!");
      }
      
      if (!data.is_active) {
          throw new Error("Sua assinatura Guru Master não está ativa. Verifique o pagamento!");
      }

      if (data.password !== password) {
          throw new Error("Senha Incorreta.");
      }

      const userData = { 
        name: data.name, 
        email: data.email, 
        is_admin: data.is_admin,
        is_lifetime: data.is_lifetime,
        expires_at: data.expires_at,
        picture: data.profile_picture 
      };

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
      return { success: false, error: "Nuvem Master temporariamente indisponível. Tente novamente em alguns minutos." };
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
      return { success: false, error: "Falha na verificação segura. Tente novamente." };
    }
  };

  const register = async (name, email, password, code, remember = false) => {
    try {
      // 1. Verify code again
      const verifyRes = await verifyCode(email, code);
      if (!verifyRes.success) throw new Error(verifyRes.error);

      // 2. Check if user already exists (maybe created via webhook)
      const { data: existingUser } = await supabase
        .from('guru_users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
        
      if (existingUser && existingUser.password) {
        throw new Error("Este e-mail já possui uma conta ativa. Faça login!");
      }

      let userData;

      if (existingUser) {
        // User created via webhook: just set his password
        const { data, error } = await supabase
          .from('guru_users')
          .update({ password, updated_at: new Date().toISOString() })
          .eq('email', email.toLowerCase())
          .select()
          .single();
          
        if (error) throw error;
        userData = { 
          name: data.name, 
          email: data.email, 
          is_admin: data.is_admin,
          is_lifetime: data.is_lifetime,
          expires_at: data.expires_at,
          picture: data.profile_picture 
        };
      } else {
        // Generic Register with Access Code (Admin generated)
        const { data: accessCode } = await supabase
          .from('guru_access_codes')
          .select('*')
          .eq('code', code)
          .eq('is_used', false)
          .single();

        if (!accessCode) {
           throw new Error("Código de acesso expirado ou inválido.");
        }

        const { data: newUser, error } = await supabase
           .from('guru_users')
           .insert([{ 
               name, 
               email: email.toLowerCase(), 
               password, 
               is_active: true,
               is_lifetime: true 
           }])
           .select()
           .single();
           
        if (error) throw error;

        // Mark access code as used
        await supabase.from('guru_access_codes').update({ is_used: true, used_by: email }).eq('id', accessCode.id);

        userData = { 
          name: newUser.name, 
          email: newUser.email, 
          is_admin: newUser.is_admin,
          is_lifetime: newUser.is_lifetime 
        };
      }
      
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
