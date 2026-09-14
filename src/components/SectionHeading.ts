import { escapeHtml } from '../utils/escapeHtml';

export function renderSectionHeading(number: string, title: string, id: string): string {
  return `<div class="section-heading" data-reveal>
    <span class="section-number" aria-hidden="true">${escapeHtml(number)} /</span>
    <h2 id="${escapeHtml(id)}">${escapeHtml(title)}</h2>
    <span class="section-heading__line" aria-hidden="true"></span>
  </div>`;
}
