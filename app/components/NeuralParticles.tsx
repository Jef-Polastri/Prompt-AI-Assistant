'use client';

import { useEffect, useRef } from 'react';

interface NeuralParticlesProps {
  isActive: boolean;
}

export default function NeuralParticles({ isActive }: NeuralParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = 320);
    let height = (canvas.height = 180);

    // Partículas
    const particleCount = 45;
    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (isActive ? 1.8 : 0.6),
        vy: (Math.random() - 0.5) * (isActive ? 1.8 : 0.6),
        radius: Math.random() * 1.8 + 1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Atualiza posições e desenha pontos brancos
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        p.x += p.vx * (isActive ? 1.5 : 0.8);
        p.y += p.vy * (isActive ? 1.5 : 0.8);

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Conecta linhas entre partículas próximas (Efeito Plexus / Constelação)
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 48) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${1 - dist / 48})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="w-72 h-44 transition-opacity duration-300"
    />
  );
}