import {
  createWireframeLines,
  linePath,
  nodePoint,
  travellingNodes,
} from '../graphics/wireframeGeometry';
import { wireframeSettings } from '../graphics/wireframeSettings';
import { renderIcon } from './Icon';

export function renderHeroGraphic(): string {
  const density = wireframeSettings.desktop;
  return `<div class="hero-graphic" data-hero-graphic>
    <div class="hero-graphic__label"><span class="status-dot" aria-hidden="true"></span>Always connecting the dots</div>
    <svg class="hero-graphic__surface" viewBox="0 0 520 500" width="520" height="500" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="signal-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.7" fill="#7290a5" opacity=".23"/></pattern>
        <radialGradient id="signal-light"><stop stop-color="#78e6c3" stop-opacity=".065"/><stop offset="1" stop-color="#78e6c3" stop-opacity="0"/></radialGradient>
      </defs>
      <rect x="40" y="44" width="440" height="404" fill="url(#signal-dots)"/>
      <ellipse cx="260" cy="270" rx="225" ry="210" fill="url(#signal-light)"/>
      <ellipse cx="260" cy="250" rx="202" ry="104" transform="rotate(-37 260 250)" stroke="#75b9aa" stroke-opacity=".23" stroke-dasharray="3 7"/>
      <g class="hero-graphic__grid" stroke="#6ddcbb" stroke-width=".9" stroke-linejoin="round">${createWireframeLines(
        density,
      )
        .map(
          (line) =>
            `<path d="${linePath(line, density.samples)}" opacity="${line.opacity.toFixed(2)}"/>`,
        )
        .join('')}</g>
      <g class="hero-graphic__nodes">${travellingNodes
        .map((node) => {
          const point = nodePoint(node);
          return `<g transform="translate(${point.x} ${point.y})"><circle r="8" fill="#78e6c3" opacity=".07"/><circle r="4.5" fill="#78e6c3" opacity=".14"/><circle r="2" fill="#b2f7df"/></g>`;
        })
        .join('')}</g>
      <g class="hero-graphic__marker" stroke="#6ddcbb" stroke-opacity=".6"><path d="M64 89h14m-7-7v14"/></g>
      <g class="hero-graphic__marker" stroke="#6ddcbb" stroke-opacity=".6"><path d="M442 405h14m-7-7v14"/></g>
      <g class="hero-graphic__marker">
        <path d="M396 106V75h-45" stroke="#6ddcbb" stroke-opacity=".35"/>
        <circle cx="396" cy="117" r="15" fill="#78e6c3" opacity=".035"/>
        <circle cx="396" cy="117" r="10" stroke="#78e6c3" stroke-opacity=".25"/>
        <circle class="hero-graphic__point" cx="396" cy="117" r="3.5" fill="#91efd0"/>
      </g>
      <g class="hero-graphic__marker">
        <path d="M105 365v37h43" stroke="#6ddcbb" stroke-opacity=".35"/>
        <circle class="hero-graphic__point" cx="104" cy="354" r="3" fill="#78e6c3"/>
      </g>
      <circle class="hero-graphic__point" cx="414" cy="322" r="2" fill="#78e6c3" opacity=".6"/>
    </svg>
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
