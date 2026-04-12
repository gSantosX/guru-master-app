import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * InteractiveBackground — Elite Cursor-Follower Engine
 * Creates a theme-aware, high-performance glow that reacts to the mouse.
 */
const InteractiveBackground = () => {
  const [theme, setTheme] = useState(localStorage.getItem('guru_theme') || 'neon');
  
  // High-performance motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for a luxury feel
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      mouseX.set(clientX);
      mouseY.set(clientY);
    };

    const handleThemeChange = () => {
      setTheme(localStorage.getItem('guru_theme') || 'neon');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('storage', handleThemeChange);
    // Custom event check for theme changes within the same tab
    const interval = setInterval(handleThemeChange, 1000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('storage', handleThemeChange);
      clearInterval(interval);
    };
  }, [mouseX, mouseY]);

  // Dynamic colors based on theme
  const getGlowColor = () => {
    if (theme === 'soft') return 'rgba(191, 64, 255, 0.15)'; // Purple Soft
    if (theme === 'light') return 'rgba(2, 132, 199, 0.05)'; // Blue Light
    if (theme === 'minimal') return 'rgba(255, 255, 255, 0.03)'; // White Minimal
    return 'rgba(0, 243, 255, 0.12)'; // Cyan Neon (Default)
  };

  const getSecondaryColor = () => {
    if (theme === 'soft') return 'rgba(251, 182, 206, 0.1)'; // Pink Soft
    return 'rgba(191, 64, 255, 0.08)'; // Purple
  };

  return (
    <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden bg-dark transition-colors duration-1000 theme-${theme}`}>
      {/* Primary Glow (Direct Cursor Follow) */}
      <motion.div
        style={{
          position: 'absolute',
          left: springX,
          top: springY,
          translateX: '-50%',
          translateY: '-50%',
          width: '60vmax',
          height: '60vmax',
          background: `radial-gradient(circle, ${getGlowColor()} 0%, transparent 70%)`,
          filter: 'blur(80px)',
          opacity: theme === 'light' ? 0.3 : 1,
        }}
      />

      {/* Secondary Glow (Slower, Offset Follow for Parallax effect) */}
      <motion.div
        style={{
          position: 'absolute',
          left: useSpring(mouseX, { stiffness: 20, damping: 40 }),
          top: useSpring(mouseY, { stiffness: 20, damping: 40 }),
          translateX: '-50%',
          translateY: '-50%',
          width: '40vmax',
          height: '40vmax',
          background: `radial-gradient(circle, ${getSecondaryColor()} 0%, transparent 70%)`,
          filter: 'blur(120px)',
          opacity: 0.5,
        }}
      />
    </div>
  );
};

export default InteractiveBackground;
