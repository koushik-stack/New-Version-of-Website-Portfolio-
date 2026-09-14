import { posts, type Post } from '../data/posts';
import { escapeHtml } from '../utils/escapeHtml';
import { renderIcon } from '../components/Icon';

function renderPost(post: Post): string {
  return `<details class="post" id="${escapeHtml(post.id)}">
    <summary>
      <span class="eyebrow">${escapeHtml(post.category)} · <time datetime="${post.date}">${escapeHtml(post.displayDate)}</time></span>
      <span class="post__title">${escapeHtml(post.title)}</span>
      <span class="post__excerpt">${escapeHtml(post.excerpt)}</span>
      <span class="post__action">
        <span class="when-closed">Read the note</span>
        <span class="when-open">Close the note</span>
        ${renderIcon('plus')}
      </span>
    </summary>
    <div class="post__content">${post.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div>
  </details>`;
}

export function renderWriting(): string {
  // One real post needs a disclosure, not search, filters, or pagination.
  if (posts.length === 0) return '';

  return `<section class="notes-panel" id="posts" aria-labelledby="posts-heading" tabindex="-1" data-reveal>
    <div class="notes-panel__heading">${renderIcon('book')}<h3 id="posts-heading">From the notebook</h3></div>
    ${posts.map(renderPost).join('')}
  </section>`;
}
