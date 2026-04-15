import React, { useEffect, useState } from 'react';

/**
 * InteractiveBackground — Clean & Static Background
 * Preserves the dark aesthetic and theme-awareness without the cursor-tracking lights.
 * Requested by USER: "retire a luz que segue o cursor"
 */
const InteractiveBackground = () => {
  const [theme, setTheme] = useState(localStorage.getItem('guru_theme') || 'neon');
  
  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(localStorage.getItem('guru_theme') || 'neon');
    };

    window.addEventListener('storage', handleThemeChange);
    // Custom event check for theme changes within the same tab
    const interval = setInterval(handleThemeChange, 1000);

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      clearInterval(interval);
    };
  }, []);

  // Dynamic colors based on theme
  const getGlowColor = () => {
    if (theme === 'soft') return 'rgba(191, 64, 255, 0.08)'; // Purple Soft
    if (theme === 'light') return 'rgba(2, 132, 199, 0.03)'; // Blue Light
    if (theme === 'minimal') return 'rgba(255, 255, 255, 0.02)'; // White Minimal
    return 'rgba(0, 243, 255, 0.05)'; // Cyan Neon (Default)
  };

  return (
    <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden bg-dark transition-colors duration-1000 theme-${theme}`}>
      {/* Static Ambient Glow 1 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120vmax',
          height: '120vmax',
          background: `radial-gradient(circle, ${getGlowColor()} 0%, transparent 80%)`,
          filter: 'blur(100px)',
          opacity: 0.8,
        }}
      />
      
      {/* Subtle Corner Accents */}
      <div
        style={{
          position: 'absolute',
          right: '-20%',
          bottom: '-20%',
          width: '60vmax',
          height: '60vmax',
          background: `radial-gradient(circle, ${theme === 'soft' ? 'rgba(251, 182, 206, 0.05)' : 'rgba(191, 64, 255, 0.03)'} 0%, transparent 70%)`,
          filter: 'blur(120px)',
        }}
      />
    </div>
  );
};

export default InteractiveBackground;
