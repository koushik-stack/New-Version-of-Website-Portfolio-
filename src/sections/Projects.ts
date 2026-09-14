import { projects } from '../data/projects';
import { socialLinks } from '../data/portfolio';
import { renderSectionHeading } from '../components/SectionHeading';
import { renderProjectCard } from '../components/ProjectCard';
import { renderProjectList } from '../components/ProjectList';
import { renderExternalLink } from '../components/Link';

export function renderProjects(): string {
  const featuredProjects = projects.filter((project) => project.featured);
  const additionalProjects = projects.filter((project) => !project.featured);
  const github = socialLinks.find((link) => link.label === 'GitHub');

  return `<section class="projects section container" id="projects" aria-labelledby="projects-heading" tabindex="-1">
    ${renderSectionHeading('03', 'Things I’ve built', 'projects-heading')}
    <p class="section-introduction" data-reveal>A selection of experiments, practical tools, and ideas brought to life.</p>
    <div class="featured-projects" data-stagger>${featuredProjects.map(renderProjectCard).join('')}</div>
    <div class="more-projects">
      <div class="more-projects__heading" data-reveal>
        <div><p class="eyebrow">The curiosity continues</p><h3>More things I’ve built</h3></div>
        ${github ? renderExternalLink({ ...github, label: 'Explore GitHub' }) : ''}
      </div>
      ${renderProjectList(additionalProjects)}
    </div>
  </section>`;
}
