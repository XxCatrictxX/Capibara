const REQUIRED_FIELDS = 'id,session_id,student_id,theme_id,activity_id,activity_type,level,initial_level,resolved_level,is_correct,points,selected_answer,justification,answered_at';

function readEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta configurar ${name}.`);
  return value;
}

function readServerKey() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Falta configurar SUPABASE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY.');
  return key;
}

async function querySupabase(table, select, orderBy = 'answered_at') {
  const url = readEnvironment('SUPABASE_URL').replace(/\/$/, '');
  const key = readServerKey();
  const response = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=${encodeURIComponent(`${orderBy}.asc`)}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Supabase respondió ${response.status} al consultar ${table}.${detail ? ` Detalle: ${detail}` : ''}`);
  }
  return response.json();
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Método no permitido.' });

  try {
    const expectedCode = readEnvironment('TEACHER_ACCESS_CODE');
    if (request.headers['x-teacher-access-code'] !== expectedCode) {
      return response.status(401).json({ error: 'No autorizado.' });
    }

    const [attempts, students] = await Promise.all([
      querySupabase('attempts', REQUIRED_FIELDS),
      querySupabase('students', 'id,name,session_id,score,started_at,finished_at', 'started_at'),
    ]);
    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ attempts, students });
  } catch (error) {
    console.error('Dashboard API error:', error);
    response.setHeader('Cache-Control', 'no-store');
    return response.status(500).json({
      error: error instanceof Error ? error.message : 'Error inesperado.',
      hint: 'Revisa las variables del servidor y los logs de la función /api/dashboard en Vercel.',
    });
  }
}
