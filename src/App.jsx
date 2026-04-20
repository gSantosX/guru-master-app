import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { PersistenceProvider } from './contexts/PersistenceContext';
import { SystemStatusProvider, useSystemStatus } from './contexts/SystemStatusContext';
import { Login } from './components/Login';
import { SalesLanding } from './pages/SalesLanding';
import { GuruMasterApp } from './pages/GuruMasterApp';
import InteractiveBackground from './components/InteractiveBackground';

function WebAppContent() {
  const { isAuthenticated, user, logout } = useAuth();
  const { isInitialized } = useSystemStatus();
  
  const [showLoginComponent, setShowLoginComponent] = useState(window.location.hash === '#login');

  useEffect(() => {
    const handleHashChange = () => setShowLoginComponent(window.location.hash === '#login');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!isInitialized) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden relative">
        <AnimatePresence mode="wait">
          {!isAuthenticated && (
            showLoginComponent
              ? <Login key="login" isAppContext={false} onClose={() => { window.location.hash = ''; setShowLoginComponent(false); }} />
              : <SalesLanding key="sales" onLoginClick={() => window.location.hash = 'login'} />
          )}
          
          {isAuthenticated && (
             (user?.is_active || user?.is_lifetime || user?.is_admin) ? (
               <GuruMasterApp key="guru-app" onLogout={logout} />
             ) : (
               <SalesLanding key="sales-pending" onLoginClick={() => window.location.hash = 'login'} pendingActivation={true} />
             )
          )}
        </AnimatePresence>

        <InteractiveBackground />
    </div>
  );
}

function WebApp() {
  return (
    <GlobalErrorBoundary>
      <SystemStatusProvider>
        <AuthProvider>
          <PersistenceProvider>
            <MotionConfig reducedMotion="user">
              <WebAppContent />
            </MotionConfig>
          </PersistenceProvider>
        </AuthProvider>
      </SystemStatusProvider>
    </GlobalErrorBoundary>
  );
}

export default WebApp;
