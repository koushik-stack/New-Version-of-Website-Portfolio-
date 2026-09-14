import { hardware } from '../data/hardware';
import { escapeHtml } from '../utils/escapeHtml';
import { renderIcon } from '../components/Icon';

export function renderHardware(): string {
  return `<section class="notes-panel" id="hardware" aria-labelledby="hardware-heading" tabindex="-1" data-reveal>
    <div class="notes-panel__heading">${renderIcon('monitor')}<h3 id="hardware-heading">Behind the screen</h3></div>
    <p class="hardware__intro">The setup that powers my development, machine learning experiments, and gaming.</p>
    <details class="hardware-details">
      <summary>Explore my setup <span class="disclosure-icon">${renderIcon('plus')}</span></summary>
      <div>${hardware
        .map(
          (group) => `<h4>${escapeHtml(group.title)}</h4><dl>
        ${group.items.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}
      </dl>`,
        )
        .join('')}</div>
    </details>
  </section>`;
}
