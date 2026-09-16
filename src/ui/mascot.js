const MASCOT_PATHS = Object.freeze({
  feliz: '/assets/mascot/capibara-feliz.png',
  pensando: '/assets/mascot/capibara-pensando.png',
  celebrando: '/assets/mascot/capibara-celebrando.png',
  neutral: '/assets/mascot/capibara-neutral.png',
});

export function createMascot(mood = 'neutral', alt = 'Capibara') {
  const image = document.createElement('img');
  image.className = `mascot-image mascot-image--${mood}`;
  image.src = MASCOT_PATHS[mood] ?? MASCOT_PATHS.neutral;
  image.alt = alt;
  image.width = 184;
  image.height = 184;
  image.decoding = 'async';
  return image;
}
