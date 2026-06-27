# Claude Web — Hub de Conocimiento CCA-F

> Documentación en español sobre **Claude Code** y la **API de Claude**, con búsqueda full-text y examen de práctica para la certificación **CCA-F**.

---

## ¿Qué es esto?

Un hub editorial estático — sin backend, sin base de datos — que centraliza la documentación técnica de Claude en español y la combina con un simulador de examen fiel al formato real de la certificación **Claude Certified Architect — Foundations**.

---

## Características principales

| Módulo | Descripción |
|---|---|
| **Colecciones curadas** | Documentación organizada por dominio, con secciones, artículos y bloques de contenido enriquecido |
| **Búsqueda full-text** | Puntuación por relevancia en títulos, resúmenes y cuerpo — con debounce de 280 ms |
| **Tema claro / oscuro** | Detección automática de preferencia del sistema, alternancia persistente |
| **Examen de práctica** | 60 preguntas con pesos oficiales por dominio, temporizador de 120 min e informe de resultados |

---

## Inicio rápido

```bash
npm install
npm run dev       # → http://localhost:5173
npm run build     # build de producción en dist/
npm run preview   # previsualiza el build local
```

---

## Examen de práctica CCA-F

Disponible en `/practice`. Simula las condiciones reales del examen:

- **60 preguntas** aleatorias extraídas de un pool categorizado por dominio
- **Distribución ponderada** que respeta los pesos oficiales de cada área
- **Temporizador** de 120 minutos (2 min/pregunta)
- **Informe de rendimiento** por dominio al finalizar
- **Mapa de navegación** para saltar entre preguntas

### Dominios del examen

| Dominio | Peso |
|---|---|
| Agentic Architecture & Orchestration | 27% |
| Claude Code Configuration & Workflows | 20% |
| Prompt Engineering & Structured Output | 20% |
| Tool Design & MCP Integration | 18% |
| Context Management & Reliability | 15% |

---

## Estructura del proyecto

```
public/
  data/             → Archivos JSON con todo el contenido (cargados en runtime)
    content.json    → Índice maestro de colecciones
    *.json          → Una colección por archivo
  practice/
    index.html      → Página standalone del examen (sin dependencia del bundle principal)

src/
  App.jsx           → Toda la UI, ruteo, estado y renderizadores de bloques (~900 líneas)
  searchEngine.js   → Motor de búsqueda full-text con sistema de puntuación
  styles.css        → Directivas Tailwind + propiedades CSS para tema claro/oscuro
```

---

## Stack

- **React 18** — UI
- **Vite 8** — Build tool y servidor de desarrollo
- **Tailwind CSS** — Estilos utilitarios
- **highlight.js** — Resaltado de sintaxis en bloques de código

---

## Agregar contenido

1. Crear o editar un archivo JSON en `public/data/` siguiendo el esquema de colecciones.
2. Registrarlo en `public/data/content.json`.
3. No se requiere rebuild — los archivos se cargan en runtime.

---

## Licencia

[MIT](LICENSE) — libre para usar, modificar y distribuir.
