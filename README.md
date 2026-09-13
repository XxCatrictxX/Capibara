# Juego Interactivo Adaptativo — Capibara

Juego educativo en HTML, CSS y JavaScript con módulos ES y persistencia opcional en Supabase.

## Ejecutar localmente

Por seguridad, los navegadores bloquean los módulos JavaScript si se abre `index.html` directamente con una ruta `file:///`. Instala las dependencias una vez e inicia el servidor local:

```bash
npm install
npm start
```

Después abre [http://localhost:5173](http://localhost:5173) en el navegador. Para detenerlo, usa `Ctrl+C` en la terminal. Si abres el archivo directamente, la página mostrará esta misma indicación sin generar errores en la consola.

## Estructura

La estructura sigue la especificación técnica y separa el motor, actividades, interfaz y persistencia.

## Supabase

1. Crea un proyecto de Supabase y ejecuta [supabase/schema.sql](./supabase/schema.sql) en **SQL Editor**.
2. Copia `.env.example` como `.env` y define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores públicos de **Project Settings → API**.
3. En Vercel, configura esas mismas variables en **Project Settings → Environment Variables** y vuelve a desplegar.

No uses ni publiques una clave `service_role` o secret key en el navegador.
