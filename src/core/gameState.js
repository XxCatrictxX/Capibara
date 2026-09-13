const STATE_FIELDS = Object.freeze([
  'sessionId',
  'studentId',
  'studentName',
  'currentTheme',
  'currentActivity',
  'currentLevel',
  'score',
  'answers',
  'startedAt',
  'finishedAt',
]);

function createSessionId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sanitizeStudentName(name) {
  if (typeof name !== 'string') {
    throw new TypeError('El nombre del estudiante debe ser texto.');
  }

  const sanitizedName = name.trim().replace(/\s+/g, ' ');

  if (sanitizedName.length < 2 || sanitizedName.length > 30) {
    throw new RangeError('El nombre del estudiante debe tener entre 2 y 30 caracteres.');
  }

  return sanitizedName;
}

function assertKnownFields(partialState) {
  if (!partialState || typeof partialState !== 'object' || Array.isArray(partialState)) {
    throw new TypeError('La actualización del estado debe ser un objeto.');
  }

  for (const field of Object.keys(partialState)) {
    if (!STATE_FIELDS.includes(field)) {
      throw new Error(`Campo de estado no permitido: ${field}`);
    }
  }
}

function normalizeState(partialState) {
  assertKnownFields(partialState);

  const normalizedState = { ...partialState };

  if ('studentName' in normalizedState && normalizedState.studentName !== null) {
    normalizedState.studentName = sanitizeStudentName(normalizedState.studentName);
  }

  if ('currentLevel' in normalizedState && ![1, 2, 3, null].includes(normalizedState.currentLevel)) {
    throw new RangeError('El nivel actual debe ser 1, 2, 3 o null.');
  }

  if ('score' in normalizedState && (!Number.isFinite(normalizedState.score) || normalizedState.score < 0)) {
    throw new RangeError('El puntaje debe ser un número mayor o igual que cero.');
  }

  if ('answers' in normalizedState && !Array.isArray(normalizedState.answers)) {
    throw new TypeError('Las respuestas deben almacenarse en un arreglo.');
  }

  return normalizedState;
}

function copyState(state) {
  return structuredClone(state);
}

/**
 * Crea un almacén de estado aislado para una partida.
 * El estado expuesto contiene exclusivamente los campos definidos por la especificación.
 */
export function createGameState(initialState = {}) {
  const normalizedInitialState = normalizeState(initialState);

  let state = {
    sessionId: createSessionId(),
    studentId: null,
    studentName: null,
    currentTheme: 0,
    currentActivity: null,
    currentLevel: 1,
    score: 0,
    answers: [],
    startedAt: null,
    finishedAt: null,
    ...normalizedInitialState,
  };

  return Object.freeze({
    getState() {
      return copyState(state);
    },

    updateState(partialState) {
      const normalizedPartialState = normalizeState(partialState);
      state = { ...state, ...normalizedPartialState };
      return copyState(state);
    },

    addAnswer(answer) {
      state = { ...state, answers: [...state.answers, structuredClone(answer)] };
      return copyState(state);
    },

    resetState() {
      state = {
        sessionId: createSessionId(),
        studentId: null,
        studentName: null,
        currentTheme: 0,
        currentActivity: null,
        currentLevel: 1,
        score: 0,
        answers: [],
        startedAt: null,
        finishedAt: null,
      };
      return copyState(state);
    },
  });
}

export { sanitizeStudentName };
