# IMPROVE

App personal de entrenamiento y recuperación (PWA). Funciona sin conexión y se instala en el teléfono.

- **Código**: `src/` (motor de reglas en `src/app/0*.js`, interfaz en `src/app/1*-9*.js`, estilos en `src/styles/`).
- **Publicación**: `node scripts/build.mjs` genera `docs/`, que publica GitHub Pages.
- **Datos**: Firebase (Auth + Firestore) con reglas que solo permiten acceso al dueño. Ningún dato personal vive en este repositorio.
- **IA**: Gemini a través de Firebase AI Logic, protegido con App Check.
- **Prueba local**: `test/serve.sh` y abrir `http://127.0.0.1:8765/?local=1` (modo local, sin Firebase).
- **Ejercicios**: imágenes de [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (dominio público).
- **Mapa del cuerpo**: siluetas de [react-body-highlighter](https://github.com/giavinh79/react-body-highlighter) (MIT, © 2020 GV79) con zonas propias (recto femoral, flexor de cadera, tibial).
- **Aprende**: 67 datos de entrenamiento y recuperación con nivel de evidencia en `src/data/datos-*.json` (el build los une en un JSON con hash). «Investigar» busca estudios en [Europe PMC](https://europepmc.org/RestfulWebService) (respaldo: [OpenAlex](https://openalex.org)) y Gemini resume solo esos estudios, con citas validadas.
- **Pruebas**: `node test/motor.mjs` (seguridad, sesiones movidas, semana de la prueba, plantilla F5/F6, ritmo de progresión, sueño, deuda de sesiones, estado contra tu media, carga, remates por pierna, bloques, tests de rendimiento, agenda sin comidas, sesiones extra, golpeo demostrado en cancha y 6 semanas simuladas, con datos sintéticos propios), `node test/pretemporada.mjs` (enfermedad con vuelta gradual y pretemporada hacia una prueba, 15 días simulados), `node test/{places.mjs,coverage.js} <fixture>` (motor) y `node test/{smoke,flows,flows2,glitch,balon,molestias,pendientes,aprende,motor-ui,contar,extra,pre-ui}.mjs <fixture> <carpeta>` (modo local, con `test/serve.sh`). Fixture sintético: `node test/make-fixture.mjs fx.json`; fecha fija: `FAKE_NOW=2026-10-31T10:00:00-03:00 node -r ./test/clock-hook.cjs test/<x>.mjs …`.
