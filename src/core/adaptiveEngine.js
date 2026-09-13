const VALID_LEVELS = new Set([1, 2, 3]);

/**
 * Devuelve el siguiente nivel tras un intento. `null` indica que la actividad se cierra.
 */
export function getNextLevel(currentLevel, isCorrect) {
  if (!VALID_LEVELS.has(currentLevel)) {
    throw new RangeError('El nivel actual debe ser 1, 2 o 3.');
  }

  if (typeof isCorrect !== 'boolean') {
    throw new TypeError('El resultado del intento debe ser booleano.');
  }

  if (isCorrect || currentLevel === 3) {
    return null;
  }

  return currentLevel + 1;
}
