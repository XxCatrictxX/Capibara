import { createActivityView } from './activityView.js';
import { createFeedbackView } from './feedbackView.js';
import { createProgressView } from './progressView.js';
import { createResultView } from './resultView.js';
import { createIcon } from './icons.js';
import { createMascot } from './mascot.js';
import { createAudioController } from './audioController.js';

function replaceScreen(root, content) {
  root.replaceChildren(content);
}

function createStatusCard(titleText, messageText, isError = false, mascotMood = null) {
  const card = document.createElement('section');
  card.className = `game-card status-card${isError ? ' is-error' : ''}`;
  const title = document.createElement('h1');
  title.textContent = titleText;
  const message = document.createElement('p');
  message.textContent = messageText;
  if (mascotMood) card.append(createMascot(mascotMood, 'Capibara esperando'));
  card.append(title, message);
  return card;
}

function sanitizeName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

function createRegistrationView(onRegister) {
  const card = document.createElement('section');
  card.className = 'game-card registration-card';
  const mascot = createMascot('feliz', 'Capibara feliz te da la bienvenida');
  const title = document.createElement('h1');
  title.textContent = '¡Hola, explorador o exploradora!';
  const intro = document.createElement('p');
  intro.textContent = 'Recorreremos doce misiones sobre la vida y los seres vivos.';

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
  const audio = createAudioController();
  let lastSoundedAttemptAt = null;

  function createSoundToggle() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sound-toggle';
    const updateLabel = () => {
      const enabled = audio.soundEnabled;
      button.replaceChildren(createIcon(enabled ? 'sound' : 'muted'));
      button.setAttribute('aria-label', enabled ? 'Silenciar sonidos' : 'Activar sonidos');
      button.setAttribute('aria-pressed', String(!enabled));
    };
    button.addEventListener('click', () => { audio.toggle(); updateLabel(); });
    updateLabel();
    return button;
  }

  function mount(content) {
    const shell = document.createElement('div');
    shell.className = 'ui-shell';
    shell.append(createSoundToggle(), content);
    replaceScreen(root, shell);
  }

  async function registerStudent(name) {
    try {
      gameEngine.registerStudent(name);
      await gameEngine.loadActivities();
    } catch (error) {
      replaceScreen(root, createStatusCard('No pudimos iniciar', error.message, true));
    }
  }

  function continueAfterFeedback() {
    const beforeAdvance = gameEngine.getGameState();
    gameEngine.advance();
    if (gameEngine.getStatus() === 'NEXT_ACTIVITY') {
      const isFinalMission = beforeAdvance.currentTheme + 1 >= gameEngine.getSnapshot().assignedActivities.length;
      audio.play(isFinalMission ? 'final' : 'advance');
      gameEngine.startNextActivity();
    }
  }

  function restart() {
    gameEngine.reset();
    gameEngine.beginRegistration();
  }

  function render(snapshot) {
    const { status, gameState, assignedActivities, error } = snapshot;
    if (status === 'REGISTRATION') return mount(createRegistrationView(registerStudent));
    if (status === 'LOADING') return mount(createStatusCard('Preparando tu misión…', 'Estamos organizando las actividades.', false, 'pensando'));
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
      return mount(screen);
    }
    if (status === 'FEEDBACK') {
      const latestAttempt = gameState.answers.at(-1);
      if (latestAttempt?.answeredAt !== lastSoundedAttemptAt) {
        audio.play(latestAttempt?.correct ? 'correct' : 'incorrect');
        lastSoundedAttemptAt = latestAttempt?.answeredAt ?? null;
      }
      return mount(createFeedbackView({ gameState, onContinue: continueAfterFeedback }));
    }
    if (status === 'NEXT_ACTIVITY') return mount(createStatusCard('Siguiente misión', '¡Vamos a descubrir algo nuevo!', false, 'celebrando'));
    if (status === 'FINISHED') return mount(createResultView({ score: gameState.score, onRestart: restart }));
    if (status === 'ERROR') return mount(createStatusCard('Ocurrió un problema', error || 'Inténtalo nuevamente.', true));
    return mount(createStatusCard('Vida y seres vivos', 'Comencemos cuando estés listo.'));
  }

  const unsubscribe = gameEngine.subscribe(render);
  render(gameEngine.getSnapshot());
  return Object.freeze({ render: () => render(gameEngine.getSnapshot()), destroy: unsubscribe });
}
