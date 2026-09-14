import { renderHeroGraphic } from '../components/HeroGraphic';
import { portfolio } from '../data/portfolio';
import { escapeHtml } from '../utils/escapeHtml';
import { renderIcon } from '../components/Icon';
import { renderResumeLink } from '../components/Link';

export function renderHero(): string {
  return `<section class="hero container" id="home" aria-labelledby="hero-heading" tabindex="-1">
    <div class="hero__body">
      <div class="hero__content">
        <p class="eyebrow hero__eyebrow"><span aria-hidden="true"></span>${escapeHtml(portfolio.eyebrow)}</p>
        <h1 id="hero-heading" data-hero-enter>Hi, I’m<br><span>${escapeHtml(portfolio.name)}.</span></h1>
        <p class="hero__headline" data-hero-enter>${escapeHtml(portfolio.headline)}</p>
        <p class="hero__description" data-hero-enter>${escapeHtml(portfolio.introduction)}</p>
        <div class="hero__actions" data-hero-enter>
          <a class="button button--primary" href="#projects">View projects ${renderIcon('arrowRight')}</a>
          <a class="button button--outline" href="#contact">Contact me ${renderIcon('arrowUpRight')}</a>
          ${renderResumeLink(portfolio.resume)}
        </div>
      </div>
      ${renderHeroGraphic()}
    </div>
    <div class="hero__footer">
      <p>${escapeHtml(portfolio.role)}<span aria-hidden="true">/</span>Machine learning & the web</p>
      <a href="#about">A little more about me ${renderIcon('arrowDown')}</a>
    </div>
  </section>`;
}
