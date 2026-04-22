/**
 * Resolves an API path to a full URL if running in a desktop/packaged environment,
 * or keeps it relative if running via Vite (development).
 * 
 * @param {string} path - The API path (e.g., '/api/system/check')
 * @returns {string} - The resolved URL
 */
import React from 'react';

/**
 * A wrapper for React.lazy that retries the import if it fails.
 * Useful for handling "Failed to fetch dynamically imported module" errors after a new deploy.
 */
export const lazyWithRetry = (componentImport) =>
  React.lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // A falha de importação dinâmica é comum após um novo deploy.
        // Recarregamos a página uma vez para tentar obter a nova versão.
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        return window.location.reload();
      }

      // Se já recarregamos e ainda falhou, jogamos o erro para o Error Boundary.
      throw error;
    }
  });

export const resolveApiUrl = (path) => {
  // If we're running from a local file (packaged Electron), 
  // or if we're in an context where the standard relative path won't hit our backend properly,
  // we default to the local backend port.
  
  if (window.location.protocol === 'file:' || !window.location.port || window.location.port === '5173') {
     // In development or packaged Electron, use the explicit backend port for API calls
     // EXCEPT when Vite is proxying everything correctly.
     // However, to be extra safe in Electron, we can prefix with localhost:5000.
     
     // Detect if we are in Electron
     const isElectron = navigator.userAgent.toLowerCase().includes('electron');
     
     if (isElectron) {
        // Force full URL in Electron to ensure it hits the Flask backend regardless of load method
        return `http://localhost:5000${path}`;
     }
  }
  
  return path;
};

/**
 * Gets the current user's email from localStorage.
 * Used to authenticate YouTube API proxy requests.
 */
const getUserEmail = () => {
  try {
    const stored = localStorage.getItem('guru_user');
    if (stored) return (JSON.parse(stored).email || '').toLowerCase();
  } catch {}
  return '';
};

/**
 * Builds a YouTube API proxy URL.
 * Calls /api/youtube directly with 'path' as a query param to avoid Vercel rewrite conflicts.
 *
 * @param {string} ytPath - YouTube endpoint (e.g., 'search', 'channels', 'videos', 'commentThreads')
 * @param {Record<string, string>} params - YouTube API query parameters
 * @returns {string} - Full proxy URL with email param
 */
export const buildYouTubeUrl = (ytPath, params = {}) => {
  const email = getUserEmail();
  const base = resolveApiUrl('/api/youtube');
  const qs = new URLSearchParams({
    path: ytPath,
    ...params,
    ...(email ? { email } : {})
  });
  return `${base}?${qs.toString()}`;
};
