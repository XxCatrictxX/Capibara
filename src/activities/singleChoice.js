import { validateSingleChoice } from './activityValidator.js';

function getLevel(activity, levelNumber) {
  const level = activity?.levels?.[String(levelNumber)];
  if (!level) throw new RangeError('El nivel solicitado no existe.');
  return level;
}

export function createSingleChoice(activity) {
  return Object.freeze({
    type: 'single_choice',
    getQuestion: (levelNumber) => getLevel(activity, levelNumber).question,
    getOptions: (levelNumber) => structuredClone(getLevel(activity, levelNumber).options),
    validate: (levelNumber, selectedAnswer, justification = null) => {
      const level = getLevel(activity, levelNumber);
      return validateSingleChoice(selectedAnswer, level.correctAnswer, justification);
    },
  });
}
