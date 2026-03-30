import React, { createContext, useContext, useState, useEffect } from 'react';
import { resolveApiUrl } from '../utils/apiUtils';

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
      const res = await fetch(resolveApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no login');
      
      setUser(data.user);
      localStorage.setItem('guru_user', JSON.stringify(data.user));
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
      return { success: false, error: error.message };
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
      return { success: false, error: error.message };
    }
  };

  const register = async (name, email, password, code, remember = false) => {
    try {
      const res = await fetch(resolveApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, code })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no cadastro');
      
      setUser(data.user);
      localStorage.setItem('guru_user', JSON.stringify(data.user));
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
