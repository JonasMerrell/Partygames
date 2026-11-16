// Glitch Squad phone client: CRT Terminal styling and Secret Glitch detection
import { CSS } from './crt.js';

export default function (ctx) {
  if (!document.getElementById('glitch-squad-css')) {
    document.head.append(Object.assign(document.createElement('style'), { id: 'glitch-squad-css', textContent: CSS }));
  }
  document.body.classList.add('gs-crt', 'gs-paper');

  // Intercept views to detect Glitch identity and apply HUD tearing
  if (ctx && typeof ctx.on === 'function') {
    ctx.on('view', (v) => {
      const isGlitch = Boolean(v?.title?.includes('GLITCH') || v?.color === '#7b3fe4');
      document.body.classList.toggle('gs-glitch-mode', isGlitch);
      ctx.renderView(v);

      // Terminal input enhancements
      const input = ctx.el?.querySelector('input, textarea');
      if (input) {
        input.setAttribute('spellcheck', 'false');
        input.setAttribute('autocomplete', 'off');
      }
    });
  }
}
