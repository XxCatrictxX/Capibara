import activitiesData from './data/activities.json' with { type: 'json' };
import suggestions from './data/teacherSuggestions.json' with { type: 'json' };
import { loadDashboardData } from './services/dashboardService.js';

const GENERIC_SUGGESTION = 'Revisar este concepto con toda la clase antes de avanzar.';
const THEMES = activitiesData.themes.map(({ id, title }) => ({ id, title }));
const ACTIVITIES = new Map(activitiesData.themes.flatMap((theme) => theme.activities.map((activity) => [activity.id, activity])));

function percentage(numerator, denominator) {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

function latestResults(attempts) {
  const results = new Map();
  for (const attempt of attempts) {
    const key = `${attempt.student_id}:${attempt.activity_id}`;
    const current = results.get(key);
    if (!current || new Date(attempt.answered_at) >= new Date(current.answered_at)) results.set(key, attempt);
  }
  return [...results.values()];
}

function getInsights(attempt) {
  const activity = ACTIVITIES.get(attempt.activity_id);
  const level = activity?.levels?.[String(attempt.level)];
  if (!activity || !level || attempt.is_correct) return [];
  const insights = level.distractorInsights ?? {};
  const answer = attempt.selected_answer;

  if (typeof answer === 'string') return insights[answer] ? [insights[answer]] : [];
  if (Array.isArray(answer)) return answer.flatMap((selected) => insights[selected] ? [insights[selected]] : []);
  if (answer && typeof answer === 'object') {
    return Object.entries(answer).flatMap(([itemId, target]) => {
      const key = `${itemId} en ${target}`;
      return insights[key] ? [insights[key]] : [];
    });
  }
  return [];
}

function createElement(tag, className, text = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function createThemeTrafficLights(results) {
  const section = createElement('section', 'dashboard-section');
  section.append(createElement('h2', '', 'Semáforo por temática'));
  const list = createElement('div', 'traffic-light-grid');
  for (const theme of THEMES) {
    const themeResults = results.filter((result) => result.theme_id === theme.id);
    const correct = themeResults.filter((result) => result.is_correct).length;
    const value = percentage(correct, themeResults.length);
    const status = value >= 75 ? 'green' : value >= 50 ? 'amber' : 'red';
    const item = createElement('article', `traffic-light traffic-light--${status}`);
    item.append(createElement('span', 'traffic-light__dot', ''), createElement('h3', '', theme.title), createElement('strong', '', `${value}%`));
    list.append(item);
  }
  section.append(list);
  return section;
}

function createAlerts(attempts, totalStudents) {
  const groups = new Map();
  attempts.forEach((attempt) => getInsights(attempt).forEach((insight) => {
    if (!groups.has(insight)) groups.set(insight, new Set());
    groups.get(insight).add(attempt.student_id);
  }));
  const alerts = [...groups.entries()]
    .map(([insight, students]) => ({ insight, students: students.size, percentage: percentage(students.size, totalStudents) }))
    .sort((first, second) => second.students - first.students)
    .slice(0, 3);
  const section = createElement('section', 'dashboard-section');
  section.append(createElement('h2', '', 'Top 3 alertas de concepto'));
  const list = createElement('ol', 'concept-alerts');
  if (alerts.length === 0) list.append(createElement('li', 'empty-state', 'Aún no hay respuestas incorrectas con patrones diagnosticables.'));
  alerts.forEach((alert) => {
    const item = createElement('li', 'concept-alert');
    item.append(createElement('strong', '', `${alert.percentage}% de estudiantes`), createElement('p', '', alert.insight), createElement('p', 'suggestion', suggestions[alert.insight] ?? GENERIC_SUGGESTION));
    list.append(item);
  });
  section.append(list);
  return section;
}

function formatAnswer(answer) {
  return typeof answer === 'string' ? answer : JSON.stringify(answer);
}

function createDetails(results, attempts, students) {
  const details = createElement('details', 'dashboard-details');
  details.append(createElement('summary', '', 'Ver detalle completo'));
  const activitySection = createElement('section', 'dashboard-section');
  activitySection.append(createElement('h2', '', 'Rendimiento por actividad'));
  const sortButton = createElement('button', 'table-sort-button', 'Ordenar: menor a mayor');
  sortButton.type = 'button';
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Actividad</th><th>Temática</th><th>% acierto</th><th>Estudiantes</th></tr></thead>';
  const body = document.createElement('tbody');
  const activities = [...ACTIVITIES.values()].map((activity) => {
    const activityResults = results.filter((result) => result.activity_id === activity.id);
    return { activity, resultCount: activityResults.length, score: percentage(activityResults.filter((result) => result.is_correct).length, activityResults.length) };
  }).filter(({ resultCount }) => resultCount > 0).sort((first, second) => first.score - second.score);
  let ascending = true;
  const renderRows = () => {
    body.replaceChildren();
    [...activities].sort((first, second) => ascending ? first.score - second.score : second.score - first.score).forEach(({ activity, resultCount, score }) => {
      const row = document.createElement('tr');
      const title = ACTIVITIES.get(activity.id)?.levels?.['1']?.question ?? activity.id;
      row.append(
        createElement('td', '', title.length > 72 ? `${title.slice(0, 72)}…` : title),
        createElement('td', '', THEMES.find((theme) => theme.id === activity.themeId)?.title ?? ''),
        createElement('td', '', `${score}%`),
        createElement('td', '', String(resultCount)),
      );
      body.append(row);
    });
  };
  sortButton.addEventListener('click', () => {
    ascending = !ascending;
    sortButton.textContent = ascending ? 'Ordenar: menor a mayor' : 'Ordenar: mayor a menor';
    renderRows();
  });
  renderRows();
  table.append(body);
  activitySection.append(sortButton, table);

  const justificationSection = createElement('section', 'dashboard-section');
  justificationSection.append(createElement('h2', '', 'Justificaciones'));
  const studentById = new Map(students.map((student) => [student.id, student]));
  const items = attempts.filter((attempt) => attempt.justification?.trim());
  if (items.length === 0) justificationSection.append(createElement('p', 'empty-state', 'Todavía no hay justificaciones registradas.'));
  const byActivity = new Map();
  items.forEach((attempt) => {
    if (!byActivity.has(attempt.activity_id)) byActivity.set(attempt.activity_id, []);
    byActivity.get(attempt.activity_id).push(attempt);
  });
  byActivity.forEach((activityAttempts, activityId) => {
    const activity = ACTIVITIES.get(activityId);
    const group = createElement('section', 'justification-group');
    group.append(createElement('h3', '', activity?.levels?.['1']?.question ?? activityId));
    activityAttempts.forEach((attempt) => {
      const item = createElement('article', 'justification-item');
      const student = studentById.get(attempt.student_id);
      item.append(createElement('h4', '', student?.name ?? 'Estudiante'), createElement('p', '', `Respuesta: ${formatAnswer(attempt.selected_answer)}`), createElement('p', '', `Justificación: ${attempt.justification}`), createElement('p', 'metadata', `Nivel inicial ${attempt.initial_level} · nivel resuelto ${attempt.resolved_level} · ${attempt.is_correct ? 'Correcto' : 'Incorrecto'}`));
      group.append(item);
    });
    justificationSection.append(group);
  });
  details.append(activitySection, justificationSection);
  return details;
}

function renderDashboard(root, payload) {
  const results = latestResults(payload.attempts);
  const dashboard = createElement('div', 'dashboard');
  const header = createElement('header', 'dashboard-header');
  header.append(createElement('p', 'eyebrow', 'CAPIBARA · PANEL DOCENTE'), createElement('h1', '', 'Panorama de aprendizaje'), createElement('p', '', `${payload.students.length} estudiantes · ${results.length} actividades completadas`));
  dashboard.append(header, createThemeTrafficLights(results), createAlerts(payload.attempts, payload.students.length), createDetails(results, payload.attempts, payload.students));
  root.replaceChildren(dashboard);
}

function createLogin(root) {
  const form = createElement('form', 'teacher-login');
  form.append(createElement('p', 'eyebrow', 'ACCESO DOCENTE'), createElement('h1', '', 'Panel de aprendizaje'));
  const label = createElement('label', '', 'Código de acceso');
  const input = document.createElement('input');
  input.type = 'password';
  input.autocomplete = 'current-password';
  input.required = true;
  const error = createElement('p', 'login-error');
  const button = createElement('button', 'dashboard-button', 'Ingresar');
  button.type = 'submit';
  form.append(label, input, error, button);
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); button.disabled = true; error.textContent = '';
    try { renderDashboard(root, await loadDashboardData(input.value)); }
    catch (loadError) { error.textContent = loadError.message; }
    finally { button.disabled = false; }
  });
  root.replaceChildren(form);
}

const root = document.querySelector('#dashboard-app');
if (root) createLogin(root);
