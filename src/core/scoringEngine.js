const POINTS_BY_LEVEL = Object.freeze({
  1: 10,
  2: 8,
  3: 6,
});

/**
 * Calcula los puntos de un intento correcto. Un fallo siempre vale cero.
 */
export function calculatePoints(level, correct) {
  if (!(level in POINTS_BY_LEVEL)) {
    throw new RangeError('El nivel debe ser 1, 2 o 3.');
  }

  if (typeof correct !== 'boolean') {
    throw new TypeError('El resultado debe ser booleano.');
  }

  return correct ? POINTS_BY_LEVEL[level] : 0;
}
