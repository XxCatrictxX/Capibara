import { createSession, createStudent, saveAttempt } from './databaseService.js';

const PENDING_ATTEMPTS_KEY = 'capibara.pendingAttempts';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2_000;

function readPending() {
  try { return JSON.parse(sessionStorage.getItem(PENDING_ATTEMPTS_KEY) ?? '[]'); } catch { return []; }
}

function writePending(items) {
  sessionStorage.setItem(PENDING_ATTEMPTS_KEY, JSON.stringify(items));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Coordina persistencia en segundo plano; los errores no bloquean el juego. */
export function createSessionService() {
  let initialization = null;
  let studentId = null;
  let sessionContext = null;

  function createId() {
    return crypto.randomUUID();
  }

  function ensureInitialized() {
    if (studentId) return Promise.resolve({ id: studentId });
    if (initialization) return initialization;
    if (!sessionContext) return Promise.reject(new Error('No hay una sesión activa para guardar el intento.'));

    initialization = (async () => {
      await createSession({ sessionId: sessionContext.sessionId, createdAt: sessionContext.startedAt });
      const student = await createStudent({
        id: sessionContext.studentId,
        sessionId: sessionContext.sessionId,
        name: sessionContext.studentName,
        startedAt: sessionContext.startedAt,
      });
      studentId = student.id;
      return student;
    })().catch((error) => {
      initialization = null;
      throw error;
    });
    return initialization;
  }

  async function persistAttempt(attempt, retryCount = 0) {
    try {
      if (!studentId) await ensureInitialized();
      await saveAttempt({ ...attempt, student_id: studentId });
      return true;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        await wait(RETRY_DELAY_MS * (retryCount + 1));
        return persistAttempt(attempt, retryCount + 1);
      }
      const pending = readPending();
      writePending([...pending, attempt]);
      return false;
    }
  }

  return Object.freeze({
    initialize({ sessionId, studentName, startedAt }) {
      sessionContext = { sessionId, studentName, startedAt, studentId: createId() };
      return ensureInitialized();
    },

    saveAttempt(attempt) {
      return persistAttempt(attempt);
    },

    async retryPending() {
      const pending = readPending();
      writePending([]);
      await Promise.all(pending.map((attempt) => persistAttempt(attempt)));
    },
  });
}
