# Figuelovers

Aplicación web para crear y explorar grafos, consultar sus representaciones y resolver problemas de rutas y asignación. El proyecto se divide en dos aplicaciones: el frontend React/Vite y una API FastAPI ubicada en `../figuelovers-backend`.

## Funcionalidades

### Editor y proyectos

- Crear y mover nodos, conectar pares de nodos y seleccionar elementos en un lienzo interactivo.
- Editar etiquetas de nodos y peso/dirección de aristas; invertir o eliminar aristas, eliminar nodos y limpiar el grafo.
- Crear, renombrar, abrir y eliminar proyectos desde el dashboard. Los proyectos y sus grafos se guardan en el `localStorage` del navegador; no se necesita una base de datos.
- Exportar un grafo como JSON e importar un JSON validado por el backend.
- Consultar la matriz y la lista de adyacencia del grafo mediante la API.
- Guardar metadatos adicionales por nodo en `node.data`; los proyectos locales y el JSON conservan estos datos al importar/exportar.

### Algoritmos implementados

| Algoritmo | Estado y comportamiento |
|-----------|-------------------------|
| **Johnson** | Implementado en el backend y disponible desde el editor. Calcula distancias y caminos mínimos entre todos los pares, acepta pesos negativos en grafos dirigidos e informa si hay un ciclo de peso negativo. Requiere que todas las aristas sean dirigidas. |
| **Asignación (húngaro)** | Implementado en el backend y disponible desde el editor. Resuelve matrices de costos para minimizar o maximizar, muestra las asignaciones y permite recorrer los pasos del algoritmo. Admite matrices rectangulares mediante filas/columnas ficticias; el máximo es 20 × 20. |
| **Esquina Noroeste** | Implementado para problemas de transporte. Traduce nodos con roles de origen/destino, oferta y demanda, y los pesos de las aristas a una matriz de costos. Balancea con filas/columnas ficticias y muestra los pasos; una ruta sin arista es bloqueada y cualquier asignación positiva a ella marca la solución como no factible. Es una solución inicial, no necesariamente óptima. |
| **Árbol binario de búsqueda** | Permite insertar valores uno a uno o generar hasta 31 valores aleatorios únicos de 1 a 99, mostrar pre-order/in-order/post-order y reconstruir con in-order + pre-order o in-order + post-order. También puede cargar un árbol binario desde el grafo del editor y enviar el árbol al grafo. |
| **Dijkstra y BFS** | Los endpoints existen en la API, pero actualmente devuelven respuestas simuladas y no ejecutan esos algoritmos sobre el grafo. No se presentan como funciones operativas de la interfaz. |

La asignación se puede iniciar con una matriz editable o traducir desde el grafo actual. En esa traducción, las conexiones aportan sus pesos y las celdas sin conexión empiezan en `0`; revisa y edita esas celdas antes de calcular, porque el cero puede ser seleccionado como el costo mínimo.

En Esquina Noroeste, asigna a cada nodo el rol de origen o destino y completa su oferta o demanda. La matriz conserva `null` para las rutas bloqueadas (se muestran como `—`), nunca como costo cero. Si se requiere balancear oferta y demanda, el servicio añade un nodo ficticio con costo cero. Los atributos de rol, oferta, demanda y árbol se guardan dentro de `node.data`.

Los árboles reconstruidos a partir de dos recorridos son árboles binarios generales, no necesariamente ABB. No se permiten valores repetidos; pre-order + post-order no se acepta porque no determina un árbol único. Al cargar desde el editor, las aristas deben ser dirigidas de padre a hijo; cuando ambos hijos carecen de `treeSide`, se infiere izquierda/derecha por la posición horizontal.

## Rutas de la aplicación

| Ruta | Pantalla |
|------|----------|
| `/` | Página de inicio |
| `/dashboard` | Gestión de proyectos locales |
| `/editor` | Editor de grafos |
| `/galaxy/:projectId` | Editor del grafo de un proyecto guardado |
| `/johnson` | Cálculo de rutas mínimas entre todos los pares |
| `/assignment` | Problema de asignación |
| `/northwest` | Método de la esquina noroeste para transporte |
| `/trees` | Construcción, recorrido y reconstrucción de árboles |

## Tecnologías

- **Frontend:** React 19, TypeScript, Vite 8, React Router 7, React Flow 11, Zustand, Tailwind CSS 4, Axios y Lucide.
- **Backend:** Python, FastAPI, Pydantic, NetworkX, NumPy y SciPy.
- **Pruebas:** Vitest y Testing Library en el frontend; pytest en el backend.

