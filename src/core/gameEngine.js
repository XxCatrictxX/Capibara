import { createActivity } from '../activities/activityFactory.js';
import { ActivityRepository } from '../data/activityRepository.js';
import { getNextLevel } from './adaptiveEngine.js';
import { createGameState } from './gameState.js';
import { calculatePoints } from './scoringEngine.js';

export const GAME_STATUS = Object.freeze({
  START: 'START',
  REGISTRATION: 'REGISTRATION',
  LOADING: 'LOADING',
  PLAYING: 'PLAYING',
  FEEDBACK: 'FEEDBACK',
  NEXT_ACTIVITY: 'NEXT_ACTIVITY',
  FINISHED: 'FINISHED',
  ERROR: 'ERROR',
});

const REQUIRED_THEME_COUNT = 7;
export const ACTIVITIES_PER_GAME = 12;

function copy(value) {
  return structuredClone(value);
}

function hasCompleteLevels(activity) {
  return [1, 2, 3].every((levelNumber) => {
    const level = activity?.levels?.[String(levelNumber)];
    return level && Object.hasOwn(level, 'correctAnswer');
  });
}

function chooseRandomItem(items, random) {
  if (items.length === 0) throw new Error('No hay actividades disponibles para seleccionar.');
  const randomValue = random();
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new RangeError('La función aleatoria debe devolver un número entre 0 (incluido) y 1 (excluido).');
  }

  return items[Math.floor(randomValue * items.length)];
}

function chooseRandomActivity(activities, random) {
  const eligibleActivities = activities.filter(hasCompleteLevels);
  if (eligibleActivities.length === 0) {
    throw new Error('La temática no contiene actividades con respuestas correctas definidas.');
  }

  return chooseRandomItem(eligibleActivities, random);
}

/**
 * Orquesta una partida sin conocer la interfaz. La UI puede observar su estado
 * mediante subscribe() y decidir cómo representarlo.
 */
