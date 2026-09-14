import { experience } from '../data/experience';
import { renderSectionHeading } from '../components/SectionHeading';
import { renderExperienceEntry, initializeExperienceEntry } from '../components/ExperienceEntry';

export function renderExperience(): string {
  return `<section class="experience section container" id="experience" aria-labelledby="experience-heading" tabindex="-1">
    ${renderSectionHeading('02', 'Where I’ve contributed', 'experience-heading')}
    <ol class="experience-list" data-stagger>${experience
      .map((entry, index) => renderExperienceEntry(entry, index, index === 0))
      .join('')}</ol>
  </section>`;
}

export function initializeExperience(): () => void {
  const cleanups = Array.from(
    document.querySelectorAll<HTMLElement>('#experience .experience-entry'),
    initializeExperienceEntry,
  );
  return () => cleanups.forEach((cleanup) => cleanup());
}
