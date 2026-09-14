import { portfolio, socialLinks } from '../data/portfolio';
import { escapeHtml } from '../utils/escapeHtml';
import { renderExternalLink } from './Link';
import { renderIcon } from './Icon';

export function renderFooter(): string {
  return `<footer class="site-footer container" data-reveal>
    <p>© ${new Date().getFullYear()} ${escapeHtml(portfolio.name)}<span class="footer-divider" aria-hidden="true">/</span>Built with curiosity.</p>
    <nav aria-label="Social links">${socialLinks.map((link) => renderExternalLink(link)).join('')}</nav>
    <a class="back-to-top" href="#home">Back to top ${renderIcon('arrowUpRight')}</a>
  </footer>`;
}
