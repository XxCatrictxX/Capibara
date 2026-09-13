import activitiesData from '../data/activities.json' with { type: 'json' };
import { validateActivity } from '../activities/activityValidator.js';
import { getNextLevel } from './adaptiveEngine.js';
import { calculatePoints } from './scoringEngine.js';

const activity = activitiesData.themes[0].activities[0];

function answerFor(levelNumber, isCorrect) {
  const level = activity.levels[String(levelNumber)];
  return isCorrect ? level.correctAnswer : level.options.find((option) => option !== level.correctAnswer);
}

function submit(levelNumber, isCorrect) {
  const level = activity.levels[String(levelNumber)];
  const validation = validateActivity(activity.type, level, answerFor(levelNumber, isCorrect));

  return {
    correct: validation.correct,
    points: calculatePoints(levelNumber, validation.correct),
    nextLevel: getNextLevel(levelNumber, validation.correct),
  };
}

const scenarios = [
  {
    name: 'Acierto en nivel 1',
    attempts: [[1, true]],
    expectedPoints: 10,
    expectedNextLevel: null,
  },
  {
    name: 'Fallo y acierto en nivel 2',
    attempts: [[1, false], [2, true]],
    expectedPoints: 8,
    expectedNextLevel: null,
  },
  {
    name: 'Fallo, fallo y acierto en nivel 3',
    attempts: [[1, false], [2, false], [3, true]],
    expectedPoints: 6,
    expectedNextLevel: null,
  },
  {
    name: 'Fallo total',
    attempts: [[1, false], [2, false], [3, false]],
    expectedPoints: 0,
    expectedNextLevel: null,
  },
];

for (const scenario of scenarios) {
  const results = scenario.attempts.map(([level, isCorrect]) => submit(level, isCorrect));
  const lastResult = results.at(-1);
  const awardedPoints = lastResult.correct ? lastResult.points : 0;
  const passed = awardedPoints === scenario.expectedPoints
    && lastResult.nextLevel === scenario.expectedNextLevel
    && results.slice(0, -1).every((result, index) => result.nextLevel === index + 2);

  console.log(`${passed ? '✓' : '✗'} ${scenario.name}: ${awardedPoints}/${scenario.expectedPoints} puntos`);
}
