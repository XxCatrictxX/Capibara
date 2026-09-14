const viteEnvironment = import.meta.env ?? {};
const SUPABASE_URL = viteEnvironment.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = viteEnvironment.VITE_SUPABASE_ANON_KEY;

function getConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
  }

  return { url: SUPABASE_URL.replace(/\/$/, ''), key: SUPABASE_ANON_KEY };
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function getDatabaseDiagnostics() {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      stage: 'configuration',
      message: 'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno de compilación.',
    };
  }

  try {
    const { url, key } = getConfig();
    const response = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
    return response.ok
      ? { ok: true, stage: 'connection', message: 'La URL y la clave pública llegan a Supabase correctamente.' }
      : { ok: false, stage: 'connection', status: response.status, message: await response.text() };
  } catch (error) {
    return { ok: false, stage: 'network', message: error instanceof Error ? error.message : String(error) };
  }
}

async function write(table, row, { ignoreDuplicate = false } = {}) {
  const { url, key } = getConfig();
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (ignoreDuplicate && response.status === 409) return row;
  if (!response.ok) throw new Error(`Supabase ${table}: ${await response.text()}`);
  return row;
}

export function createSession({ sessionId, createdAt }) {
  return write('sessions', { id: sessionId, created_at: createdAt, status: 'active' }, { ignoreDuplicate: true });
}

export function createStudent({ id, sessionId, name, startedAt }) {
  return write('students', { id, session_id: sessionId, name, started_at: startedAt }, { ignoreDuplicate: true });
}

export function saveAttempt(attemptData) {
  return write('attempts', attemptData);
}
