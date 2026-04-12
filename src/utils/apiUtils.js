/**
 * Resolves an API path to a full URL if running in a desktop/packaged environment,
 * or keeps it relative if running via Vite (development).
 * 
 * @param {string} path - The API path (e.g., '/api/system/check')
 * @returns {string} - The resolved URL
 */
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
