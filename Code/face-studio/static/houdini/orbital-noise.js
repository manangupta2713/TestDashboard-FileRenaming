class OrbitalNoise {
  static get inputProperties() {
    return ['--nebula-hue'];
  }

  paint(ctx, geom, properties) {
    const hue = Number(properties.get('--nebula-hue').toString()) || 195;
    ctx.fillStyle = '#030711';
    ctx.fillRect(0, 0, geom.width, geom.height);

    const bubbles = 18;
    for (let i = 0; i < bubbles; i++) {
      const x = Math.random() * geom.width;
      const y = Math.random() * geom.height;
      const radius = (Math.random() * geom.width) / 5;
      const alpha = 0.02 + Math.random() * 0.08;
      const localHue = hue + Math.random() * 90 - 45;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `hsla(${localHue}, 90%, 70%, ${alpha + 0.05})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

registerPaint('orbital-noise', OrbitalNoise);
