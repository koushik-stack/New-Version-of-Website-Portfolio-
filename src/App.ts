import { renderNavigation, initializeNavigation } from './components/Navigation';
import { renderFooter } from './components/Footer';
import { renderHero } from './sections/Hero';
import { renderAbout } from './sections/About';
import { renderExperience, initializeExperience } from './sections/Experience';
import { renderProjects } from './sections/Projects';
import { renderContact } from './sections/Contact';
import { renderNotes } from './sections/Notes';
import { initializeHeroGraphic } from './graphics/animateHeroGraphic';
import { initializeEntrances } from './motion/entrances';
import { initializeAnchorNavigation } from './utils/anchorNavigation';
import { initializeProjectList } from './components/ProjectList';

export function renderApp(): string {
  return `
    ${renderNavigation()}
    <main id="main-content" tabindex="-1">
      ${renderHero()}
      ${renderAbout()}
      ${renderExperience()}
      ${renderProjects()}
      ${renderContact()}
      ${renderNotes()}
    </main>
    ${renderFooter()}
  `;
}

export function initializeApp(): () => void {
  const cleanups = [
    initializeNavigation(),
    initializeExperience(),
    initializeProjectList(),
    initializeAnchorNavigation(),
    initializeEntrances(),
    initializeHeroGraphic(),
  ];
  return () => cleanups.forEach((cleanup) => cleanup());
}
