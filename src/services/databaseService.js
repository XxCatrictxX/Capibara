const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
  }

  return { url: SUPABASE_URL.replace(/\/$/, ''), key: SUPABASE_ANON_KEY };
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function write(table, row, { ignoreDuplicate = false } = {}) {
  const { url, key } = getConfig();
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (ignoreDuplicate && response.status === 409) return row;
  if (!response.ok) throw new Error(`Supabase ${table}: ${await response.text()}`);
  const records = await response.json();
  return records[0];
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
