"use client";

import { useEffect, useRef } from "react";

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stars = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.1 + 0.2,
      a: Math.random() * 0.22 + 0.05,
      s: Math.random() * 0.35 + 0.08,
    }));
    let frame = 0;
    let running = true;

    const draw = () => {
      if (!running) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#12131a";
      context.fillRect(0, 0, width, height);
      for (const star of stars) {
        const twinkle = reduced ? star.a : star.a * (0.65 + 0.35 * Math.sin(frame * 0.01 * star.s + star.x * 20));
        context.fillStyle = `rgba(228, 220, 255, ${twinkle})`;
        context.beginPath();
        context.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
        context.fill();
      }
      if (!reduced) {
        frame += 1;
        requestAnimationFrame(draw);
      }
    };
    draw();
    return () => {
      running = false;
    };
  }, []);

  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}
