import { renderWriting } from './Writing';
import { renderHardware } from './Hardware';

export function renderNotes(): string {
  return `<section class="notes container" aria-labelledby="notes-heading">
    <div class="notes__heading" data-reveal>
      <p class="eyebrow">Beyond the projects</p>
      <h2 id="notes-heading">Notes & everyday tools</h2>
    </div>
    <div class="notes__grid" data-stagger>
      ${renderWriting()}
      ${renderHardware()}
    </div>
  </section>`;
}
