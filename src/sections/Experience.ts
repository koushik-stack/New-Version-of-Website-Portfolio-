import { experience } from '../data/experience';
import { renderSectionHeading } from '../components/SectionHeading';
import { renderExperienceEntry } from '../components/ExperienceEntry';
import { reducedMotionQuery } from '../motion/settings';
import { escapeHtml } from '../utils/escapeHtml';

export function renderExperience(): string {
  return `<section class="experience section container" id="experience" aria-labelledby="experience-heading" tabindex="-1">
    ${renderSectionHeading('02', 'Where I’ve contributed', 'experience-heading')}
    <div class="experience-layout" data-stagger>
      <div class="experience-companies" role="tablist" aria-label="Companies"
        aria-orientation="vertical" data-reveal>${experience
          .map(
            (entry, index) => `<button class="experience-tab" type="button" role="tab"
              id="experience-entry-${index}-tab" aria-controls="experience-entry-${index}-details"
              aria-selected="${index === 0}" tabindex="${index === 0 ? '0' : '-1'}">${escapeHtml(entry.company)}</button>`,
          )
          .join('')}</div>
      <div class="experience-details" data-reveal>
        <div class="experience-panels">${experience
          .map((entry, index) => renderExperienceEntry(entry, index, index === 0))
          .join('')}</div>
      </div>
    </div>
  </section>`;
}

export function initializeExperience(): () => void {
  const section = document.querySelector<HTMLElement>('#experience');
  const tablist = section?.querySelector<HTMLElement>('.experience-companies');
  const stage = section?.querySelector<HTMLElement>('.experience-panels');
  if (!section || !tablist || !stage) return () => {};

  const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(stage.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  if (!tabs.length || tabs.length !== panels.length) return () => {};

  const events = new AbortController();
  const preference = window.matchMedia(reducedMotionQuery);
  const narrow = window.matchMedia('(max-width: 767px)');
  let selectedIndex = 0;
  let visibleIndex = 0;
  let revision = 0;

  const syncAccessibility = () => {
    panels.forEach((panel, index) => {
      const selected = index === selectedIndex;
      if (!selected && panel.contains(document.activeElement)) {
        tabs[selectedIndex].focus({ preventScroll: true });
      }
      tabs[index].setAttribute('aria-selected', String(selected));
      tabs[index].tabIndex = selected ? 0 : -1;
      panel.setAttribute('aria-hidden', String(!selected));
      panel.inert = !selected;
      panel.tabIndex = selected ? 0 : -1;
    });
  };

  const settle = () => {
    revision++;
    visibleIndex = selectedIndex;
    panels.forEach((panel, index) => {
      panel.classList.toggle('is-visible', index === selectedIndex);
      panel.classList.remove('is-leaving');
    });
    stage.style.removeProperty('height');
    [stage, ...panels].forEach((element) =>
      element.getAnimations?.().forEach((animation) => animation.cancel()),
    );
  };

  const transitionToSelected = () => {
    const currentRevision = ++revision;
    if (preference.matches || !stage.getAnimations) {
      settle();
      return;
    }

    // Keep the existing CSS transitions in charge of timing and interrupted motion.
    const afterTransitions = (panel: HTMLElement, next: () => void) => {
      const animations = [...stage.getAnimations(), ...panel.getAnimations()];
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
        if (revision === currentRevision) next();
      });
    };

    const visible = panels[visibleIndex];
    const selected = panels[selectedIndex];
    const fromHeight = stage.getBoundingClientRect().height;
    const toHeight = selected.getBoundingClientRect().height;
    if (!stage.style.height) {
      stage.style.height = `${fromHeight}px`;
      stage.getBoundingClientRect();
    }

    if (visibleIndex === selectedIndex) {
      visible.classList.remove('is-leaving');
      stage.style.height = `${toHeight}px`;
      afterTransitions(visible, settle);
      return;
    }

    // Reserve enough room before revealing taller content; shrink only after the
    // outgoing content has faded. Text never overlaps or needs an overflow clip.
    stage.style.height = `${Math.max(fromHeight, visible.getBoundingClientRect().height, toHeight)}px`;
    visible.classList.add('is-leaving');
    afterTransitions(visible, () => {
      visible.classList.remove('is-visible', 'is-leaving');
      visibleIndex = selectedIndex;
      selected.classList.add('is-visible');
      stage.style.height = `${selected.getBoundingClientRect().height}px`;
      afterTransitions(selected, settle);
    });
  };

  const keepTabInView = (tab: HTMLElement) => {
    if (!narrow.matches) return;
    const bounds = tab.getBoundingClientRect();
    const viewport = tablist.getBoundingClientRect();
    if (bounds.left < viewport.left) tablist.scrollLeft += bounds.left - viewport.left;
    else if (bounds.right > viewport.right) tablist.scrollLeft += bounds.right - viewport.right;
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener(
      'click',
      () => {
        keepTabInView(tab);
        if (index === selectedIndex) return;
        selectedIndex = index;
        syncAccessibility();
        transitionToSelected();
      },
      { signal: events.signal },
    );
    tab.addEventListener(
      'keydown',
      (event) => {
        // Make the selected panel available immediately when tabbing into it.
        if (event.key === 'Tab' && !event.shiftKey) {
          settle();
          return;
        }
        const previous = narrow.matches ? 'ArrowLeft' : 'ArrowUp';
        const next = narrow.matches ? 'ArrowRight' : 'ArrowDown';
        let target: number;
        if (event.key === previous) target = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === next) target = (index + 1) % tabs.length;
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[target].focus({ preventScroll: true });
        tabs[target].click();
      },
      { signal: events.signal },
    );
  });

  const syncOrientation = () => {
    tablist.setAttribute('aria-orientation', narrow.matches ? 'horizontal' : 'vertical');
    keepTabInView(tabs[selectedIndex]);
  };
  narrow.addEventListener('change', syncOrientation, { signal: events.signal });
  preference.addEventListener('change', settle, { signal: events.signal });
  syncOrientation();

  let heights = panels.map((panel) => panel.getBoundingClientRect().height);
  const observer =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          const nextHeights = panels.map((panel) => panel.getBoundingClientRect().height);
          const changed = [visibleIndex, selectedIndex].some(
            (index) => Math.abs(nextHeights[index] - heights[index]) > 0.5,
          );
          heights = nextHeights;
          if (changed && stage.style.height) transitionToSelected();
        });
  panels.forEach((panel) => observer?.observe(panel));

  return () => {
    events.abort();
    observer?.disconnect();
    settle();
  };
}
