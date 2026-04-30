import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MaintenanceOverlay
 * Bloqueia TODA a plataforma para usuários não-admin enquanto a manutenção estiver ativa.
 * Aparece em qualquer rota — login, landing, e app interno.
 * Só some quando o admin desativar.
 */
export const MaintenanceOverlay = ({ active, onBackToSales }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setDots(p => p.length >= 3 ? '' : p + '.'), 600);
    return () => clearInterval(id);
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="maintenance-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at 50% 35%, #0d0017 0%, #050505 65%)',
          }}
        >
          {/* Glow roxo de fundo */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 70% 50% at 50% 45%, rgba(157,0,255,0.10) 0%, transparent 70%)',
            }}
          />

          {/* Partículas flutuantes */}
          {[0,1,2,3,4,5,6,7].map(i => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 2 + (i % 3),
                height: 2 + (i % 3),
                background: i % 2 === 0 ? '#9d00ff' : '#00f0ff',
                left: `${8 + i * 12}%`,
                top: `${15 + (i % 4) * 20}%`,
                opacity: 0.25,
              }}
              animate={{ y: [0, -25, 0], opacity: [0.25, 0.6, 0.25] }}
              transition={{
                duration: 3.5 + i * 0.4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.35,
              }}
            />
          ))}

          {/* Conteúdo central */}
          <div className="relative z-10 flex flex-col items-center gap-8 px-8 text-center max-w-md w-full">

            {/* Logo */}
            <motion.div
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 130, damping: 18 }}
              className="relative"
            >
              {/* Anel de glow pulsante */}
              <motion.div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                animate={{ boxShadow: [
                  '0 0 50px 15px rgba(157,0,255,0.20)',
                  '0 0 80px 25px rgba(157,0,255,0.40)',
                  '0 0 50px 15px rgba(157,0,255,0.20)',
                ]}}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <img
                src="/logo.jpg"
                alt="Guru Master"
                className="w-36 h-36 md:w-48 md:h-48 rounded-3xl object-cover shadow-2xl relative z-10"
              />
            </motion.div>

            {/* Textos */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-5"
            >
              {/* Nome */}
              <h1
                className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white leading-none"
                style={{ textShadow: '0 0 40px rgba(157,0,255,0.55), 0 0 80px rgba(157,0,255,0.20)' }}
              >
                GURU <span style={{ color: '#9d00ff' }}>MASTER</span>
              </h1>

              {/* Separador */}
              <motion.div
                className="h-[2px] rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent, #9d00ff, #00f0ff, transparent)' }}
                initial={{ width: 0 }}
                animate={{ width: '180px' }}
                transition={{ delay: 0.5, duration: 0.9 }}
              />

              {/* Badge de status */}
              <motion.div
                className="flex items-center gap-2 px-4 py-2 rounded-full border"
                style={{ background: 'rgba(157,0,255,0.08)', borderColor: 'rgba(157,0,255,0.30)' }}
                animate={{ borderColor: ['rgba(157,0,255,0.30)', 'rgba(0,240,255,0.30)', 'rgba(157,0,255,0.30)'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#9d00ff' }}
                  animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: '#9d00ff' }}>
                  Manutenção em Andamento
                </span>
              </motion.div>

              {/* Mensagem principal */}
              <div className="flex flex-col items-center gap-1">
                <p className="text-xl md:text-2xl font-black text-white uppercase tracking-wide">
                  Atualizando Sistema<span style={{ color: '#9d00ff' }}>{dots}</span>
                </p>
                <p className="text-sm md:text-base text-gray-400 font-medium leading-relaxed max-w-xs">
                  Deixando cada vez melhor para criadores!
                </p>
              </div>
            </motion.div>

            {/* Barra de progresso infinita */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="w-56 md:w-72 h-[3px] rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #9d00ff, #00f0ff, #9d00ff)' }}
                animate={{ x: ['-110%', '210%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>

            {/* Botão: Voltar ao site de vendas */}
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              onClick={onBackToSales}
              className="mt-2 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.55)',
              }}
              whileHover={{
                background: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(157,0,255,0.40)',
                color: 'rgba(255,255,255,0.85)',
              }}
              whileTap={{ scale: 0.97 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Voltar ao site
            </motion.button>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
