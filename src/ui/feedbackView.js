import { createIcon } from './icons.js';

const ENCOURAGEMENTS = Object.freeze([
  '¡Muy bien! Sigues avanzando en tu misión.',
  '¡Excelente trabajo! Tu respuesta fue acertada.',
  '¡Lo lograste! Cada misión suma a tu aprendizaje.',
]);

const RETRY_MESSAGES = Object.freeze([
  'Casi lo tienes, vamos a intentarlo de otra manera.',
  'Buen esfuerzo. La siguiente pista te ayudará.',
  'Sigue intentando: ahora tendrás más apoyo.',
]);

const FINAL_ATTEMPT_MESSAGES = Object.freeze([
  'Buen intento, lo revisaremos en clase.',
  'Seguiste intentando. Continuemos con la siguiente misión.',
  'Gracias por esforzarte. Ahora avancemos juntos.',
]);

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function getFeedbackMessage({ correct, hasNextLevel }) {
  if (correct) return randomItem(ENCOURAGEMENTS);
  return hasNextLevel ? randomItem(RETRY_MESSAGES) : randomItem(FINAL_ATTEMPT_MESSAGES);
}

export function createFeedbackView({ gameState, onContinue }) {
  const latestAttempt = gameState.answers.at(-1);
  const hasNextLevel = gameState.currentLevel !== null;
  const card = document.createElement('section');
  card.className = `game-card feedback-card ${latestAttempt?.correct ? 'is-correct' : 'is-retry'}`;

  const icon = createIcon(latestAttempt?.correct ? 'star' : 'spark');
  icon.classList.add('feedback-icon');

  const title = document.createElement('h1');
  title.textContent = latestAttempt?.correct ? `¡+${latestAttempt.points} puntos!` : '¡Sigue adelante!';

  const message = document.createElement('p');
  message.textContent = getFeedbackMessage({ correct: latestAttempt?.correct, hasNextLevel });

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'primary-button';
  button.textContent = hasNextLevel ? 'Ver el siguiente nivel' : 'Continuar';
  button.addEventListener('click', onContinue);

  card.append(icon, title, message, button);
  return card;
}
