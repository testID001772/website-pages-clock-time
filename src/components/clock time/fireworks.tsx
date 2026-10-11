import { useCallback, useEffect, useRef } from "react";

const COLORS = ["#ffd166", "#ff5c8a", "#22d3ee", "#c4b5fd", "#a3e635", "#ffffff"] as const;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
};

function reduced() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function Fireworks({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const raf = useRef(0);
  const running = useRef(false);

  const burst = useCallback((x: number, y: number) => {
    const color = COLORS[(Math.random() * COLORS.length) | 0] ?? COLORS[0];
    const count = reduced() ? 18 : 72;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 5;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.01 + Math.random() * 0.012,
        size: 1.1 + Math.random() * 2,
        color,
      });
    }
  }, []);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    const list = particles.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (!p) continue;
      p.vy += 0.06;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (running.current && Math.random() < 0.04) {
      burst(w * (0.15 + Math.random() * 0.7), h * (0.12 + Math.random() * 0.42));
    }
    if (list.length || running.current) {
      raf.current = requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
  }, [burst]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    running.current = active;
    if (active) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      burst(w * 0.3, h * 0.28);
      burst(w * 0.7, h * 0.24);
      raf.current = requestAnimationFrame(loop);
    }
    return () => {
      running.current = false;
      cancelAnimationFrame(raf.current);
    };
  }, [active, burst, loop]);

  return <canvas ref={canvasRef} className="fx" aria-hidden="true" />;
}
