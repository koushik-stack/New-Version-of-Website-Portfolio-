import type { Project, ProjectImage } from '../data/projects';
import { escapeHtml } from '../utils/escapeHtml';
import { renderIcon } from './Icon';
import { renderExternalLink } from './Link';
import { renderTagList } from './TagList';

export function renderProjectImage(image: ProjectImage): string {
  return `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}"
    width="${image.width}" height="${image.height}" loading="lazy" decoding="async" />`;
}

function renderProjectMedia(project: Project): string {
  if (project.image) {
    return `<div class="project-card__image">${renderProjectImage(project.image)}</div>`;
  }
  if (project.diagram === 'interpreter') {
    return `<div class="interpreter-diagram" role="img" aria-label="Retro-Father pipeline: source code is tokenized, parsed into an abstract syntax tree, and executed by the interpreter.">
      <div class="interpreter-diagram__top"><span>${renderIcon('code')} retro-father</span><span>language / 01</span></div>
      <div class="interpreter-diagram__body" aria-hidden="true">
        <span class="interpreter-diagram__input">source code</span>
        <span class="interpreter-diagram__connector"></span>
        <div class="interpreter-diagram__steps"><span>Lexer</span>${renderIcon('arrowRight')}<span>Parser</span>${renderIcon('arrowRight')}<span>AST</span></div>
        <span class="interpreter-diagram__connector"></span>
        <span class="interpreter-diagram__output">Interpreter ${renderIcon('spark')}</span>
      </div>
      <p>Small language. Fundamental ideas.</p>
    </div>`;
  }
  return '';
}

export function renderProjectLinks(project: Project): string {
  const links = project.links.map((link) => renderExternalLink(link, 'text-link', project.title));
  if (project.image) {
    links.push(
      renderExternalLink(
        { label: 'View image', href: project.image.src },
        'text-link text-link--muted',
        project.title,
      ),
    );
  }
  if (links.length === 0) return '';
  return `<div class="project-links">${links.join('')}</div>`;
}

export function renderProjectCard(project: Project, index: number): string {
  return `<article class="project-card" id="project-${escapeHtml(project.id)}" aria-labelledby="title-${escapeHtml(project.id)}" data-reveal>
    <div class="project-card__media">${renderProjectMedia(project)}</div>
    <div class="project-card__content">
      <p class="eyebrow project-card__eyebrow"><span>Selected work / 0${index + 1}</span><span>${escapeHtml(project.year)}</span></p>
      <h3 id="title-${escapeHtml(project.id)}">${escapeHtml(project.title)}</h3>
      <p class="project-card__category">${escapeHtml(project.category)}</p>
      <p>${escapeHtml(project.summary)}</p>
      <p class="project-card__contribution"><span>My contribution</span>${escapeHtml(project.contribution)}</p>
      ${renderTagList(project.technologies)}
      ${renderProjectLinks(project)}
      ${project.note ? `<details class="project-note"><summary>What’s next ${renderIcon('plus')}</summary><p>${escapeHtml(project.note)}</p></details>` : ''}
    </div>
  </article>`;
}
