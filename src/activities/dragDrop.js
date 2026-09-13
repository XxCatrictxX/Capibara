import { validateDragDrop } from './activityValidator.js';

function getLevel(activity, levelNumber) {
  const level = activity?.levels?.[String(levelNumber)];
  if (!level) throw new RangeError('El nivel solicitado no existe.');
  return level;
}

export function createDragDrop(activity) {
  return Object.freeze({
    type: 'drag_drop',
    getQuestion: (levelNumber) => getLevel(activity, levelNumber).question,
    getOptions: (levelNumber) => structuredClone(getLevel(activity, levelNumber).options),
    validate: (levelNumber, selectedAnswer, justification = null) => {
      const level = getLevel(activity, levelNumber);
      return validateDragDrop(selectedAnswer, level.correctAnswer, justification);
    },
  });
}
