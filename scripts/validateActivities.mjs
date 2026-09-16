import activitiesData from '../src/data/activities.json' with { type: 'json' };

const ACTIVITY_KEYS = new Set(['id', 'themeId', 'type', 'requiresJustification', 'levels']);
const BASE_LEVEL_KEYS = new Set(['question', 'options', 'correctAnswer', 'cognitiveDemand', 'distractorInsights']);
const LEVEL_THREE_KEYS = new Set([...BASE_LEVEL_KEYS, 'hint', 'analogy']);
const TYPES = new Set(['fill_blank', 'single_choice', 'multiple_choice', 'group_sort', 'drag_drop']);
const DEMANDS = new Set(['recordar', 'comprender', 'aplicar', 'analizar']);
const EXPECTED_THEME_IDS = [
  'como_sabemos_que_esta_vivo',
  'que_es_un_ser_vivo',
  'la_celula_unidad_basica_de_la_vida',
  'caracteristicas_y_funciones_vitales',
  'los_seres_vivos_y_su_ambiente',
  'clasificacion',
  'la_vida_en_nuestro_entorno',
];

const errors = [];
const fail = (message) => errors.push(message);
const sameValues = (first, second) => first.length === second.length && first.every((value) => second.includes(value));
const sameOrder = (first, second) => first.length === second.length && first.every((value, index) => value === second[index]);

function validateKeys(record, allowedKeys, location) {
  Object.keys(record).forEach((key) => {
    if (!allowedKeys.has(key)) fail(`${location}: campo no permitido "${key}".`);
  });
}

function validateScalarLevel(level, location) {
  if (typeof level.correctAnswer !== 'string') fail(`${location}: correctAnswer debe ser string.`);
  const occurrences = level.options.filter((option) => option === level.correctAnswer).length;
  if (occurrences !== 1) fail(`${location}: debe haber exactamente una alternativa correcta.`);

  const distractors = level.options.filter((option) => option !== level.correctAnswer);
  const insightKeys = Object.keys(level.distractorInsights ?? {});
  if (!sameValues(distractors, insightKeys)) fail(`${location}: cada distractor debe tener exactamente un distractorInsights.`);
}

function validateMultipleLevel(level, location) {
  if (!Array.isArray(level.correctAnswer) || level.correctAnswer.length === 0) {
    fail(`${location}: correctAnswer debe ser un arreglo no vacío.`);
    return;
  }
  if (new Set(level.correctAnswer).size !== level.correctAnswer.length) fail(`${location}: correctAnswer no puede repetir alternativas.`);
  if (!level.correctAnswer.every((answer) => level.options.includes(answer))) fail(`${location}: una respuesta correcta no existe en options.`);

  const distractors = level.options.filter((option) => !level.correctAnswer.includes(option));
  const insightKeys = Object.keys(level.distractorInsights ?? {});
  if (!sameValues(distractors, insightKeys)) fail(`${location}: cada distractor debe tener exactamente un distractorInsights.`);
}

function validateAssignmentLevel(activity, level, location) {
  if (!level.correctAnswer || Array.isArray(level.correctAnswer) || typeof level.correctAnswer !== 'object') {
    fail(`${location}: correctAnswer debe ser un objeto de asignaciones.`);
    return;
  }

  const itemIds = level.options.map((option) => option.id);
  const correctIds = Object.keys(level.correctAnswer);
  if (!sameValues(itemIds, correctIds)) fail(`${location}: correctAnswer debe asignar todos los elementos una sola vez.`);

  const targetField = activity.type === 'group_sort' ? 'group' : 'zone';
  const targetValues = level.options.map((option) => option[targetField]);
  for (const option of level.options) {
    if (!option.id || !option.label || !option[targetField]) fail(`${location}: un elemento de opción está incompleto.`);
    if (level.correctAnswer[option.id] !== option[targetField] || !targetValues.includes(level.correctAnswer[option.id])) {
      fail(`${location}: la asignación correcta de "${option.id}" no coincide con su ${targetField}.`);
    }
  }

  // En group_sort y drag_drop las opciones son elementos que deben ubicarse, no distractores por sí mismos.
  // Cada insight presente debe describir una asignación incorrecta posible: "itemId en destino".
  for (const key of Object.keys(level.distractorInsights ?? {})) {
    const [itemId, ...targetParts] = key.split(' en ');
    const incorrectTarget = targetParts.join(' en ');
    if (!itemIds.includes(itemId) || !targetValues.includes(incorrectTarget) || level.correctAnswer[itemId] === incorrectTarget) {
      fail(`${location}: distractorInsights contiene una asignación inválida: "${key}".`);
    }
  }
}

