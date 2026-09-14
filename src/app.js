import { createGameEngine } from './core/gameEngine.js';
import { isSupabaseConfigured } from './services/databaseService.js';
import { createSessionService } from './services/sessionService.js';
import { createScreenManager } from './ui/screenManager.js';

const appRoot = document.querySelector('#app');

if (appRoot) {
  const sessionService = isSupabaseConfigured() ? createSessionService() : null;
  const gameEngine = createGameEngine({ sessionService });
  createScreenManager({ root: appRoot, gameEngine });
  gameEngine.beginRegistration();

  if (new URLSearchParams(window.location.search).has('test_db')) {
    import('./services/test_db.js').then(({ runDatabaseDiagnostics }) => runDatabaseDiagnostics());
  }
}
