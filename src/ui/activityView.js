import { createActivity } from '../activities/activityFactory.js';
import { createMascot } from './mascot.js';

function appendJustification(form, activity) {
  if (!activity.requiresJustification) return null;

  const label = document.createElement('label');
  label.className = 'justification-label';
  label.htmlFor = 'justification';
  label.textContent = 'Cuéntanos brevemente por qué elegiste tu respuesta (opcional)';

  const input = document.createElement('textarea');
  input.id = 'justification';
  input.name = 'justification';
  input.rows = 3;
  input.maxLength = 280;
  input.placeholder = 'Escribe tu idea aquí…';

  form.append(label, input);
  return input;
}

function createChoiceInput(option, type, name) {
  const label = document.createElement('label');
  label.className = 'choice-option';

  const input = document.createElement('input');
  input.type = type;
  input.name = name;
  input.value = option;

  const text = document.createElement('span');
  text.textContent = option;
  label.append(input, text);
  return label;
}

function addChoiceControls(form, options, isMultiple) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'choice-list';
  const legend = document.createElement('legend');
  legend.textContent = isMultiple ? 'Puedes elegir más de una respuesta' : 'Elige una respuesta';
  fieldset.append(legend);
  options.forEach((option) => fieldset.append(createChoiceInput(option, isMultiple ? 'checkbox' : 'radio', 'answer')));
  form.append(fieldset);

  return () => {
    const selected = [...fieldset.querySelectorAll('input:checked')].map((input) => input.value);
    return isMultiple ? selected : selected[0] ?? null;
  };
}

function addGroupSortControls(form, options) {
  const groups = [...new Set(options.map((option) => option.group))];
  const list = document.createElement('div');
  list.className = 'sort-list';
  const selections = new Map();

  options.forEach((option) => {
    const row = document.createElement('label');
    row.className = 'sort-row';
    const name = document.createElement('span');
    name.textContent = option.label;
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Clasificación de ${option.label}`);
    select.append(new Option('Elige un grupo', ''));
    groups.forEach((group) => select.append(new Option(group, group)));
    select.addEventListener('change', () => selections.set(option.id, select.value));
    row.append(name, select);
    list.append(row);
  });
  form.append(list);

  return () => Object.fromEntries([...selections].filter(([, group]) => group));
}

function addDragDropControls(form, options) {
  const zones = [...new Set(options.map((option) => option.zone))];
  const placements = new Map();
  let selectedId = null;
  const tokenButtons = new Map();

  const instruction = document.createElement('p');
  instruction.className = 'drag-instruction';
  instruction.textContent = 'Selecciona un elemento y luego toca la zona donde corresponde.';

  const tokens = document.createElement('div');
  tokens.className = 'drag-tokens';
  const zonesElement = document.createElement('div');
  zonesElement.className = 'drop-zones';

  function markSelection() {
    tokenButtons.forEach((button, id) => button.classList.toggle('is-selected', id === selectedId));
  }

  function placeSelectedIn(zone) {
    if (!selectedId) return;
    placements.set(selectedId, zone);
    const token = tokenButtons.get(selectedId);
    if (token) token.classList.add('is-placed');
    selectedId = null;
    markSelection();
  }

  options.forEach((option) => {
    const token = document.createElement('button');
    token.type = 'button';
    token.className = 'drag-token';
    token.textContent = option.label;
    tokenButtons.set(option.id, token);
    token.addEventListener('pointerdown', (event) => {
      selectedId = option.id;
      token.setPointerCapture?.(event.pointerId);
      markSelection();
    });
    token.addEventListener('pointerup', (event) => {
      const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-zone]');
      if (zone) placeSelectedIn(zone.dataset.dropZone);
    });
    token.addEventListener('click', () => {
      selectedId = option.id;
      markSelection();
    });
    tokens.append(token);
  });

  zones.forEach((zone) => {
    const zoneButton = document.createElement('button');
    zoneButton.type = 'button';
    zoneButton.className = 'drop-zone';
    zoneButton.dataset.dropZone = zone;
    zoneButton.textContent = zone;
    zoneButton.addEventListener('pointerup', () => placeSelectedIn(zone));
    zoneButton.addEventListener('click', () => placeSelectedIn(zone));
    zonesElement.append(zoneButton);
  });

  form.append(instruction, tokens, zonesElement);
  return () => Object.fromEntries(placements);
}

export function createActivityView({ activity, gameState, onSubmit }) {
  const adapter = createActivity(activity);
  const level = gameState.currentLevel;
  const card = document.createElement('section');
  card.className = 'game-card activity-card';

  const levelLabel = document.createElement('p');
  levelLabel.className = 'level-label';
  levelLabel.textContent = level === 1 ? 'Nivel inicial' : level === 2 ? 'Nivel de apoyo' : 'Nivel con pista';

  const question = document.createElement('h1');
  question.textContent = adapter.getQuestion(level);

  if (level > 1) {
    card.append(createMascot('pensando', 'Capibara pensando en una pista'));
  }

  const form = document.createElement('form');
  form.className = 'activity-form';
  const options = adapter.getOptions(level);
  let getAnswer;

  if (adapter.type === 'multiple_choice') {
    getAnswer = addChoiceControls(form, options, true);
  } else if (adapter.type === 'group_sort') {
    getAnswer = addGroupSortControls(form, options);
  } else if (adapter.type === 'drag_drop') {
    getAnswer = addDragDropControls(form, options);
  } else {
    getAnswer = addChoiceControls(form, options, false);
  }

  const justificationInput = appendJustification(form, activity);
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'primary-button';
  submitButton.textContent = 'Comprobar respuesta';
  form.append(submitButton);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onSubmit(getAnswer(), justificationInput?.value ?? null);
  });

  card.append(levelLabel, question, form);
  return card;
}
