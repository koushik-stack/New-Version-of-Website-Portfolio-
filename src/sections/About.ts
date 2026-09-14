import { portfolio } from '../data/portfolio';
import { escapeHtml } from '../utils/escapeHtml';
import { renderSectionHeading } from '../components/SectionHeading';
import { renderIcon } from '../components/Icon';

export function renderAbout(): string {
  return `<section class="about section container" id="about" aria-labelledby="about-heading" tabindex="-1">
    <span class="anchor-alias" id="aboutMe" aria-hidden="true"></span>
    ${renderSectionHeading('', 'A little about me', 'about-heading')}
    <div class="about__grid" data-stagger>
      <div class="about__copy" data-reveal>${portfolio.about.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div>
      <aside class="about__toolkit" aria-labelledby="toolkit-heading" data-reveal>
        <span class="about__toolkit-icon" aria-hidden="true">${renderIcon('code')}</span>
        <p class="eyebrow">Tools of the trade</p>
        <h3 id="toolkit-heading">A few things I work with.</h3>
        <ul class="skill-list">${portfolio.skills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join('')}</ul>
      </aside>
    </div>
  </section>`;
}
