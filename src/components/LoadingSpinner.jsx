import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ 
  message = "Processando...", 
  size = "md", 
  fullHeight = false,
  className = "" 
}) => {
  const sizeClasses = {
    xs: "w-4 h-4",
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16"
  };

  const containerClasses = fullHeight 
    ? "flex flex-col items-center justify-center h-full w-full min-h-[200px]" 
    : "flex flex-col items-center justify-center p-8";

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="relative">
        <Loader2 className={`${sizeClasses[size] || sizeClasses.md} animate-spin-clockwise text-neon-cyan shadow-[0_0_15px_rgba(0,243,255,0.3)]`} />
        <div className={`absolute inset-0 ${sizeClasses[size] || sizeClasses.md} border-2 border-neon-cyan/10 rounded-full`} />
      </div>
      {message && (
        <div className="mt-4 text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-neon-cyan/60 animate-pulse">
            {message}
          </p>
        </div>
      )}
    </div>
  );
};
