import type { Experience } from '../data/experience';
import { escapeHtml } from '../utils/escapeHtml';
import { renderTagList } from './TagList';

export function renderExperienceEntry(entry: Experience, index: number, selected = false): string {
  const id = `experience-entry-${index}`;

  return `<div class="experience-entry${selected ? ' is-visible' : ''}" id="${id}-details"
    role="tabpanel" aria-labelledby="${id}-tab" aria-hidden="${!selected}"
    tabindex="${selected ? '0' : '-1'}"${selected ? '' : ' inert'}>
    <h3><span class="experience-entry__role">${escapeHtml(entry.role)}</span> <span class="experience-entry__company">@ ${escapeHtml(entry.company)}</span></h3>
    <p class="experience-entry__period">${escapeHtml(entry.period)}</p>
    <ul class="experience-entry__description">${entry.description
      .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
      .join('')}</ul>
    ${renderTagList(entry.focus)}
  </div>`;
}