## Requisitos

- Node.js compatible con Vite 8 (Node.js 20.19+ o 22.12+).
- Python 3.10 o posterior.
- npm.

## Desarrollo local

Ejecuta frontend y backend en terminales separadas.

### 1. Backend

Desde el directorio `figuelovers-backend`:

```bash
python -m venv .venv
```

Activa el entorno virtual:

```bash
# Linux / macOS
source .venv/bin/activate

# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

Instala dependencias e inicia FastAPI:

```bash
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

La API queda disponible en `http://localhost:8000`. La documentación interactiva está en `http://localhost:8000/docs`; el esquema OpenAPI, en `http://localhost:8000/api/v1/openapi.json`.

### 2. Frontend

Desde el directorio `figuelovers-frontend`:

```bash
npm ci
npm run dev
```

Vite muestra en la terminal la URL local, normalmente `http://localhost:5173`.

### Variables de entorno del frontend

| Variable | Valor predeterminado | Descripción |
|----------|----------------------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | URL base del backend. El cliente agrega `/api/v1`. |

Para cambiarla, crea `figuelovers-frontend/.env.local`, por ejemplo:

```dotenv
VITE_API_URL=http://localhost:8000
```

El backend permite por defecto los orígenes locales de Vite (`localhost` y `127.0.0.1`, incluidos los puertos de desarrollo habituales).

## API disponible

Los endpoints de la aplicación, excepto la comprobación raíz, están bajo el prefijo `/api/v1`.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/` | Estado de la API |
| `GET` | `/api/v1/health` | Comprobación de salud |
| `POST` | `/api/v1/graph/validate` | Valida el grafo y devuelve estadísticas, matriz y lista de adyacencia |
| `POST` | `/api/v1/graph/import` | Valida y devuelve un grafo importado desde JSON |
| `POST` | `/api/v1/graph/algorithms/johnson` | Distancias y caminos mínimos de todos los pares |
| `POST` | `/api/v1/graph/algorithms/assignment` | Optimización de una matriz de asignación |
| `POST` | `/api/v1/graph/algorithms/northwest` | Solución inicial por esquina noroeste para un problema de transporte |
| `POST` | `/api/v1/graph/algorithms/tree/build` | Construcción de ABB por valores o números aleatorios |
| `POST` | `/api/v1/graph/algorithms/tree/traverse` | Recorrido de un árbol o validación/recorrido de un grafo del editor |
| `POST` | `/api/v1/graph/algorithms/tree/reconstruct` | Reconstrucción a partir de in-order y pre-order o post-order |
| `POST` | `/api/v1/graph/algorithms/dijkstra` | Stub: respuesta simulada |
| `POST` | `/api/v1/graph/algorithms/bfs` | Stub: respuesta simulada |

## Comandos útiles

En `figuelovers-frontend`:

```bash
npm run dev       # servidor de desarrollo
npm run build     # comprobación TypeScript y build de producción
npm run preview   # vista previa del build
npm run lint      # ESLint
npm test          # pruebas Vitest
```

En `figuelovers-backend` (con el entorno virtual activado):

```bash
python -m pip install -r requirements.txt pytest httpx2
python -m pytest -q
```

`pytest` y `httpx2` se instalan para pruebas: no están incluidos en `requirements.txt`. La versión de Starlette instalada por FastAPI usa `httpx2` en `TestClient`; no lo sustituyas por `httpx`.

## Estructura

```text
proyecto/
├── figuelovers-frontend/
│   ├── public/                 # Recursos estáticos y grafos de ejemplo
│   └── src/
│       ├── components/         # Canvas, navegación, formularios y modales
│       ├── layout/             # Layout compartido del editor y algoritmos
│       ├── pages/              # Inicio, dashboard, editor y pantallas de algoritmos
│       ├── services/           # Cliente HTTP de la API
│       ├── store/              # Estado global del grafo (Zustand)
│       ├── types/              # Tipos del grafo y proyectos
│       ├── utils/              # Importación/exportación, proyectos, traducciones y layout de árboles
│       └── lib/                # Utilidades de aristas, geometría y folios
└── figuelovers-backend/
    ├── app/
    │   ├── api/                # Rutas de salud, grafos y algoritmos
    │   ├── schemas/            # Modelos de petición y respuesta
    │   └── services/           # Lógica de grafos, Johnson, asignación, transporte y árboles
    ├── tests/                  # Pruebas de grafos y algoritmos
    └── requirements.txt
```
