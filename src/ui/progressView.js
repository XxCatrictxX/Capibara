import { createIcon } from './icons.js';

export function createProgressView({ mission, total = 12, themeTitle }) {
  const container = document.createElement('section');
  container.className = 'progress-panel';
  container.setAttribute('aria-label', `Progreso: misión ${mission} de ${total}`);

  const heading = document.createElement('div');
  heading.className = 'mission-heading';
  const label = document.createElement('p');
  label.className = 'mission-label';
  label.textContent = `MISIÓN ${mission} DE ${total}`;

  const progress = document.createElement('progress');
  progress.className = 'mission-progress';
  progress.max = total;
  progress.value = mission - 1;

  const theme = document.createElement('p');
  theme.className = 'theme-label';
  theme.textContent = themeTitle || 'Explorando la vida y los seres vivos';

  heading.append(createIcon('compass'), label);
  container.append(heading, progress, theme);
  return container;
}
