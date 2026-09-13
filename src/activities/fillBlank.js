import { validateFillBlank } from './activityValidator.js';

function getLevel(activity, levelNumber) {
  const level = activity?.levels?.[String(levelNumber)];
  if (!level) throw new RangeError('El nivel solicitado no existe.');
  return level;
}

export function createFillBlank(activity) {
  return Object.freeze({
    type: 'fill_blank',
    getQuestion: (levelNumber) => getLevel(activity, levelNumber).question,
    getOptions: (levelNumber) => structuredClone(getLevel(activity, levelNumber).options),
    validate: (levelNumber, selectedAnswer, justification = null) => {
      const level = getLevel(activity, levelNumber);
      return validateFillBlank(selectedAnswer, level.correctAnswer, justification);
    },
  });
}
