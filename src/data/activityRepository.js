import activityData from './activities.json' with { type: 'json' };

function copy(value) {
  return structuredClone(value);
}

function getThemes() {
  if (!Array.isArray(activityData.themes)) {
    throw new Error('El banco de actividades no contiene temáticas válidas.');
  }

  return activityData.themes;
}

/**
 * Punto único de acceso al banco de actividades.
 * Los consumidores no necesitan conocer cómo se carga el JSON.
 */
export const ActivityRepository = Object.freeze({
  async getActivities() {
    return copy(getThemes());
  },

  async getByTheme(themeId) {
    const theme = getThemes().find(({ id }) => id === themeId);
    return theme ? copy(theme.activities) : [];
  },
});

export const getActivities = ActivityRepository.getActivities;
export const getByTheme = ActivityRepository.getByTheme;
