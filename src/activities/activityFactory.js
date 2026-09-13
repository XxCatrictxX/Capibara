import { createDragDrop } from './dragDrop.js';
import { createFillBlank } from './fillBlank.js';
import { createGroupSort } from './groupSort.js';
import { createMultipleChoice } from './multipleChoice.js';
import { createSingleChoice } from './singleChoice.js';

const FACTORIES = Object.freeze({
  fill_blank: createFillBlank,
  single_choice: createSingleChoice,
  multiple_choice: createMultipleChoice,
  group_sort: createGroupSort,
  drag_drop: createDragDrop,
});

/** Crea un adaptador de actividad con una interfaz uniforme. */
export function createActivity(activity) {
  if (!activity || typeof activity !== 'object') {
    throw new TypeError('La actividad es obligatoria.');
  }

  const factory = FACTORIES[activity.type];
  if (!factory) {
    throw new Error(`Tipo de actividad no compatible: ${activity.type}`);
  }

  return factory(activity);
}
