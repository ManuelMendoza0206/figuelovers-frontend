# Aristografos

Editor visual de grafos con algoritmos (Dijkstra, BFS, y futuros: Johnson, Asignación).

## Stack

- React 19 + TypeScript + Vite
- React Flow 11 (lienzo de grafos)
- Zustand (estado global)
- Tailwind CSS v4 (estilos)
- Axios (API client)

## Requisitos

- Node 20+
- Backend FastAPI corriendo en `http://localhost:8000` (configurable via `VITE_API_URL`)

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | URL base del backend FastAPI |

Crea un `.env.local` si necesitás sobrescribir:

```
VITE_API_URL=http://mi-backend:8000
```

## Estructura del proyecto

```
src/
├── components/       # Componentes UI (canvas, modales, toolbar, sidebar, navbar)
├── layout/           # MainLayout (shell con navbar + sidebar + canvas)
├── store/            # Zustand store (useGraphStore)
├── services/         # API client (GraphServiceAPI)
├── types/            # Tipos compartidos (graph.ts)
├── utils/            # Utilidades puras (graphFile.ts, geometría futura)
├── hooks/            # Hooks reutilizables (fase 3+)
└── ui/               # Primitivas UI (Modal, Button, etc. - fase 2+)
```

## Flujo principal

1. Usuario dibuja/edita grafo en el canvas (React Flow)
2. `Navbar` → "Matriz" / "Lista" llama a `GraphServiceAPI.validateGraph`
3. Backend devuelve matriz/lista de adyacencia + validaciones
4. Modales muestran resultados
5. Import/Export JSON via `graphFile.ts` (File System Access API + fallback)

## Próximas secciones (roadmap)

- `/johnson` — Algoritmo de Johnson (todos los pares camino más corto)
- `/asignacion` — Problema de asignación (Hungarian)

Cada sección tendrá su propia página, store local y componentes, siguiendo el patrón establecido.