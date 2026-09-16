export async function loadDashboardData(accessCode) {
  const response = await fetch('/api/dashboard', {
    headers: { 'x-teacher-access-code': accessCode },
  });

  if (response.status === 401) throw new Error('El código docente no es correcto.');
  if (!response.ok) {
    let error = {};
    try { error = await response.json(); } catch { /* El servidor no devolvió JSON. */ }
    throw new Error(error.error ?? `No fue posible cargar los datos del dashboard (HTTP ${response.status}).`);
  }
  return response.json();
}
