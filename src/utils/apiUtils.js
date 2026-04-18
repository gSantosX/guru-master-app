/**
 * Resolves an API path to a full URL.
 * In Web Mode (Vercel/Browser), it maps AI endpoints directly to providers to bypass local proxy.
 * In Desktop Mode (Electron), it uses the local Flask context.
 * 
 * @param {string} path - The API path (e.g., '/api/system/check' or '/api/gemini/...')
 * @returns {string} - The resolved URL
 */
export const resolveApiUrl = (path) => {
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');
  
  // If we are on the web, we want to route AI calls directly to the provider
  if (!isElectron) {
    if (path.startsWith('/api/gemini/')) {
      return path.replace('/api/gemini', 'https://generativelanguage.googleapis.com');
    }
    if (path.startsWith('/api/openai/')) {
      return path.replace('/api/openai', 'https://api.openai.com');
    }
    if (path.startsWith('/api/grok/')) {
      return path.replace('/api/grok', 'https://api.x.ai');
    }
  }

  // In development (Vite 5173) or packaged Electron (file:), 
  // we default to the local backend port if we are in Electron.
  if (isElectron && (window.location.protocol === 'file:' || window.location.port === '5173' || !window.location.port)) {
    return `http://localhost:5000${path}`;
  }
  
  return path;
};
