const SOUND_PATHS = Object.freeze({
  correct: '/assets/sounds/correcto.mp3',
  incorrect: '/assets/sounds/incorrecto-suave.mp3',
  advance: '/assets/sounds/avance-mision.mp3',
  final: '/assets/sounds/final-juego.mp3',
});

/** Control de audio local a la sesión: no usa almacenamiento persistente. */
export function createAudioController() {
  let soundEnabled = true;
  const sounds = new Map();

  function getAudio(sound) {
    if (!sounds.has(sound)) sounds.set(sound, new Audio(SOUND_PATHS[sound]));
    return sounds.get(sound);
  }

  return Object.freeze({
    get soundEnabled() { return soundEnabled; },
    toggle() { soundEnabled = !soundEnabled; return soundEnabled; },
    play(sound) {
      if (!soundEnabled || !SOUND_PATHS[sound]) return;
      const audio = getAudio(sound);
      audio.currentTime = 0;
      audio.play().catch(() => {});
    },
  });
}
