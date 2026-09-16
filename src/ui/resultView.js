import { createIcon } from './icons.js';
import { createMascot } from './mascot.js';

const RESULT_MESSAGES = Object.freeze({
  high: [
    '¡Gran exploración! Demostraste mucho conocimiento sobre la vida.',
    '¡Misión brillante! Observaste y razonaste como una científica o un científico.',
  ],
  medium: [
    '¡Buen trabajo! Cada intento te ayudó a aprender algo nuevo.',
    '¡Seguiste adelante con mucha curiosidad! Eso es parte de aprender.',
  ],
  growing: [
    '¡Completaste todas las misiones! Lo que practicamos hoy seguirá creciendo.',
    '¡Terminaste el recorrido! Revisaremos juntos las ideas que fueron más difíciles.',
  ],
});

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function getResultMessage(score) {
  if (score >= 90) return randomItem(RESULT_MESSAGES.high);
  if (score >= 48) return randomItem(RESULT_MESSAGES.medium);
  return randomItem(RESULT_MESSAGES.growing);
}

export function createResultView({ score, onRestart }) {
  const card = document.createElement('section');
  card.className = 'game-card result-card';

  const icon = createIcon('trophy');
  icon.classList.add('result-icon');

  const title = document.createElement('h1');
  title.textContent = '¡Misión completada!';

  const scoreText = document.createElement('p');
  scoreText.className = 'score-total';
  scoreText.textContent = `${score} puntos`;

  const message = document.createElement('p');
  message.textContent = getResultMessage(score);

  const confetti = document.createElement('div');
  confetti.className = 'confetti';
  confetti.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 12; index += 1) confetti.append(document.createElement('span'));
  const mascot = createMascot('celebrando', 'Capibara celebrando el final del juego');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary-button';
  button.textContent = 'Jugar de nuevo';
  button.addEventListener('click', onRestart);

  card.append(confetti, mascot, icon, title, scoreText, message, button);
  return card;
}
