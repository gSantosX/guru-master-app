import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { PersistenceProvider } from './contexts/PersistenceContext';
import { SystemStatusProvider, useSystemStatus } from './contexts/SystemStatusContext';
import { Login } from './components/Login';
import { SalesLanding } from './pages/SalesLanding';
import { GuruMasterApp } from './pages/GuruMasterApp';
import { ResetPassword } from './components/ResetPassword';
import InteractiveBackground from './components/InteractiveBackground';
import { MaintenanceOverlay } from './components/MaintenanceOverlay';
import { resolveApiUrl } from './utils/apiUtils';

function WebAppContent() {
  const { isAuthenticated, user, logout } = useAuth();
  const { isInitialized } = useSystemStatus();
  
  const [showLoginComponent, setShowLoginComponent] = useState(window.location.hash.includes('login'));
  const [isResetMode, setIsResetMode] = useState(window.location.hash.includes('reset'));
  const [maintenanceActive, setMaintenanceActive] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setShowLoginComponent(window.location.hash.includes('login'));
      setIsResetMode(window.location.hash.includes('reset'));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Polling do estado de manutenção — para TODOS os visitantes (logados ou não)
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await fetch(resolveApiUrl('/api/maintenance'));
        if (res.ok) {
          const data = await res.json();
          setMaintenanceActive(!!data.active);
        }
      } catch { /* silencia erros de rede — nunca bloqueia por falha */ }
    };

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  // Evento local para atualização instantânea quando o ADMIN altera o estado
  useEffect(() => {
    const handler = (e) => setMaintenanceActive(!!e.detail?.active);
    window.addEventListener('guru_maintenance_changed', handler);
    return () => window.removeEventListener('guru_maintenance_changed', handler);
  }, []);

  if (!isInitialized) return null;

  // Admin nunca vê o overlay — todos os demais veem quando ativo
  const showMaintenance = maintenanceActive && !user?.is_admin;

  const handleBackToSales = () => {
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden relative">
        <AnimatePresence mode="wait">
          {!isAuthenticated && (
            isResetMode ? (
              <ResetPassword key="reset" onClose={() => { window.location.hash = ''; setIsResetMode(false); }} />
            ) : showLoginComponent ? (
              <Login key="login" isAppContext={false} onClose={() => { window.location.hash = ''; setShowLoginComponent(false); }} />
            ) : (
              <SalesLanding key="sales" onLoginClick={() => window.location.hash = 'login'} />
            )
          )}
          
          {isAuthenticated && (
             (user?.is_active || user?.is_lifetime || user?.is_admin) ? (
               <GuruMasterApp key="guru-app" onLogout={logout} />
             ) : (
               <SalesLanding key="sales-pending" onLoginClick={() => window.location.hash = 'login'} pendingActivation={true} />
             )
          )}
        </AnimatePresence>

        {/* Overlay de manutenção — bloqueia TODOS os não-admins em qualquer página */}
        <MaintenanceOverlay active={showMaintenance} onBackToSales={handleBackToSales} />

        <InteractiveBackground />
    </div>
  );
}

function WebApp() {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <SystemStatusProvider>
          <PersistenceProvider>
            <MotionConfig reducedMotion="user">
              <WebAppContent />
            </MotionConfig>
          </PersistenceProvider>
        </SystemStatusProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}

export default WebApp;
