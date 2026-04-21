import { useEffect, useRef } from "react";

function resolveCanvasColor(alpha: number) {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue("--landing-canvas-rgb").trim() || "17 17 17";
  const normalized = rgb.replace(/\s+/g, ", ");
  return `rgba(${normalized}, ${alpha})`;
}

export function AnimatedTetrahedron() {
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

    const vertices = [
      { x: 0, y: 1, z: 0 },
      { x: -0.943, y: -0.333, z: -0.5 },
      { x: 0.943, y: -0.333, z: -0.5 },
      { x: 0, y: -0.333, z: 1 }
    ];

    const edges = [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [2, 3],
      [3, 1]
    ] as const;

    const faces = [
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 1],
      [1, 3, 2]
    ] as const;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const rotateY = (point: { x: number; y: number; z: number }, angle: number) => ({
      x: point.x * Math.cos(angle) - point.z * Math.sin(angle),
      y: point.y,
      z: point.x * Math.sin(angle) + point.z * Math.cos(angle)
    });

    const rotateX = (point: { x: number; y: number; z: number }, angle: number) => ({
      x: point.x,
      y: point.y * Math.cos(angle) - point.z * Math.sin(angle),
      z: point.y * Math.sin(angle) + point.z * Math.cos(angle)
    });

    const rotateZ = (point: { x: number; y: number; z: number }, angle: number) => ({
      x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
      y: point.x * Math.sin(angle) + point.y * Math.cos(angle),
      z: point.z
    });

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const scale = Math.min(rect.width, rect.height) * 0.7;

      ctx.font = "18px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const points: Array<{ x: number; y: number; z: number; char: string }> = [];

      edges.forEach(([startIndex, endIndex]) => {
        const start = vertices[startIndex];
        const end = vertices[endIndex];

        for (let t = 0; t <= 1; t += 0.05) {
          let point = {
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t,
            z: start.z + (end.z - start.z) * t
          };

          point = rotateY(point, time * 0.4);
          point = rotateX(point, time * 0.3);
          point = rotateZ(point, time * 0.2);

          const depth = (point.z + 1.5) / 3;
          const charIndex = Math.max(0, Math.min(chars.length - 1, Math.floor(depth * (chars.length - 1))));

          points.push({
            x: centerX + point.x * scale,
            y: centerY - point.y * scale,
            z: point.z,
            char: chars[charIndex]
          });
        }
      });

      faces.forEach(([firstIndex, secondIndex, thirdIndex]) => {
        const first = vertices[firstIndex];
        const second = vertices[secondIndex];
        const third = vertices[thirdIndex];

        for (let u = 0; u <= 1; u += 0.12) {
          for (let v = 0; v <= 1 - u; v += 0.12) {
            const w = 1 - u - v;
            let point = {
              x: first.x * u + second.x * v + third.x * w,
              y: first.y * u + second.y * v + third.y * w,
              z: first.z * u + second.z * v + third.z * w
            };

            point = rotateY(point, time * 0.4);
            point = rotateX(point, time * 0.3);
            point = rotateZ(point, time * 0.2);

            const depth = (point.z + 1.5) / 3;
            const charIndex = Math.max(0, Math.min(chars.length - 1, Math.floor(depth * (chars.length - 1))));

            points.push({
              x: centerX + point.x * scale,
              y: centerY - point.y * scale,
              z: point.z,
              char: chars[charIndex]
            });
          }
        }
      });

      points.sort((a, b) => a.z - b.z);

      points.forEach((point) => {
        const alpha = 0.15 + (point.z + 1.5) * 0.25;
        ctx.fillStyle = resolveCanvasColor(Math.min(alpha, 0.9));
        ctx.fillText(point.char, point.x, point.y);
      });

      time += reduceMotion ? 0.003 : 0.015;
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
