import type { Project } from '../data/projects';
import { escapeHtml } from '../utils/escapeHtml';
import { renderIcon } from './Icon';
import { renderProjectImage, renderProjectLinks } from './ProjectCard';
import { renderTagList } from './TagList';
import { readMotionSettings, reducedMotionQuery } from '../motion/settings';
import { revealTargetEvent } from '../utils/anchorNavigation';

export function renderProjectList(projects: Project[]): string {
  return `<ul class="project-list" data-stagger>${projects
    .map(
      (project) => `<li data-reveal>
    <details class="project-list__item" id="project-${escapeHtml(project.id)}">
      <summary>
        <span class="project-list__year">${escapeHtml(project.year)}</span>
        <span class="project-list__name">${escapeHtml(project.title)}</span>
        <span class="project-list__category">${escapeHtml(project.category)}</span>
        <span class="disclosure-icon">${renderIcon('plus')}</span>
      </summary>
      <div class="project-list__panel">
        <div class="project-list__details">
        <p>${escapeHtml(project.summary)}</p>
        <p>${escapeHtml(project.contribution)}</p>
        ${renderTagList(project.technologies)}
        ${project.note ? `<p class="project-list__note">${escapeHtml(project.note)}</p>` : ''}
        ${project.image ? `<div class="project-list__image">${renderProjectImage(project.image)}</div>` : ''}
        ${renderProjectLinks(project)}
        </div>
      </div>
    </details>
  </li>`,
    )
    .join('')}</ul>`;
}

function initializeProjectDisclosure(details: HTMLDetailsElement): () => void {
  const summary = details.querySelector<HTMLElement>('summary');
  const panel = details.querySelector<HTMLElement>('.project-list__panel');
  const content = details.querySelector<HTMLElement>('.project-list__details');
  const indicator = summary?.querySelector<SVGElement>('.disclosure-icon .icon');
  if (!summary || !panel || !content || !indicator) return () => {};

  const events = new AbortController();
  const preference = window.matchMedia(reducedMotionQuery);
  let expanded = details.open;
  let animations: Animation[] = [];
  let contentHeight = content.getBoundingClientRect().height;

  const syncAccessibility = () => {
    if (!expanded && panel.contains(document.activeElement)) summary.focus({ preventScroll: true });
    summary.setAttribute('aria-expanded', String(expanded));
    panel.inert = !expanded;
    panel.setAttribute('aria-hidden', String(!expanded));
  };

  const settle = () => {
    animations.forEach((animation) => animation.cancel());
    animations = [];
    details.open = expanded;
    panel.style.removeProperty('overflow');
    syncAccessibility();
  };

  const setExpanded = (open: boolean) => {
    const { menu: duration, distance, easing } = readMotionSettings(details);
    // Capture the painted position before cancelling, so a second click can reverse it.
    const fromHeight = details.open ? panel.getBoundingClientRect().height : 0;
    const fromOpacity = details.open ? getComputedStyle(content).opacity : '0';
    const fromTransform = details.open
      ? getComputedStyle(content).transform
      : `translateY(${distance}px)`;
    const fromIndicator = getComputedStyle(indicator).transform;
    animations.forEach((animation) => animation.cancel());
    animations = [];
    expanded = open;
    syncAccessibility();

    if (preference.matches || !panel.animate) {
      settle();
      return;
    }

    // Native details stays open while closing. The unpadded wrapper can reach exactly zero.
    details.open = true;
    const toHeight = expanded ? panel.getBoundingClientRect().height : 0;
    contentHeight = content.getBoundingClientRect().height;
    panel.style.overflow = 'hidden';
    const timing = { duration, easing, fill: 'both' as const };
    const heightAnimation = panel.animate(
      [{ height: `${fromHeight}px` }, { height: `${toHeight}px` }],
      timing,
    );
    animations = [
      heightAnimation,
      content.animate(
        [
          { opacity: fromOpacity, transform: fromTransform },
          { opacity: expanded ? '1' : '0', transform: `translateY(${expanded ? 0 : distance}px)` },
        ],
        timing,
      ),
      indicator.animate(
        [{ transform: fromIndicator }, { transform: `rotate(${expanded ? 45 : 0}deg)` }],
        timing,
      ),
    ];
    heightAnimation.onfinish = () => {
      if (animations[0] === heightAnimation) settle();
    };
  };

  summary.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      if (!animations.length) expanded = details.open;
      setExpanded(!expanded);
    },
    { signal: events.signal },
  );
  details.addEventListener(
    'toggle',
    () => {
      if (animations.length && details.open) return;
      // Keep programmatic changes and bookmarked project links native and immediate.
      expanded = details.open;
      settle();
    },
    { signal: events.signal },
  );
  preference.addEventListener('change', settle, { signal: events.signal });
  details.addEventListener(
    revealTargetEvent,
    () => {
      expanded = true;
      settle();
    },
    { signal: events.signal },
  );

  const observer =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          const nextHeight = content.getBoundingClientRect().height;
          const changed = Math.abs(nextHeight - contentHeight) > 0.5;
          contentHeight = nextHeight;
          if (changed && animations.length) setExpanded(expanded);
        });
  observer?.observe(content);
  syncAccessibility();

  return () => {
    events.abort();
    observer?.disconnect();
    settle();
  };
}

export function initializeProjectList(): () => void {
  const cleanups = Array.from(
    document.querySelectorAll<HTMLDetailsElement>('.more-projects .project-list__item'),
    initializeProjectDisclosure,
  );
  return () => cleanups.forEach((cleanup) => cleanup());
}
