import { portfolio, socialLinks } from '../data/portfolio';
import { escapeHtml } from '../utils/escapeHtml';
import { renderSectionHeading } from '../components/SectionHeading';
import { renderExternalLink, renderResumeLink } from '../components/Link';

export function renderContact(): string {
  return `<section class="contact section container" id="contact" aria-labelledby="contact-heading" tabindex="-1">
    ${renderSectionHeading('04', 'What’s next?', 'contact-heading')}
    <div class="contact__body" data-reveal>
      <p class="contact__headline">${escapeHtml(portfolio.contact.heading)}</p>
      <p class="contact__description">${escapeHtml(portfolio.contact.description)}</p>
      ${renderExternalLink(portfolio.contact, 'button button--primary')}
      <div class="contact__elsewhere"><span>Elsewhere on the internet</span>
        ${socialLinks
          .filter((link) => link.href !== portfolio.contact.href)
          .map((link) => renderExternalLink(link))
          .join('')}
        ${renderResumeLink(portfolio.resume)}
      </div>
    </div>
  </section>`;
}