export function createGameEngine({
  repository = ActivityRepository,
  random = Math.random,
  stateStore = createGameState(),
  sessionService = null,
} = {}) {
  let status = GAME_STATUS.START;
  let assignedActivities = [];
  let error = null;
  let activityCompleted = false;
  const listeners = new Set();

  function getSnapshot() {
    return {
      status,
      gameState: stateStore.getState(),
      assignedActivities: copy(assignedActivities),
      error,
    };
  }

  function notify() {
    const snapshot = getSnapshot();
    listeners.forEach((listener) => listener(snapshot));
  }

  function setStatus(nextStatus) {
    status = nextStatus;
    notify();
  }

  function requireStatus(...allowedStatuses) {
    if (!allowedStatuses.includes(status)) {
      throw new Error(`Transición no permitida desde ${status}.`);
    }
  }

  function setCurrentActivity(themeIndex) {
    const assignment = assignedActivities[themeIndex];

    if (!assignment) {
      stateStore.updateState({
        currentTheme: themeIndex,
        currentActivity: null,
        currentLevel: null,
        finishedAt: new Date().toISOString(),
      });
      setStatus(GAME_STATUS.FINISHED);
      return;
    }

    stateStore.updateState({
      currentTheme: themeIndex,
      currentActivity: copy(assignment.activity),
      currentLevel: 1,
    });
    activityCompleted = false;
    setStatus(GAME_STATUS.PLAYING);
  }

  async function assignActivities() {
    if (assignedActivities.length > 0) {
      return assignedActivities;
    }

    const themes = await repository.getActivities();
    if (!Array.isArray(themes) || themes.length !== REQUIRED_THEME_COUNT) {
      throw new Error(`Se requieren exactamente ${REQUIRED_THEME_COUNT} temáticas para iniciar la partida.`);
    }

    const assignedIds = new Set();
    assignedActivities = [];

    for (const theme of themes) {
      const activities = await repository.getByTheme(theme.id);
      const activity = chooseRandomActivity(activities, random);

      if (assignedIds.has(activity.id)) {
        throw new Error(`La actividad ${activity.id} ya fue asignada en esta partida.`);
      }

      assignedIds.add(activity.id);
      assignedActivities.push({ themeId: theme.id, themeTitle: theme.title, activity: copy(activity) });
    }

    const remainingCandidates = [];
    for (const theme of themes) {
      const activities = await repository.getByTheme(theme.id);
      activities.filter((activity) => hasCompleteLevels(activity) && !assignedIds.has(activity.id))
        .forEach((activity) => remainingCandidates.push({ themeId: theme.id, themeTitle: theme.title, activity }));
    }

    if (remainingCandidates.length < ACTIVITIES_PER_GAME - REQUIRED_THEME_COUNT) {
      throw new Error(`Se requieren al menos ${ACTIVITIES_PER_GAME} actividades únicas para iniciar la partida.`);
    }

    while (assignedActivities.length < ACTIVITIES_PER_GAME) {
      const candidate = chooseRandomItem(remainingCandidates, random);
      const candidateIndex = remainingCandidates.indexOf(candidate);
      const assignment = remainingCandidates.splice(candidateIndex, 1)[0];
      assignedIds.add(assignment.activity.id);
      assignedActivities.push({ ...assignment, activity: copy(assignment.activity) });
    }

    return assignedActivities;
  }

  return Object.freeze({
    getStatus() {
      return status;
    },

    getGameState() {
      return stateStore.getState();
    },

    getSnapshot,

    getCurrentActivity() {
      const { currentTheme } = stateStore.getState();
      return assignedActivities[currentTheme] ? copy(assignedActivities[currentTheme].activity) : null;
    },

    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('El suscriptor debe ser una función.');
      }

      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    beginRegistration() {
      requireStatus(GAME_STATUS.START);
      setStatus(GAME_STATUS.REGISTRATION);
      return getSnapshot();
    },

    registerStudent(studentName) {
      requireStatus(GAME_STATUS.REGISTRATION);
      stateStore.updateState({
        studentName,
        startedAt: new Date().toISOString(),
      });
      const registeredState = stateStore.getState();
      if (sessionService) {
        sessionService.initialize({
          sessionId: registeredState.sessionId,
          studentName: registeredState.studentName,
          startedAt: registeredState.startedAt,
        }).then((student) => {
          stateStore.updateState({ studentId: student.id });
          notify();
        }).catch(() => {
          // La partida continúa aunque la conexión falle.
        });
      }
      setStatus(GAME_STATUS.LOADING);
      return getSnapshot();
    },

    async loadActivities() {
      requireStatus(GAME_STATUS.LOADING);

      try {
        await assignActivities();
        setCurrentActivity(0);
        return getSnapshot();
      } catch (loadError) {
        error = loadError instanceof Error ? loadError.message : String(loadError);
        setStatus(GAME_STATUS.ERROR);
        return getSnapshot();
      }
    },

    async start(studentName) {
      if (status === GAME_STATUS.START) this.beginRegistration();
      if (status === GAME_STATUS.REGISTRATION) this.registerStudent(studentName);
      return this.loadActivities();
    },

    submitAnswer(selectedAnswer, justification = null) {
      requireStatus(GAME_STATUS.PLAYING);

      const currentState = stateStore.getState();
      const assignment = assignedActivities[currentState.currentTheme];
      if (!assignment) {
        throw new Error('No hay una actividad activa para responder.');
      }

      const activity = createActivity(assignment.activity);
      const validation = activity.validate(currentState.currentLevel, selectedAnswer, justification);
      const points = calculatePoints(currentState.currentLevel, validation.correct);
      const nextLevel = getNextLevel(currentState.currentLevel, validation.correct);

      stateStore.addAnswer({
        themeId: assignment.themeId,
        activityId: assignment.activity.id,
        level: currentState.currentLevel,
        ...validation,
        points,
        answeredAt: new Date().toISOString(),
      });

      const storedAttempt = stateStore.getState().answers.at(-1);
      if (sessionService) {
        void sessionService.saveAttempt({
          session_id: currentState.sessionId,
          theme_id: assignment.themeId,
          activity_id: assignment.activity.id,
          activity_type: assignment.activity.type,
          level: currentState.currentLevel,
          initial_level: 1,
          resolved_level: currentState.currentLevel,
          is_correct: validation.correct,
          points,
          selected_answer: validation.selectedAnswer,
          justification: validation.justification,
          answered_at: storedAttempt.answeredAt,
        });
      }

      activityCompleted = nextLevel === null;
      if (activityCompleted) {
        stateStore.updateState({
          score: currentState.score + points,
          currentLevel: null,
        });
      } else {
        stateStore.updateState({ currentLevel: nextLevel });
      }

      setStatus(GAME_STATUS.FEEDBACK);
      return { validation, points, nextLevel, snapshot: getSnapshot() };
    },

    advance() {
      requireStatus(GAME_STATUS.FEEDBACK);

      if (!activityCompleted) {
        setStatus(GAME_STATUS.PLAYING);
        return getSnapshot();
      }

      setStatus(GAME_STATUS.NEXT_ACTIVITY);
      return getSnapshot();
    },

    startNextActivity() {
      requireStatus(GAME_STATUS.NEXT_ACTIVITY);
      const { currentTheme } = stateStore.getState();
      setCurrentActivity(currentTheme + 1);
      return getSnapshot();
    },

    reset() {
      stateStore.resetState();
      status = GAME_STATUS.START;
      assignedActivities = [];
      error = null;
      activityCompleted = false;
      notify();
      return getSnapshot();
    },
  });
}
