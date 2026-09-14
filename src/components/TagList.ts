import { escapeHtml } from '../utils/escapeHtml';

export function renderTagList(tags: string[]): string {
  return `<ul class="tag-list" aria-label="Technologies and focus areas">
    ${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}
  </ul>`;
}
