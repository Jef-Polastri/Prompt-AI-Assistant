'use client';

import { useEffect, useState } from 'react';

interface VoiceOrbProps {
  isSpeaking: boolean;
  isListening: boolean;
  isLoading: boolean;
}

export default function VoiceOrb({ isSpeaking, isListening, isLoading }: VoiceOrbProps) {
  const [pulseScale, setPulseScale] = useState(1);

  // Efeito de pulso/sincronização dinâmica com a voz
  useEffect(() => {
    let interval: any;
    if (isSpeaking || isListening) {
      interval = setInterval(() => {
        // Gera oscilações orgânicas parecidas com frequências de áudio
        const randomScale = 1 + Math.random() * (isSpeaking ? 0.22 : 0.12);
        setPulseScale(randomScale);
      }, 120);
    } else {
      setPulseScale(1);
    }

    return () => clearInterval(interval);
  }, [isSpeaking, isListening]);

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Brilho externo expansivo (Glow) */}
      <div
        className={`absolute inset-0 rounded-full blur-3xl transition-all duration-300 ${
          isSpeaking
            ? 'bg-gradient-to-tr from-cyan-500 via-blue-500 to-white opacity-60 scale-125'
            : isListening
            ? 'bg-gradient-to-tr from-blue-600 to-cyan-400 opacity-40 scale-105'
            : isLoading
            ? 'bg-blue-500 opacity-30 animate-pulse'
            : 'bg-blue-600 opacity-20 scale-90'
        }`}
      />

      {/* Esfera Principal Gradiente Fluid (Estilo ChatGPT) */}
      <div
        style={{
          transform: `scale(${pulseScale})`,
        }}
        className={`relative w-44 h-44 rounded-full transition-transform duration-150 ease-out shadow-2xl overflow-hidden flex items-center justify-center ${
          isLoading ? 'animate-spin' : ''
        }`}
      >
        {/* Camadas internas com degradê azul e branco fluido */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-cyan-400 to-blue-600 animate-pulse" />
        
        <div
          className={`absolute -inset-4 bg-gradient-to-r from-white via-cyan-300 to-blue-700 rounded-full blur-md opacity-80 transition-all duration-300 ${
            isSpeaking ? 'animate-spin' : 'animate-pulse'
          }`}
          style={{ animationDuration: isSpeaking ? '3s' : '6s' }}
        />

        {/* Núcleo de Luz Brilhante */}
        <div className="absolute w-24 h-24 bg-white rounded-full blur-xl opacity-90" />
      </div>
    </div>
  );
}