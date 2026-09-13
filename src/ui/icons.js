const ICON_PATHS = Object.freeze({
  capybara: '<path d="M7 16c0-5.5 4.5-10 10-10h7c5.5 0 10 4.5 10 10v5c0 5-4 9-9 9h-5v4H9v-6c-1.3-1.6-2-3.7-2-6v-6Z"/><path d="M11 10V5h5v4M24 10V5h5v4M13 19h.01M27 19h.01M17 24h7"/><path d="M34 17h4c2 0 3 1.5 3 3.5S40 24 38 24h-4"/>',
  star: '<path d="m20 3 4.8 9.7L35.5 14l-7.7 7.5 1.8 10.5L20 27l-9.6 5 1.8-10.5L4.5 14l10.7-1.3L20 3Z"/>',
  spark: '<path d="M20 3c0 10-7 17-17 17 10 0 17 7 17 17 0-10 7-17 17-17-10 0-17-7-17-17Z"/>',
  trophy: '<path d="M12 5h16v9c0 5-3.6 9-8 9s-8-4-8-9V5Z"/><path d="M12 8H6v4c0 4 2.5 6 6 6M28 8h6v4c0 4-2.5 6-6 6M20 23v8M14 35h12M17 31h6"/>',
  compass: '<circle cx="20" cy="20" r="16"/><path d="m25 12-4 9-9 4 4-9 9-4Z"/><path d="M20 6v3M34 20h-3M20 34v-3M6 20h3"/>',
});

/** Crea un icono SVG local, sin imágenes remotas ni fuentes de iconos. */
export function createIcon(name, label = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('ui-icon', `ui-icon--${name}`);
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  svg.innerHTML = ICON_PATHS[name] ?? ICON_PATHS.spark;
  return svg;
}
