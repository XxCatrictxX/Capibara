import { createGameEngine, GAME_STATUS } from './gameEngine.js';

function createIncorrectAnswer(level) {
  if (typeof level.correctAnswer === 'string') {
    return level.options.find((option) => option !== level.correctAnswer);
  }

  if (Array.isArray(level.correctAnswer)) {
    return [];
  }

  const incorrectAnswer = structuredClone(level.correctAnswer);
  const [firstItemId] = Object.keys(incorrectAnswer);
  incorrectAnswer[firstItemId] = '__zona_incorrecta__';
  return incorrectAnswer;
}

function answerFor(level, isCorrect) {
  return isCorrect ? structuredClone(level.correctAnswer) : createIncorrectAnswer(level);
}

const answerPlans = [
  [true],
  [false, true],
  [false, false, true],
  [false, false, false],
  [true],
  [false, true],
  [true],
];

const engine = createGameEngine({ random: () => 0 });
await engine.start('Estudiante de prueba');

for (const attempts of answerPlans) {
  for (const isCorrect of attempts) {
    const gameState = engine.getGameState();
    const activity = engine.getCurrentActivity();
    const level = activity.levels[String(gameState.currentLevel)];
    const result = engine.submitAnswer(answerFor(level, isCorrect));
    console.log(`Tema ${gameState.currentTheme + 1}, nivel ${gameState.currentLevel}: ${result.points} puntos`);
    engine.advance();
  }

  if (engine.getStatus() === GAME_STATUS.NEXT_ACTIVITY) {
    engine.startNextActivity();
  }
}

console.log(`Puntaje final: ${engine.getGameState().score}`);
console.log('gameState final:', engine.getGameState());
