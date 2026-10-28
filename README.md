# IMPROVE

App personal de entrenamiento, recuperación y comida (PWA). Funciona sin conexión y se instala en el teléfono.

- **Código**: `src/` (motor de reglas en `src/app/0*.js`, interfaz en `src/app/1*-9*.js`, estilos en `src/styles/`).
- **Publicación**: `node scripts/build.mjs` genera `docs/`, que publica GitHub Pages.
- **Datos**: Firebase (Auth + Firestore) con reglas que solo permiten acceso al dueño. Ningún dato personal vive en este repositorio.
- **IA**: Gemini a través de Firebase AI Logic, protegido con App Check.
- **Prueba local**: `test/serve.sh` y abrir `http://127.0.0.1:8765/?local=1` (modo local, sin Firebase).
- **Ejercicios**: imágenes de [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (dominio público).
