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

### Constelaciones

- Galería de figuras reales del cielo (Orión, Osa Mayor, Casiopea) en `/constellations`, con vista previa SVG dibujada desde las posiciones del propio JSON.
- Cada tarjeta se abre como un proyecto con **forma fija**: en el editor solo se pueden renombrar estrellas, editar pesos y direcciones (y el `node.data` de los algoritmos); agregar, mover o eliminar nodos y aristas, limpiar e importar quedan rechazados **en el store**, no solo deshabilitados en la interfaz.
- El editor muestra un banner con lo que sí se puede hacer, botones *Todas dirigidas* / *Todas no dirigidas* (útil para Johnson) y *Restaurar original*, que devuelve la plantilla conservando el proyecto.
- Eliminar el proyecto no afecta a la plantilla (los JSON viven en `public/constellations/` y nunca se modifican) y exportar produce un JSON normal que, al importarlo en un lienzo libre, deja de estar protegido.
- Véase [Cómo agregar una constelación](#cómo-agregar-una-constelación).

### Algoritmos implementados

| Algoritmo | Estado y comportamiento |
|-----------|-------------------------|
| **Johnson** | Implementado en el backend y disponible desde el editor. Calcula distancias y caminos mínimos entre todos los pares, acepta pesos negativos en grafos dirigidos e informa si hay un ciclo de peso negativo. Requiere que todas las aristas sean dirigidas. |
| **Dijkstra** | Implementado en el backend y disponible desde el editor (`/dijkstra`). Calcula la distancia mínima desde un origen a todos los nodos (y opcionalmente resalta el camino a un destino). Respeta la dirección de cada arista: las dirigidas se recorren solo de origen a destino y las no dirigidas en ambos sentidos; no exige grafo dirigido. Requiere pesos ≥ 0 (con pesos negativos responde 400 remitido a Johnson), ignora bucles, considera todas las aristas paralelas (gana la menor) y trata un peso vacío como 1. Incluye traza paso a paso (nodo fijado y relajaciones), desempate determinista y límite de 100 nodos. |
| **Kruskal** | Implementado en el backend y disponible desde el editor (`/kruskal`). Construye el árbol de expansión mínimo (o máximo, como opción) tratando el grafo como no dirigido: si hay aristas dirigidas lo advierte y las ignora. Ordena las aristas por peso (a igual peso, por su orden original) y acepta las que unen componentes distintos; rechaza bucles y las que formarían ciclo. Un grafo desconexo produce un bosque de expansión con aviso y número de componentes, no un error. Admite pesos negativos y cero, trata un peso vacío como 1 y procesa todas las aristas para mostrar el motivo de cada rechazo. Límites: 100 nodos y 500 aristas. |
| **Asignación (húngaro)** | Implementado en el backend y disponible desde el editor. Resuelve matrices de costos para minimizar o maximizar, muestra las asignaciones y permite recorrer los pasos del algoritmo. Admite matrices rectangulares mediante filas/columnas ficticias; el máximo es 20 × 20. |
| **Esquina Noroeste** | Implementado para problemas de transporte. Traduce nodos con roles de origen/destino, oferta y demanda, y los pesos de las aristas a una matriz de costos. Balancea con filas/columnas ficticias y muestra los pasos; una ruta sin arista es bloqueada y cualquier asignación positiva a ella marca la solución como no factible. Es una solución inicial, no necesariamente óptima. |
| **Árbol binario de búsqueda** | Permite insertar valores uno a uno o generar hasta 31 valores aleatorios únicos de 1 a 99, mostrar pre-order/in-order/post-order y reconstruir con in-order + pre-order o in-order + post-order. También puede cargar un árbol binario desde el grafo del editor y enviar el árbol al grafo. |
| **BFS** | **Stub:** el endpoint existe en la API (`/bfs`) pero devuelve una respuesta simulada (`simulated: true`) y no ejecuta la búsqueda en anchura sobre el grafo. No se presenta en la interfaz como función operativa. |

Dijkstra y Kruskal solo LEEN el grafo: no modifican el lienzo ni el estado del editor, por lo que funcionan igual sobre proyectos libres y sobre constelaciones bloqueadas.

En Dijkstra, la tabla muestra ∞ para los nodos inalcanzables y su camino como vacío. Puedes elegir destino para ver la ruta concreta y su distancia total; cambiar el origen, el destino o el grafo oculta el resultado porque la firma de la entrada ya no coincide. Con pesos negativos la propia pantalla avisa y enlaza a Johnson.

En Kruskal, la lista de aristas muestra todas las decisiones (aceptada/rechazada con su motivo), el peso total y los componentes; si el grafo es desconexo aparece el aviso de bosque. Cambiar el objetivo o el grafo oculta el resultado.

Las entradas, los resultados y el paso seleccionado de Asignación y Esquina Noroeste se conservan al navegar entre secciones durante la misma sesión de la página. Se reinician al recargar el navegador.

La asignación se puede iniciar con una matriz editable o traducir desde el grafo actual. En esa traducción, las conexiones aportan sus pesos y las celdas sin conexión empiezan en `0`; revisa y edita esas celdas antes de calcular, porque el cero puede ser seleccionado como el costo mínimo.

En Esquina Noroeste, asigna a cada nodo el rol de origen o destino y completa su oferta o demanda. La matriz conserva `null` para las rutas bloqueadas (se muestran como `—`), nunca como costo cero. Si se requiere balancear oferta y demanda, el servicio añade un nodo ficticio con costo cero. Los atributos de rol, oferta, demanda y árbol se guardan dentro de `node.data`.

Los árboles reconstruidos a partir de dos recorridos son árboles binarios generales, no necesariamente ABB. No se permiten valores repetidos; pre-order + post-order no se acepta porque no determina un árbol único. Al cargar desde el editor, las aristas deben ser dirigidas de padre a hijo; cuando ambos hijos carecen de `treeSide`, se infiere izquierda/derecha por la posición horizontal.

## Rutas de la aplicación

| Ruta | Pantalla |
|------|----------|
| `/` | Página de inicio |
| `/dashboard` | Gestión de proyectos locales |
| `/constellations` | Catálogo de constelaciones (plantillas de forma fija) |
| `/editor` | Editor de grafos |
| `/galaxy/:projectId` | Editor del grafo de un proyecto guardado |
| `/johnson` | Cálculo de rutas mínimas entre todos los pares |
| `/dijkstra` | Camino mínimo desde un origen (con paso a paso) |
| `/kruskal` | Árbol de expansión mínimo o máximo |
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
| `POST` | `/api/v1/graph/algorithms/dijkstra` | Camino mínimo desde un origen (distancias a todos los nodos, camino opcional a un destino y traza paso a paso); requiere pesos ≥ 0 |
| `POST` | `/api/v1/graph/algorithms/kruskal` | Árbol de expansión mínimo (o máximo); trata el grafo como no dirigido y devuelve bosque si es desconexo |
| `POST` | `/api/v1/graph/algorithms/bfs` | Stub: respuesta simulada (BFS aún no está implementado) |

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
│   ├── public/
│   │   ├── constellations/      # Plantillas de constelaciones + index.json (ver más abajo)
│   │   └── ...                  # Favicon, logo y demás recursos estáticos
│   └── src/
│       ├── components/         # Canvas, navegación, formularios y modales
│       ├── layout/             # Layout compartido del editor y algoritmos
│       ├── pages/              # Inicio, dashboard, editor y pantallas de algoritmos
│       ├── services/           # Cliente HTTP de la API
│       ├── store/              # Estado global del grafo (Zustand)
│       ├── types/              # Tipos del grafo y proyectos
│       ├── utils/              # Importación/exportación, proyectos, catálogo de constelaciones, traducciones y layout de árboles
│       └── lib/                # Utilidades de aristas, geometría y folios
└── figuelovers-backend/
    ├── app/
    │   ├── api/                # Rutas de salud, grafos y algoritmos
    │   ├── schemas/            # Modelos de petición y respuesta
    │   └── services/           # Lógica de grafos, Johnson, Dijkstra, Kruskal, asignación, transporte y árboles
    ├── tests/                  # Pruebas de grafos y algoritmos
    └── requirements.txt
```

## Constelaciones

La sección `/constellations` es una galería de plantillas: grafos de figuras reales con forma fija que se copian a un proyecto propio al abrirlas. El catálogo es **solo datos estáticos**: no hay código por constelación.

### Cómo agregar una constelación

1. Copia el JSON de la constelación a `public/constellations/<archivo>.json`.
2. Agrega una entrada a `public/constellations/index.json`.

Con eso aparece la tarjeta nueva: no hay que tocar TypeScript, rutas ni tests (el test del índice real comprueba que cada entrada tenga su archivo).

**Formato de `public/constellations/index.json`** (una lista JSON):

```json
[
  {
    "id": "orion",
    "name": "Orión",
    "file": "orion.json",
    "description": "El cazador celeste: Betelgeuse y Bellatrix marcan los hombros.",
    "stars": 8
  }
]
```

| Campo | Descripción |
|-------|-------------|
| `id` | Identificador único en el catálogo. Es el valor que se guarda como `constellationId` en el proyecto |
| `name` | Nombre visible en la tarjeta y por defecto del proyecto |
| `file` | Archivo dentro de `public/constellations/` |
| `description` | Una o dos líneas en español |
| `stars` | Número de estrellas (nodos). Debe coincidir con el JSON |

**Requisitos del JSON de la constelación** (los mismos que exige el importador, más reglas estructurales):

- `metadata` (`version`, `name`, `created_at`) y `graph` con `nodes` y `edges`.
- Ids de nodo únicos y todos los nodos con `position: { x, y }`.
- Cada arista referencia nodos existentes; sin self-loops ni parejas repetidas.
- `weight` numérico; una arista **no dirigida** no puede tener peso negativo (el backend la rechaza).

Si un archivo no cumple lo anterior, `src/utils/constellationCatalog.ts` lo rechaza y **solo esa tarjeta** muestra el error; el resto de la galería sigue funcionando. Las plantillas actuales son todas no dirigidas con peso 1: para correr Johnson usa el botón *Todas dirigidas* del editor.

Pruebas relacionadas: `src/utils/constellationCatalog.test.ts` (lee los JSON reales de `public/`), `src/store/useGraphStore.lock.test.ts` (bloqueo), `src/pages/ConstellationsPage.test.tsx` y `src/pages/ProjectEditorPage.constellation.test.tsx`.
