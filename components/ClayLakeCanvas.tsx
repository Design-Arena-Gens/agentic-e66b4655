"use client";

import { useEffect, useRef } from 'react';

// Timing helpers for a seamless loop
const LOOP_SECONDS = 12; // total duration for full sequence

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// Pseudo-noise using layered sines for clay-like texture
function ringTexture(x: number, y: number, scale: number, intensity = 0.15) {
  const r = Math.sqrt(x * x + y * y) * scale;
  const rings = Math.sin(r * 2.8) * 0.5 + Math.sin(r * 5.1 + 1.3) * 0.3;
  return rings * intensity;
}

function hash(n: number) {
  const x = Math.sin(n) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export default function ClayLakeCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.className = 'canvas-root';
    const parent = ref.current!;
    parent.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    // Precompute mountain silhouettes
    const mountainLayers = [
      { color: '#f6dfe2', seed: 11, baseY: 0.62, amp: 0.06 },
      { color: '#e6d8f1', seed: 29, baseY: 0.58, amp: 0.08 },
      { color: '#d7e9f5', seed: 47, baseY: 0.54, amp: 0.10 },
    ];

    function mountainY(nx: number, baseY: number, amp: number, seed: number) {
      // Smooth pastel hills
      const w1 = Math.sin(nx * 2.3 + seed * 0.1);
      const w2 = Math.sin(nx * 4.7 + seed * 0.23) * 0.4;
      const w3 = Math.sin(nx * 9.1 + seed * 0.47) * 0.2;
      return baseY - amp * (w1 * 0.6 + w2 * 0.3 + w3 * 0.1);
    }

    function drawMountains() {
      for (const layer of mountainLayers) {
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.moveTo(0, height);
        const steps = 200;
        for (let i = 0; i <= steps; i++) {
          const nx = i / steps;
          const y = mountainY(nx, layer.baseY, layer.amp, layer.seed) * height;
          const x = nx * width;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
      }
    }

    function drawSkyAndSun(tNorm: number) {
      // Morning light gradient
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, '#fff3ea');
      g.addColorStop(0.4, '#fdf7f4');
      g.addColorStop(1, '#f3efe8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      // Sun with subtle haze
      const sunX = width * 0.25;
      const sunY = height * 0.18;
      const radius = Math.min(width, height) * 0.08;
      const grad = ctx.createRadialGradient(sunX, sunY, radius * 0.1, sunX, sunY, radius * 2.0);
      grad.addColorStop(0, 'rgba(255, 230, 180, 0.9)');
      grad.addColorStop(0.4, 'rgba(255, 210, 150, 0.6)');
      grad.addColorStop(1, 'rgba(255, 200, 140, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, radius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Very faint sky texture to emulate clay backdrop
      ctx.save();
      ctx.globalAlpha = 0.12;
      for (let y = 0; y < height; y += 4) {
        const yy = y / height - 0.5;
        const offset = Math.sin(yy * 6.0 + tNorm * Math.PI * 2) * 4;
        ctx.fillStyle = '#fff7f1';
        ctx.fillRect(offset, y, width, 1);
      }
      ctx.restore();
    }

    function drawWater(tNorm: number) {
      // Lake body
      const waterTop = height * 0.62;
      const g = ctx.createLinearGradient(0, waterTop - 20, 0, height);
      g.addColorStop(0, '#dfeaf4');
      g.addColorStop(1, '#c4d9e8');
      ctx.fillStyle = g;
      ctx.fillRect(0, waterTop, width, height - waterTop);

      // Soft ripples
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, waterTop, width, height - waterTop);
      ctx.clip();

      const baseA = 0.8;
      for (let i = 0; i < 20; i++) {
        const y = waterTop + i * 12;
        const amp = 5 + i * 0.2;
        const k = 0.015 + i * 0.0008;
        const phase = tNorm * Math.PI * 2 * (0.2 + i * 0.01);
        ctx.strokeStyle = `rgba(255,255,255,${0.10 + (19 - i) * 0.004})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 3) {
          const yy = y + Math.sin(x * k + phase) * amp * 0.6 + Math.sin(x * k * 0.5 + phase * 1.7) * amp * 0.3;
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }

      // Subtle clay fingerprints on the water
      ctx.globalAlpha = 0.2;
      for (let i = 0; i < 220; i++) {
        const cx = (i * 37.7) % width;
        const cy = waterTop + (i * 53.3) % (height - waterTop);
        const r = 22 + (i % 5) * 9;
        const c = ringTexture((cx - width * 0.5) / width, (cy - height * 0.75) / height, 60, 0.12);
        ctx.fillStyle = `rgba(255,255,255,${0.05 + c * 0.2})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawFishAndEagle(tNorm: number) {
      // Sequencing, ensuring loop returns to exact start pose
      // Define normalized phases
      const t = tNorm;
      const waterTop = height * 0.62;
      const fishStartX = width * 0.5;
      const fishStartY = waterTop - 10; // starting pose on surface

      // Key phases
      const riseStart = 0.00, riseEnd = 0.14; // micro-rise to set mood
      const hoverEnd = 0.30; // calm before swoop
      const swoopEnd = 0.50; // eagle grabs and lifts
      const struggleEnd = 0.66; // fish wiggles, slips
      const fallEnd = 0.80; // fish falls back to water
      const underwaterEnd = 0.90; // brief underwater
      const resetEnd = 1.00; // same pose as t=0

      // Fish trajectory and deformation
      let fishX = fishStartX;
      let fishY = fishStartY;
      let fishScaleX = 1.0;
      let fishScaleY = 1.0;
      let fishRotation = 0;
      let fishVisible = true;

      // Eagle state
      let eagleVisible = false;
      let eagleX = width * 0.5;
      let eagleY = height * -0.12; // from above
      let eagleRotation = 0.4; // radians

      if (t < riseEnd) {
        const k = easeInOutQuad((t - riseStart) / (riseEnd - riseStart));
        fishY = fishStartY - k * 16; // rises slightly
        fishScaleX = 1.02 - k * 0.04;
        fishScaleY = 0.98 + k * 0.04;
      } else if (t < hoverEnd) {
        const k = (t - riseEnd) / (hoverEnd - riseEnd);
        fishY = fishStartY - 16 + Math.sin(k * Math.PI * 2) * 2;
      } else if (t < swoopEnd) {
        // Eagle swoops in and grabs fish
        const k = (t - hoverEnd) / (swoopEnd - hoverEnd);
        eagleVisible = true;
        const swoopEase = easeInOutQuad(k);
        eagleX = width * (0.1 + 0.8 * swoopEase);
        eagleY = height * (-0.15 + 0.55 * swoopEase);
        eagleRotation = 0.6 - 0.9 * swoopEase;

        // Fish gets lifted slightly as claws grab
        fishY = fishStartY - 16 - smoothstep(0.6, 1.0, k) * 50;
        fishScaleX = 1.0 + Math.sin(k * 18) * 0.07;
        fishScaleY = 1.0 - Math.sin(k * 18) * 0.07;
        fishRotation = Math.sin(k * 6) * 0.15;
      } else if (t < struggleEnd) {
        // Eagle holding fish, struggling oscillation
        const k = (t - swoopEnd) / (struggleEnd - swoopEnd);
        eagleVisible = true;
        eagleX = width * 0.9 - k * width * 0.15;
        eagleY = height * 0.4 - Math.sin(k * 6) * 10;
        eagleRotation = -0.3 + Math.sin(k * 8) * 0.08;

        fishY = height * 0.40 + Math.sin(k * 16) * 12;
        fishX = eagleX - 20;
        fishScaleX = 1.0 + Math.sin(k * 24) * 0.12;
        fishScaleY = 1.0 - Math.sin(k * 24) * 0.12;
        fishRotation = Math.sin(k * 20) * 0.45;
      } else if (t < fallEnd) {
        // Fish slips free and falls
        const k = (t - struggleEnd) / (fallEnd - struggleEnd);
        eagleVisible = true;
        eagleX = width * 0.75 - k * width * 0.05;
        eagleY = height * 0.35 - Math.sin(k * 10) * 6;
        eagleRotation = -0.2;

        const fallEase = k * k; // accelerate downwards
        fishVisible = true;
        fishX = width * 0.55 + Math.sin(k * 10) * 14;
        fishY = height * 0.40 + fallEase * (waterTop - height * 0.40);
        fishScaleX = 1.0 + Math.sin(k * 30) * 0.10;
        fishScaleY = 1.0 - Math.sin(k * 30) * 0.10;
        fishRotation = 0.6 + Math.sin(k * 18) * 0.25;
      } else if (t < underwaterEnd) {
        // Splash and disappear underwater
        const k = (t - fallEnd) / (underwaterEnd - fallEnd);
        fishVisible = k < 0.15; // quick splash visible
        fishY = waterTop + 20 * k;
      } else if (t <= resetEnd) {
        // Reset to initial pose for perfect loop
        const k = (t - underwaterEnd) / (resetEnd - underwaterEnd);
        fishVisible = true;
        const backEase = easeInOutQuad(1 - k);
        fishX = fishStartX;
        fishY = fishStartY - backEase * 0; // exactly same as first frame
        fishScaleX = 1.0;
        fishScaleY = 1.0;
        fishRotation = 0;
      }

      // Draw fish
      if (fishVisible) {
        drawFish(ctx, fishX, fishY, fishScaleX, fishScaleY, fishRotation);
        // Surface ripples from fish
        drawFishRipples(ctx, fishX, waterTop, (t * 7) % 1);
      }

      // Draw eagle last to overlap as needed
      if (eagleVisible) {
        drawEagle(ctx, eagleX, eagleY, eagleRotation);
      }
    }

    function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, rot: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(sx, sy);

      // Body
      const bodyW = Math.min(width, height) * 0.10;
      const bodyH = bodyW * 0.72;
      const grd = ctx.createRadialGradient(0, 0, bodyW * 0.2, 0, 0, bodyW);
      grd.addColorStop(0, '#ffb2a6');
      grd.addColorStop(1, '#ff6f61');
      ctx.fillStyle = grd;
      roundedOval(ctx, -bodyW * 0.5, -bodyH * 0.5, bodyW, bodyH, bodyH * 0.5);
      ctx.fill();

      // Tail
      ctx.fillStyle = '#ffa07a';
      ctx.beginPath();
      ctx.moveTo(bodyW * 0.45, 0);
      ctx.quadraticCurveTo(bodyW * 0.70, -bodyH * 0.65, bodyW * 0.95, 0);
      ctx.quadraticCurveTo(bodyW * 0.70, bodyH * 0.65, bodyW * 0.45, 0);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-bodyW * 0.18, -bodyH * 0.10, bodyH * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(-bodyW * 0.15, -bodyH * 0.10, bodyH * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Fingerprint-like rings on body
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 50; i++) {
        const dx = -bodyW * 0.1 + ((i * 17.3) % (bodyW * 0.6)) - bodyW * 0.3;
        const dy = ((i * 9.7) % (bodyH * 0.8)) - bodyH * 0.4;
        const n = ringTexture(dx / bodyW, dy / bodyH, 30, 0.6);
        ctx.fillStyle = `rgba(255,255,255,${0.08 + n * 0.15})`;
        ctx.beginPath();
        ctx.ellipse(dx, dy, bodyW * 0.22, bodyH * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Mouth
      ctx.strokeStyle = '#9b3c31';
      ctx.lineWidth = Math.max(1, bodyW * 0.03);
      ctx.beginPath();
      ctx.arc(-bodyW * 0.28, bodyH * 0.05, bodyH * 0.09, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();

      ctx.restore();
    }

    function roundedOval(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      const k = 0.552284749831; // circle approximation
      const rx = Math.min(r, w / 2);
      const ry = Math.min(r, h / 2);
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.bezierCurveTo(cx + k * rx, y, x + w, cy - k * ry, x + w, cy);
      ctx.bezierCurveTo(x + w, cy + k * ry, cx + k * rx, y + h, cx, y + h);
      ctx.bezierCurveTo(cx - k * rx, y + h, x, cy + k * ry, x, cy);
      ctx.bezierCurveTo(x, cy - k * ry, cx - k * rx, y, cx, y);
      ctx.closePath();
    }

    function drawEagle(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);

      const size = Math.min(width, height) * 0.14;
      // Body
      ctx.fillStyle = '#caa98a';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.40, size * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#eee7df';
      ctx.beginPath();
      ctx.ellipse(-size * 0.28, -size * 0.06, size * 0.18, size * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#f1b84a';
      ctx.beginPath();
      ctx.moveTo(-size * 0.42, -size * 0.04);
      ctx.quadraticCurveTo(-size * 0.60, 0, -size * 0.42, size * 0.05);
      ctx.quadraticCurveTo(-size * 0.36, 0, -size * 0.42, -size * 0.04);
      ctx.closePath();
      ctx.fill();

      // Wing (left)
      ctx.fillStyle = '#b88f72';
      ctx.beginPath();
      ctx.moveTo(-size * 0.05, -size * 0.06);
      ctx.quadraticCurveTo(size * 0.25, -size * 0.40, size * 0.55, -size * 0.12);
      ctx.quadraticCurveTo(size * 0.25, -size * 0.06, -size * 0.05, -size * 0.06);
      ctx.closePath();
      ctx.fill();

      // Wing (right)
      ctx.beginPath();
      ctx.moveTo(-size * 0.00, size * 0.02);
      ctx.quadraticCurveTo(size * 0.28, size * 0.34, size * 0.60, size * 0.10);
      ctx.quadraticCurveTo(size * 0.30, size * 0.02, -size * 0.00, size * 0.02);
      ctx.closePath();
      ctx.fill();

      // Clay feather texture
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < 60; i++) {
        const ang = (i / 60) * Math.PI * 2;
        const rx = Math.cos(ang) * size * 0.30;
        const ry = Math.sin(ang) * size * 0.22;
        const n = ringTexture(rx / size, ry / size, 25, 0.5);
        ctx.fillStyle = `rgba(255,255,255,${0.06 + n * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(rx * 0.5, ry * 0.2, size * 0.10, size * 0.05, ang * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Talons
      ctx.fillStyle = '#e0a84a';
      for (let j = 0; j < 2; j++) {
        ctx.beginPath();
        const ox = j === 0 ? size * 0.10 : size * 0.16;
        const oy = size * 0.12;
        ctx.ellipse(ox, oy, size * 0.05, size * 0.03, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function drawFishRipples(ctx: CanvasRenderingContext2D, x: number, waterTop: number, phase: number) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, waterTop - 4, width, height - waterTop + 4);
      ctx.clip();

      for (let i = 0; i < 4; i++) {
        const k = (i + phase) / 4;
        const r = 12 + i * 10 + Math.sin(phase * Math.PI * 2) * 1.5;
        const a = 0.30 - i * 0.06;
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(x, waterTop + 2, r * 2.0, r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function renderFrame(timeMs: number) {
      const tNorm = ((timeMs / 1000) % LOOP_SECONDS) / LOOP_SECONDS;
      // Clear
      ctx.clearRect(0, 0, width, height);

      // Sky
      drawSkyAndSun(tNorm);

      // Mountains
      drawMountains();

      // Water
      drawWater(tNorm);

      // Characters
      drawFishAndEagle(tNorm);

      rafRef.current = requestAnimationFrame(renderFrame);
    }

    rafRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      parent.removeChild(canvas);
    };
  }, []);

  return <div ref={ref} className="canvas-root" />;
}
