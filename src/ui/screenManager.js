import { createActivityView } from './activityView.js';
import { createFeedbackView } from './feedbackView.js';
import { createProgressView } from './progressView.js';
import { createResultView } from './resultView.js';
import { createIcon } from './icons.js';

function replaceScreen(root, content) {
  root.replaceChildren(content);
}

function createStatusCard(titleText, messageText, isError = false) {
  const card = document.createElement('section');
  card.className = `game-card status-card${isError ? ' is-error' : ''}`;
  const title = document.createElement('h1');
  title.textContent = titleText;
  const message = document.createElement('p');
  message.textContent = messageText;
  card.append(title, message);
  return card;
}

function sanitizeName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

function createRegistrationView(onRegister) {
  const card = document.createElement('section');
  card.className = 'game-card registration-card';
  const mascot = createIcon('capybara');
  mascot.classList.add('mascot-icon');
  const title = document.createElement('h1');
  title.textContent = '¡Hola, explorador o exploradora!';
  const intro = document.createElement('p');
  intro.textContent = 'Recorreremos siete misiones sobre la vida y los seres vivos.';

  const form = document.createElement('form');
  form.className = 'registration-form';
  const label = document.createElement('label');
  label.htmlFor = 'student-name';
  label.textContent = '¿Cómo te llamas?';
  const input = document.createElement('input');
  input.id = 'student-name';
  input.name = 'studentName';
  input.type = 'text';
  input.minLength = 2;
  input.maxLength = 30;
  input.autocomplete = 'given-name';
  input.required = true;
  input.placeholder = 'Escribe tu nombre';
  const error = document.createElement('p');
  error.className = 'form-error';
  error.setAttribute('role', 'alert');
  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'primary-button';
  button.textContent = 'Comenzar misión';
  form.append(label, input, error, button);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = sanitizeName(input.value);
    if (name.length < 2 || name.length > 30) {
      error.textContent = 'Escribe un nombre de 2 a 30 caracteres.';
      input.focus();
      return;
    }
    error.textContent = '';
    onRegister(name);
  });
  card.append(mascot, title, intro, form);
  return card;
}

export function createScreenManager({ root, gameEngine }) {
  if (!(root instanceof Element)) throw new TypeError('Se requiere un elemento raíz para la interfaz.');
  if (!gameEngine || typeof gameEngine.subscribe !== 'function') throw new TypeError('Se requiere un gameEngine válido.');

  async function registerStudent(name) {
    try {
      gameEngine.registerStudent(name);
      await gameEngine.loadActivities();
    } catch (error) {
      replaceScreen(root, createStatusCard('No pudimos iniciar', error.message, true));
    }
  }

  function continueAfterFeedback() {
    gameEngine.advance();
    if (gameEngine.getStatus() === 'NEXT_ACTIVITY') gameEngine.startNextActivity();
  }

  function restart() {
    gameEngine.reset();
    gameEngine.beginRegistration();
  }

  function render(snapshot) {
    const { status, gameState, assignedActivities, error } = snapshot;
    if (status === 'REGISTRATION') return replaceScreen(root, createRegistrationView(registerStudent));
    if (status === 'LOADING') return replaceScreen(root, createStatusCard('Preparando tu misión…', 'Estamos organizando las actividades.'));
    if (status === 'PLAYING') {
      const assignment = assignedActivities[gameState.currentTheme];
      const screen = document.createElement('div');
      screen.className = 'game-screen';
      screen.append(
        createProgressView({ mission: gameState.currentTheme + 1, total: assignedActivities.length, themeTitle: assignment?.themeTitle }),
        createActivityView({
          activity: gameEngine.getCurrentActivity(),
          gameState,
          onSubmit: (answer, justification) => gameEngine.submitAnswer(answer, justification),
        }),
      );
      return replaceScreen(root, screen);
    }
    if (status === 'FEEDBACK') return replaceScreen(root, createFeedbackView({ gameState, onContinue: continueAfterFeedback }));
    if (status === 'NEXT_ACTIVITY') return replaceScreen(root, createStatusCard('Siguiente misión', '¡Vamos a descubrir algo nuevo!'));
    if (status === 'FINISHED') return replaceScreen(root, createResultView({ score: gameState.score, onRestart: restart }));
    if (status === 'ERROR') return replaceScreen(root, createStatusCard('Ocurrió un problema', error || 'Inténtalo nuevamente.', true));
    return replaceScreen(root, createStatusCard('Vida y seres vivos', 'Comencemos cuando estés listo.'));
  }

  const unsubscribe = gameEngine.subscribe(render);
  render(gameEngine.getSnapshot());
  return Object.freeze({ render: () => render(gameEngine.getSnapshot()), destroy: unsubscribe });
}
