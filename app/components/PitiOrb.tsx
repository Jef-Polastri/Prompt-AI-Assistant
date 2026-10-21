'use client';

import React from 'react';

interface PitiOrbProps {
  isThinking?: boolean;
}

export default function PitiOrb({ isThinking = false }: PitiOrbProps) {
  return (
    <div className="relative flex items-center justify-center w-36 h-36 my-6 select-none">
      
      {/* 1. Anel Externo de Luz Néon Pulsante */}
      <div 
        className={`absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500 via-purple-500 to-amber-300 opacity-20 blur-xl transition-all duration-700 ${
          isThinking ? 'scale-125 opacity-50 animate-pulse' : 'animate-pulse'
        }`}
      />

      {/* 2. Camada da Aura Fluida em Rotação */}
      <div 
        className={`absolute inset-1 rounded-full bg-gradient-to-r from-white via-cyan-400 to-purple-500 opacity-80 blur-md ${
          isThinking ? 'animate-spin' : 'animate-[spin_8s_linear_infinite]'
        }`}
      />

      {/* 3. Borda Externa Definida (Brilho da Esfera) */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/90 via-slate-300/30 to-white/10 p-[1px] shadow-[0_0_30px_rgba(255,255,255,0.25)]">
        
        {/* 4. Núcleo Escuro da Esfera (Efeito Lente Esférica) */}
        <div className="w-full h-full rounded-full bg-black relative overflow-hidden flex items-center justify-center shadow-inner">
          
          {/* Sombras internas para profundidade 3D */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent_70%)]" />

          {/* Brilho interno dinâmico */}
          <div 
            className={`w-16 h-16 rounded-full bg-cyan-400/20 blur-lg transition-transform duration-500 ${
              isThinking ? 'scale-150 bg-purple-500/30' : 'animate-ping'
            }`}
          />
          
          {/* Ícone/Mascote Central Suave */}
          <span className="relative z-10 text-2xl font-mono text-white/80 tracking-tighter font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
            prompt
          </span>
        </div>
      </div>

    </div>
  );
}