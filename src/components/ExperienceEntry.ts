import type { Experience } from '../data/experience';
import { escapeHtml } from '../utils/escapeHtml';
import { renderTagList } from './TagList';

export function renderExperienceEntry(entry: Experience, index: number, expanded = false): string {
  const id = `experience-entry-${index}`;

  return `<li class="experience-entry" data-reveal>
    <div class="experience-entry__period"><span aria-hidden="true"></span>${escapeHtml(entry.period)}</div>
    <div class="experience-entry__body">
      <h3>
        <button class="experience-entry__toggle" type="button" id="${id}-toggle"
          aria-expanded="${expanded}" aria-controls="${id}-details">
          <span>${escapeHtml(entry.company)}</span>
          <svg class="experience-entry__chevron" viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </h3>
      <p class="experience-entry__role">${escapeHtml(entry.role)}</p>
      <div class="experience-entry__details" id="${id}-details" role="region"
        aria-labelledby="${id}-toggle" aria-hidden="${!expanded}"${expanded ? '' : ' inert'}>
        <div class="experience-entry__content">
          <ul class="experience-entry__description">${entry.description
            .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
            .join('')}</ul>
          ${renderTagList(entry.focus)}
        </div>
      </div>
    </div>
  </li>`;
}

export function initializeExperienceEntry(entry: HTMLElement): () => void {
  const toggle = entry.querySelector<HTMLButtonElement>('.experience-entry__toggle');
  const details = entry.querySelector<HTMLElement>('.experience-entry__details');
  if (!toggle || !details) return () => {};

  const onToggle = () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    if (!expanded && details.contains(document.activeElement)) toggle.focus();
    toggle.setAttribute('aria-expanded', String(expanded));
    details.inert = !expanded;
    details.setAttribute('aria-hidden', String(!expanded));
  };

  toggle.addEventListener('click', onToggle);
  return () => toggle.removeEventListener('click', onToggle);
}
