import type { Resume, SocialLink } from '../data/portfolio';
import { escapeHtml } from '../utils/escapeHtml';
import { renderIcon } from './Icon';

export function renderExternalLink(
  link: SocialLink,
  className = 'text-link',
  context = '',
): string {
  const accessibleName = context ? `${link.label}: ${context}` : link.label;

  return `<a class="${className}" href="${escapeHtml(link.href)}"
    target="_blank" rel="noopener noreferrer"
    aria-label="${escapeHtml(accessibleName)} (opens in a new tab)">
    ${escapeHtml(link.label)} ${renderIcon('arrowUpRight')}
  </a>`;
}

export function renderResumeLink(resume: Resume | null): string {
  if (!resume) return '';
  return renderExternalLink(resume, 'text-link resume-link');
}
