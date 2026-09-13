function normalizeText(value) {
  return typeof value === 'string'
    ? value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-PE')
    : null;
}

function normalizeJustification(justification) {
  if (typeof justification !== 'string') {
    return null;
  }

  const trimmedJustification = justification.trim();
  return trimmedJustification || null;
}

function createResult(correct, selectedAnswer, normalizedAnswer, justification) {
  return {
    correct,
    selectedAnswer,
    normalizedAnswer,
    justification: normalizeJustification(justification),
  };
}

function normalizeSelections(selectedAnswer) {
  if (!Array.isArray(selectedAnswer)) {
    return [];
  }

  return [...new Set(selectedAnswer.map(normalizeText).filter(Boolean))].sort();
}

function normalizeAssignments(selectedAnswer) {
  if (!selectedAnswer || typeof selectedAnswer !== 'object' || Array.isArray(selectedAnswer)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(selectedAnswer)
      .filter(([itemId, group]) => normalizeText(itemId) && normalizeText(group))
      .map(([itemId, group]) => [normalizeText(itemId), normalizeText(group)])
      .sort(([firstId], [secondId]) => firstId.localeCompare(secondId, 'es-PE')),
  );
}

function assignmentsMatch(selectedAnswer, correctAnswer) {
  const normalizedSelectedAnswer = normalizeAssignments(selectedAnswer);
  const normalizedCorrectAnswer = normalizeAssignments(correctAnswer);
  const selectedKeys = Object.keys(normalizedSelectedAnswer);
  const correctKeys = Object.keys(normalizedCorrectAnswer);

  return selectedKeys.length === correctKeys.length
    && selectedKeys.every((key) => normalizedSelectedAnswer[key] === normalizedCorrectAnswer[key]);
}

/** Valida una alternativa seleccionada para completar una frase. */
export function validateFillBlank(selectedAnswer, correctAnswer, justification = null) {
  const normalizedAnswer = normalizeText(selectedAnswer);
  return createResult(
    normalizedAnswer !== null && normalizedAnswer === normalizeText(correctAnswer),
    selectedAnswer,
    normalizedAnswer,
    justification,
  );
}

/** Valida una alternativa única. */
export function validateSingleChoice(selectedAnswer, correctAnswer, justification = null) {
  return validateFillBlank(selectedAnswer, correctAnswer, justification);
}

/** Valida el conjunto completo de alternativas seleccionadas. */
export function validateMultipleChoice(selectedAnswer, correctAnswer, justification = null) {
  const normalizedAnswer = normalizeSelections(selectedAnswer);
  const normalizedCorrectAnswer = normalizeSelections(correctAnswer);
  const correct = normalizedAnswer.length === normalizedCorrectAnswer.length
    && normalizedAnswer.every((answer, index) => answer === normalizedCorrectAnswer[index]);

  return createResult(correct, selectedAnswer, normalizedAnswer, justification);
}

/** Valida la clasificación completa de elementos en grupos. */
export function validateGroupSort(selectedAnswer, correctAnswer, justification = null) {
  const normalizedAnswer = normalizeAssignments(selectedAnswer);
  return createResult(
    assignmentsMatch(selectedAnswer, correctAnswer),
    selectedAnswer,
    normalizedAnswer,
    justification,
  );
}

/** Valida la ubicación completa de elementos en zonas. */
export function validateDragDrop(selectedAnswer, correctAnswer, justification = null) {
  const normalizedAnswer = normalizeAssignments(selectedAnswer);
  return createResult(
    assignmentsMatch(selectedAnswer, correctAnswer),
    selectedAnswer,
    normalizedAnswer,
    justification,
  );
}

/**
 * Valida una respuesta usando el tipo de actividad y los datos de su nivel activo.
 */
export function validateActivity(activityType, level, selectedAnswer, justification = null) {
  if (!level || typeof level !== 'object') {
    throw new TypeError('El nivel de actividad es obligatorio.');
  }

  const validators = {
    fill_blank: validateFillBlank,
    single_choice: validateSingleChoice,
    multiple_choice: validateMultipleChoice,
    group_sort: validateGroupSort,
    drag_drop: validateDragDrop,
  };
  const validator = validators[activityType];

  if (!validator) {
    throw new Error(`Tipo de actividad no compatible: ${activityType}`);
  }

  return validator(selectedAnswer, level.correctAnswer, justification);
}
