# Juego Interactivo Adaptativo — Capibara

Juego educativo en HTML, CSS y JavaScript con módulos ES y persistencia opcional en Supabase.

## Ejecutar localmente

Por seguridad, los navegadores bloquean los módulos JavaScript si se abre `index.html` directamente con una ruta `file:///`. Instala las dependencias una vez e inicia el servidor local:

```bash
npm install
npm start
```

Después abre [http://localhost:5173](http://localhost:5173) en el navegador. Para detenerlo, usa `Ctrl+C` en la terminal. No abras `index.html` directamente: Vite debe procesar los módulos ES antes de servirlos.

## Estructura

La estructura sigue la especificación técnica y separa el motor, actividades, interfaz y persistencia.

## Supabase

1. Crea un proyecto de Supabase y ejecuta [supabase/schema.sql](./supabase/schema.sql) en **SQL Editor**.
2. Copia `.env.example` como `.env` y define `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores públicos de **Project Settings → API**.
3. En Vercel, configura esas mismas variables en **Project Settings → Environment Variables** y vuelve a desplegar.

No uses ni publiques una clave `service_role` o secret key en el navegador.

## Panel docente

Abre [http://localhost:5173/dashboard.html](http://localhost:5173/dashboard.html) y escribe el valor de `TEACHER_ACCESS_CODE`. El panel consulta `/api/dashboard`, una función de Vercel que usa la clave administrativa exclusivamente en el servidor.

Para que funcione en Vercel, configura estas variables para el entorno correspondiente y vuelve a desplegar:

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para el juego.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `TEACHER_ACCESS_CODE` para el panel docente.

No prefijes las tres últimas con `VITE_`: deben permanecer privadas en el entorno de Vercel. En local, cópialas desde `.env.example` hacia `.env`; durante el despliegue, Vercel publica la función en `/api/dashboard`.

## Diagnóstico de Supabase

Tras desplegar, abre `https://tu-dominio.vercel.app/?test_db=1` y revisa la consola del navegador. El diagnóstico informa si faltan variables, si la red no llega a Supabase o si la conexión funciona; nunca imprime la clave pública.