function validateLevel(activity, level, levelNumber) {
  const location = `${activity.id}, nivel ${levelNumber}`;
  validateKeys(level, levelNumber === '3' ? LEVEL_THREE_KEYS : BASE_LEVEL_KEYS, location);
  ['question', 'options', 'correctAnswer'].forEach((field) => {
    if (!(field in level)) fail(`${location}: falta ${field}.`);
  });
  if (!Array.isArray(level.options) || level.options.length < 2) fail(`${location}: options debe contener al menos dos elementos.`);
  if ('cognitiveDemand' in level && !DEMANDS.has(level.cognitiveDemand)) fail(`${location}: cognitiveDemand no es válido.`);
  if ('distractorInsights' in level && (!level.distractorInsights || Array.isArray(level.distractorInsights) || typeof level.distractorInsights !== 'object')) {
    fail(`${location}: distractorInsights debe ser un objeto.`);
  }

  if (levelNumber === '3') {
    if (!level.hint || !level.analogy) fail(`${location}: faltan hint o analogy.`);
    if (!['aplicar', 'analizar'].includes(level.cognitiveDemand) || level.question.length < 120) {
      fail(`${location}: el andamiaje debe conservar razonamiento de aplicar o analizar.`);
    }
  }

  if (['fill_blank', 'single_choice'].includes(activity.type)) validateScalarLevel(level, location);
  if (activity.type === 'multiple_choice') validateMultipleLevel(level, location);
  if (['group_sort', 'drag_drop'].includes(activity.type)) validateAssignmentLevel(activity, level, location);
}

if (!Array.isArray(activitiesData.themes) || !sameOrder(activitiesData.themes.map((theme) => theme.id), EXPECTED_THEME_IDS)) {
  fail('Las siete temáticas no coinciden, en orden, con las IDs definidas en la especificación.');
}

const seenActivityIds = new Set();
const typeCounts = new Map();
for (const theme of activitiesData.themes) {
  if (!Array.isArray(theme.activities) || theme.activities.length === 0) fail(`${theme.id}: no tiene actividades.`);
  if (!theme.activities.at(-1)?.requiresJustification) fail(`${theme.id}: la actividad de cierre debe requerir justificación.`);

  for (const activity of theme.activities) {
    validateKeys(activity, ACTIVITY_KEYS, activity.id ?? theme.id);
    if (!activity.id || typeof activity.id !== 'string') fail(`${theme.id}: falta un id de actividad válido.`);
    if (seenActivityIds.has(activity.id)) fail(`ID de actividad duplicado: ${activity.id}.`);
    seenActivityIds.add(activity.id);
    if (activity.themeId !== theme.id) fail(`${activity.id}: themeId no coincide con su temática.`);
    if (!TYPES.has(activity.type)) fail(`${activity.id}: tipo no admitido.`);
    if (typeof activity.requiresJustification !== 'boolean') fail(`${activity.id}: requiresJustification debe ser booleano.`);
    ['1', '2', '3'].forEach((number) => validateLevel(activity, activity.levels?.[number] ?? {}, number));
    typeCounts.set(activity.type, (typeCounts.get(activity.type) ?? 0) + 1);
  }
}

for (const type of TYPES) if ((typeCounts.get(type) ?? 0) < 2) fail(`Distribución insuficiente del tipo ${type}.`);

if (errors.length > 0) {
  console.error(`Banco inválido (${errors.length} problema(s)):`, ...errors);
  process.exitCode = 1;
} else {
  console.log(`Banco válido: ${seenActivityIds.size} actividades, 7 temáticas y ${[...typeCounts.entries()].map(([type, count]) => `${type}: ${count}`).join(', ')}.`);
}
