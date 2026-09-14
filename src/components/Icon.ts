const paths = {
  arrowUpRight: '<path d="M6 18 18 6M6 6h12v12"/>',
  arrowRight: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  arrowDown: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
  book: '<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
};

export function renderIcon(name: keyof typeof paths): string {
  return `<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none"
    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}
