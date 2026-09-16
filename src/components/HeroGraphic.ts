import { renderIcon } from './Icon';

export function renderHeroGraphic(): string {
  return `<div class="hero-graphic" data-hero-graphic>
    <div class="hero-graphic__label"><span class="status-dot" aria-hidden="true"></span>Always connecting the dots</div>
    <canvas class="hero-graphic__surface" width="520" height="500" aria-hidden="true"></canvas>
    <div class="hero-graphic__footer">
      <span aria-hidden="true">01 — IDEAS INTO SYSTEMS</span>
      <button class="motion-toggle" type="button" aria-label="Pause decorative animation" hidden>
        <span class="motion-toggle__pause" aria-hidden="true">${renderIcon('pause')}</span>
        <span class="motion-toggle__play" aria-hidden="true" hidden>${renderIcon('play')}</span>
        <span class="motion-toggle__label">Pause motion</span>
      </button>
    </div>
  </div>`;
}
