import { useEffect, useRef } from "react";

function resolveCanvasColor(alpha: number) {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue("--landing-canvas-rgb").trim() || "17 17 17";
  const normalized = rgb.replace(/\s+/g, ", ");
  return `rgba(${normalized}, ${alpha})`;
}

export function AnimatedSphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (/jsdom/i.test(window.navigator.userAgent)) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      return;
    }
    if (!ctx) return;

    const chars = "░▒▓█▀▄▌▐│─┤├┴┬╭╮╰╯";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let time = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const radius = Math.min(rect.width, rect.height) * 0.525;

      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const points: Array<{ x: number; y: number; z: number; char: string }> = [];

      for (let phi = 0; phi < Math.PI * 2; phi += 0.15) {
        for (let theta = 0; theta < Math.PI; theta += 0.15) {
          const x = Math.sin(theta) * Math.cos(phi + time * 0.5);
          const y = Math.sin(theta) * Math.sin(phi + time * 0.5);
          const z = Math.cos(theta);

          const rotY = time * 0.3;
          const rotatedX = x * Math.cos(rotY) - z * Math.sin(rotY);
          const rotatedZ = x * Math.sin(rotY) + z * Math.cos(rotY);

          const rotX = time * 0.2;
          const rotatedY = y * Math.cos(rotX) - rotatedZ * Math.sin(rotX);
          const finalZ = y * Math.sin(rotX) + rotatedZ * Math.cos(rotX);

          const depth = (finalZ + 1) / 2;
          const charIndex = Math.max(0, Math.min(chars.length - 1, Math.floor(depth * (chars.length - 1))));

          points.push({
            x: centerX + rotatedX * radius,
            y: centerY + rotatedY * radius,
            z: finalZ,
            char: chars[charIndex]
          });
        }
      }

      points.sort((a, b) => a.z - b.z);

      points.forEach((point) => {
        const alpha = 0.2 + (point.z + 1) * 0.4;
        ctx.fillStyle = resolveCanvasColor(alpha);
        ctx.fillText(point.char, point.x, point.y);
      });

      time += reduceMotion ? 0.003 : 0.02;
      frameRef.current = window.requestAnimationFrame(render);
    };

    resize();
    render();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="landing-canvas" aria-hidden="true" />;
}
