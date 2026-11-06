import { prefersReducedMotion } from '@/lib/motion';

const FLAME =
  '<svg viewBox="0 0 24 30" width="26" height="32"><path d="M12 1c1.5 5 8 8 8 16a8 8 0 0 1-16 0c0-4 2.5-6.5 4-9 .3 2.6 1.4 4 3 4.5C10 8 9.6 4.5 12 1z" fill="var(--color-yellow)" stroke="var(--color-ink)" stroke-width="2" stroke-linejoin="round"/></svg>';
const ANGLES = [-150, -110, -70, -30, 10];

/**
 * "Spicy!" — flashes `host` orange and bursts five flames out of it (600ms, WAAPI on a detached
 * overlay, never blocks taps). Skipped under reduced motion. `host` must be position: relative.
 */
export function spicyBurst(host: HTMLElement | null) {
  if (!host || prefersReducedMotion()) return;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText =
    'position:absolute;inset:0;pointer-events:none;z-index:5;background:var(--color-orange);opacity:0;display:grid;place-items:center;overflow:hidden;border-radius:inherit;';
  host.appendChild(layer);
  layer.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.25 }, { opacity: 0 }], {
    duration: 600,
    easing: 'ease-out',
  });
  for (const deg of ANGLES) {
    const f = document.createElement('div');
    f.style.cssText = 'grid-area:1/1;';
    f.innerHTML = FLAME;
    layer.appendChild(f);
    const rad = (deg * Math.PI) / 180;
    const [x, y] = [Math.cos(rad) * 90, Math.sin(rad) * 70];
    f.animate(
      [
        { transform: 'translate(0,0) scale(0.3)', opacity: 1 },
        { transform: `translate(${x}px,${y}px) scale(1.15) rotate(${deg / 6}deg)`, opacity: 0 },
      ],
      { duration: 600, easing: 'cubic-bezier(0.2, 1.4, 0.4, 1)', fill: 'forwards' },
    );
  }
  setTimeout(() => layer.remove(), 650);
}
