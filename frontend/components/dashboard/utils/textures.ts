/**
 * Procedural texture generators for dashboard card thumbnails
 */

export function createSandTexture(w = 240, h = 160): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#a68c7a';
  ctx.fillRect(0, 0, w, h);

  const grad = ctx.createRadialGradient(w * 0.4, h * 0.3, 10, w * 0.5, h * 0.5, w * 0.8);
  grad.addColorStop(0, '#beaa99');
  grad.addColorStop(0.6, '#9c816f');
  grad.addColorStop(1, '#8c705e');
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = Math.random() * 2;
    ctx.fillStyle = Math.random() > 0.45 ? '#ffffff' : '#2d2018';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas.toDataURL();
}

export function createRustTexture(w = 240, h = 160): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#6b4736';
  ctx.fillRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#593828');
  grad.addColorStop(0.3, '#754f3b');
  grad.addColorStop(0.7, '#4c2e1f');
  grad.addColorStop(1, '#664230');
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * w;
    const width = Math.random() * 6 + 1;
    ctx.fillStyle = Math.random() > 0.5 ? '#94664f' : '#2c180e';
    ctx.fillRect(x, 0, width, h);
  }
  return canvas.toDataURL();
}

export function createMarbleTexture(w = 240, h = 160): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#bc6936';
  ctx.fillRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, h, w, 0);
  grad.addColorStop(0, '#8c3c13');
  grad.addColorStop(0.35, '#cc743e');
  grad.addColorStop(0.55, '#f0a26d');
  grad.addColorStop(0.75, '#b8602d');
  grad.addColorStop(1, '#8f4017');
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const startX = Math.random() * (w * 0.6) + w * 0.2;
    const startY = h * 0.9;
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      startX - 30 + Math.random() * 60,
      startY * 0.6,
      startX - 20 + Math.random() * 40,
      startY * 0.3,
      startX - 40 + Math.random() * 80,
      h * 0.1
    );
    ctx.lineWidth = Math.random() * 8 + 4;
    ctx.strokeStyle = 'rgba(255, 235, 215, 0.4)';
    ctx.stroke();
  }
  return canvas.toDataURL();
}
