import React from 'react';
import { Loader2, Cpu } from 'lucide-react';

export const LoadingSpinner = ({ 
  message = "Processando...", 
  title = "",
  current = null,
  total = null,
  icon: Icon = Cpu,
  size = "md", 
  fullHeight = false,
  className = "" 
}) => {
  // If it's inline / small (xs or sm), render the simple mini spinner
  if (size === "xs" || size === "sm") {
    const sizeClasses = {
      xs: "w-3 h-3",
      sm: "w-5 h-5",
    };
    const currentSize = sizeClasses[size] || "w-4 h-4";
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <div className="relative flex items-center justify-center">
          <Loader2 className={`${currentSize} animate-spin text-neon-cyan shadow-[0_0_15px_rgba(0,243,255,0.3)]`} />
        </div>
        {message && <span className="ml-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">{message}</span>}
      </div>
    );
  }

  const containerClasses = fullHeight 
    ? "flex flex-col items-center justify-center h-full w-full min-h-[350px]" 
    : "flex flex-col items-center justify-center p-8 w-full text-center space-y-6";

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* Circular Spinner */}
      <div className="relative flex items-center justify-center">
        {/* Glowing background */}
        <div className="absolute w-24 h-24 rounded-full bg-neon-pink/10 blur-xl animate-pulse" />
        
        {/* Outer spinning ring */}
        <div className="w-20 h-20 rounded-full border-4 border-t-neon-pink border-r-transparent border-b-neon-purple border-l-transparent animate-spin" />
        
        {/* Inner spinning ring (counter-rotation) */}
        <div 
          className="absolute w-16 h-16 rounded-full border-4 border-t-transparent border-r-neon-cyan border-b-transparent border-l-neon-cyan opacity-70"
          style={{ animation: 'spin 2s linear infinite reverse' }}
        />
        
        {/* Central icon */}
        <div className="absolute flex items-center justify-center animate-pulse">
          {Icon && <Icon className="w-6 h-6 text-white" />}
        </div>
      </div>

      <div className="space-y-2">
        {title && (
          <h4 className="text-lg font-black text-white uppercase tracking-wider">
            {title}
          </h4>
        )}
        
        {current !== null && total !== null && (
          <div className="text-4xl font-black text-neon-pink text-glow-pink flex items-baseline justify-center gap-1">
            <span>{current}</span>
            <span className="text-lg text-gray-500">/ {total}</span>
          </div>
        )}
        
        {message && (
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest animate-pulse max-w-xs mx-auto">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

