import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  color: string;
  size: number;
  life: number;
  gravity: number;
}

interface ConfettiBurstProps {
  trigger: boolean;
  particleCount?: number;
  duration?: number;
  colors?: string[];
  className?: string;
}

/**
 * Confetti Burst Component with physics simulation
 * Creates a particle explosion on sale completion
 */
export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  trigger,
  particleCount = 150,
  duration = 2500,
  colors = ['#166534', '#22c55e', '#bef264', '#fef3c7', '#f59e0b'],
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isBursting, setIsBursting] = useState(false);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize particles
    const particles: Particle[] = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        life: 1.0,
        gravity: 0.2 + Math.random() * 0.3
      });
    }

    particlesRef.current = particles;
    setIsBursting(true);

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        setIsBursting(false);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.rotation += 2;
        p.life -= 0.008;

        if (p.life <= 0) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      setIsBursting(false);
    };
  }, [trigger, particleCount, duration, colors]);

  if (!isBursting) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    />
  );
};

export default ConfettiBurst;