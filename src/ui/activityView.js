import { createActivity } from '../activities/activityFactory.js';
import { createIcon } from './icons.js';
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
  let accessibleMode = false;
  let drag = null;
  const tokenButtons = new Map();
  const zoneElements = new Map();

  const instruction = document.createElement('p');
  instruction.className = 'drag-instruction';
  instruction.append(createIcon('hand'), document.createTextNode('Arrastra cada tarjeta a su grupo'));

  const accessibleButton = document.createElement('button');
  accessibleButton.type = 'button';
  accessibleButton.className = 'accessible-mode-button';
  accessibleButton.setAttribute('aria-pressed', 'false');
  accessibleButton.textContent = 'Modo accesible';

  const liveRegion = document.createElement('p');
  liveRegion.className = 'visually-hidden';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');

  const tokens = document.createElement('div');
  tokens.className = 'drag-tokens';
  const zonesElement = document.createElement('div');
  zonesElement.className = 'drop-zones';

  function announce(message) {
    liveRegion.textContent = '';
    requestAnimationFrame(() => { liveRegion.textContent = message; });
  }

  function updateZoneState() {
    zoneElements.forEach((element) => {
      element.classList.toggle('is-filled', element.querySelector('.drag-token') !== null);
    });
  }

  function markSelection() {
    tokenButtons.forEach((button, id) => {
      const isSelected = id === selectedId;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
  }

  function placeTokenIn(token, zone, { announcePlacement = false } = {}) {
    const target = zoneElements.get(zone);
    if (!token || !target) return false;
    placements.set(token.dataset.tokenId, zone);
    target.append(token);
    token.classList.add('is-placed');
    updateZoneState();
    if (announcePlacement) announce(`${token.dataset.tokenLabel} se colocó en ${zone}.`);
    return true;
  }

  function placeSelectedIn(zone) {
    if (!selectedId) return;
    placements.set(selectedId, zone);
    const token = tokenButtons.get(selectedId);
    placeTokenIn(token, zone, { announcePlacement: true });
    selectedId = null;
    markSelection();
  }

  function getZoneAt(clientX, clientY) {
    return [...zoneElements.entries()].find(([, element]) => {
      const bounds = element.getBoundingClientRect();
      return clientX >= bounds.left && clientX <= bounds.right && clientY >= bounds.top && clientY <= bounds.bottom;
    });
  }

  function setActiveZone(zone) {
    zoneElements.forEach((element, id) => element.classList.toggle('is-active', id === zone));
  }

  function removeOriginShadow() {
    drag?.originShadow?.remove();
  }

  function finishDrag(token, { returnToOrigin = false, targetZone = null } = {}) {
    const activeDrag = drag;
    if (!activeDrag) return;
    try { token.releasePointerCapture(activeDrag.pointerId); } catch { /* El navegador ya liberó el puntero. */ }
    removeOriginShadow();
    setActiveZone(null);
    drag = null;

    if (returnToOrigin || !targetZone) {
      token.classList.remove('is-dragging');
      token.classList.add('is-returning');
      token.style.transform = '';
      window.setTimeout(() => token.classList.remove('is-returning'), 180);
      return;
    }

    const tokenBounds = token.getBoundingClientRect();
    const zoneBounds = zoneElements.get(targetZone).getBoundingClientRect();
    const snapX = zoneBounds.left + zoneBounds.width / 2 - (tokenBounds.left + tokenBounds.width / 2);
    const snapY = zoneBounds.top + zoneBounds.height / 2 - (tokenBounds.top + tokenBounds.height / 2);
    token.classList.remove('is-dragging');
    token.classList.add('is-snapping');
    token.style.transform = `translate(${activeDrag.deltaX + snapX}px, ${activeDrag.deltaY + snapY}px)`;
    window.setTimeout(() => {
      token.style.transform = '';
      token.classList.remove('is-snapping');
      placeTokenIn(token, targetZone);
    }, 140);
  }

  function enableAccessibleMode() {
    if (accessibleMode) return;
    accessibleMode = true;
    accessibleButton.setAttribute('aria-pressed', 'true');
    accessibleButton.textContent = 'Modo accesible activado';
    announce('Modo accesible activado. Selecciona una tarjeta y luego una zona de destino.');
  }

  form.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') enableAccessibleMode();
  });
  accessibleButton.addEventListener('click', enableAccessibleMode);

  options.forEach((option) => {
    const token = document.createElement('button');
    token.type = 'button';
    token.className = 'drag-token';
    token.textContent = option.label;
    token.dataset.tokenId = option.id;
    token.dataset.tokenLabel = option.label;
    token.setAttribute('aria-pressed', 'false');
    tokenButtons.set(option.id, token);
    token.addEventListener('pointerdown', (event) => {
      if (accessibleMode || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      const bounds = token.getBoundingClientRect();
      const originShadow = document.createElement('div');
      originShadow.className = 'drag-origin-shadow';
      Object.assign(originShadow.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` });
      document.body.append(originShadow);
      drag = {
        pointerId: event.pointerId,
        originShadow,
        startX: event.clientX,
        startY: event.clientY,
        deltaX: 0,
        deltaY: 0,
      };
      token.setPointerCapture?.(event.pointerId);
      token.classList.add('is-dragging');
    });
    token.addEventListener('pointermove', (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag.deltaX = event.clientX - drag.startX;
      drag.deltaY = event.clientY - drag.startY;
      token.style.transform = `translate(${drag.deltaX}px, ${drag.deltaY}px)`;
      const zone = getZoneAt(event.clientX, event.clientY)?.[0] ?? null;
      setActiveZone(zone);
    });
    token.addEventListener('pointerup', (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      finishDrag(token, { targetZone: getZoneAt(event.clientX, event.clientY)?.[0] ?? null });
    });
    token.addEventListener('pointercancel', (event) => {
      if (drag?.pointerId === event.pointerId) finishDrag(token, { returnToOrigin: true });
    });
    token.addEventListener('click', () => {
      if (!accessibleMode) return;
      selectedId = option.id;
      markSelection();
      announce(`${option.label} seleccionado. Elige una zona de destino.`);
    });
    tokens.append(token);
  });

  zones.forEach((zone) => {
    const zoneElement = document.createElement('div');
    zoneElement.className = 'drop-zone';
    zoneElement.dataset.dropZone = zone;
    zoneElement.tabIndex = 0;
    zoneElement.setAttribute('role', 'button');
    zoneElement.setAttribute('aria-label', `Zona de destino: ${zone}`);
    zoneElement.append(Object.assign(document.createElement('span'), { className: 'drop-zone__label', textContent: zone }));
    zoneElement.addEventListener('click', () => { if (accessibleMode) placeSelectedIn(zone); });
    zoneElement.addEventListener('keydown', (event) => {
      if (accessibleMode && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        placeSelectedIn(zone);
      }
    });
    zoneElements.set(zone, zoneElement);
    zonesElement.append(zoneElement);
  });

  form.append(instruction, accessibleButton, liveRegion, tokens, zonesElement);
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
