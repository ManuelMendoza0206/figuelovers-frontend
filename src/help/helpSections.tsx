import {
  ArrowRight,
  ArrowUpDown,
  ChartNoAxesColumn,
  Check,
  Crosshair,
  Database,
  Dices,
  Download,
  Eraser,
  Gauge,
  GitBranch,
  List,
  ListOrdered,
  MousePointerClick,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Route,
  SendHorizontal,
  SkipBack,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  Workflow,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type HelpSectionId =
  | 'editor'
  | 'constellations'
  | 'johnson'
  | 'assignment'
  | 'northwest'
  | 'trees'
  | 'sort';

export interface HelpStep {
  /** Acción corta; se muestra como título del paso. */
  title: string;
  /** Qué hace y qué botón tocar. */
  detail: string;
}

export interface HelpControl {
  icon: ReactNode;
  /** Nombre exacto que aparece en la interfaz. */
  label: string;
  description: string;
}

export interface HelpShortcut {
  keys: string;
  label: string;
}

export interface HelpSection {
  id: HelpSectionId;
  eyebrow: string;
  title: string;
  summary: string;
  /** Etiqueta corta que acompaña al botón flotante. */
  fabLabel: string;
  icon: ReactNode;
  steps: HelpStep[];
  controls: HelpControl[];
  notes?: string[];
  shortcuts?: HelpShortcut[];
}

export const HELP_SECTIONS: Record<HelpSectionId, HelpSection> = {
  editor: {
    id: 'editor',
    eyebrow: 'Editor de constelaciones',
    title: 'Construí y conectá tu grafo',
    summary:
      'Este es el lienzo donde nacen las estrellas y las rutas que después usan todos los algoritmos.',
    fabLabel: 'Editor',
    icon: <MousePointerClick className="h-5 w-5" aria-hidden="true" />,
    steps: [
      {
        title: 'Elegí una herramienta',
        detail:
          'En la barra del lienzo están «Interactuar», «Conectar», «Añadir nodo» y «Eliminar». También podés usar las teclas Q, W, E y P.',
      },
      {
        title: 'Creá las estrellas',
        detail:
          'Con «Añadir nodo» hacé clic en una zona vacía. En «Interactuar» también podés hacer doble clic sobre el fondo si la forma no está bloqueada.',
      },
      {
        title: 'Trazá las conexiones',
        detail:
          'Con «Conectar», arrastrá desde una estrella hasta otra. La dirección de la flecha va del origen al destino.',
      },
      {
        title: 'Editá los datos',
        detail:
          'Volvé a «Interactuar», seleccioná una estrella o una conexión y cambiá nombre, peso, dirección, rol, oferta o demanda en el panel derecho.',
      },
      {
        title: 'Ejecutá un algoritmo',
        detail:
          'Desde el panel derecho entrá a JOHNSON, ASIGNACION, ARBOLES, NORTHWEST o SORT. Los resultados se conservan cuando volvés.',
      },
    ],
    controls: [
      {
        icon: <MousePointerClick className="h-4 w-4" aria-hidden="true" />,
        label: 'Interactuar (Q)',
        description: 'Seleccioná y mové estrellas; el elemento elegido se edita en el panel derecho.',
      },
      {
        icon: <GitBranch className="h-4 w-4" aria-hidden="true" />,
        label: 'Conectar (W)',
        description: 'Arrastrá desde una estrella hasta otra para crear una conexión dirigida.',
      },
      {
        icon: <Plus className="h-4 w-4" aria-hidden="true" />,
        label: 'Añadir nodo (E)',
        description: 'Hacé clic en el vacío para crear una estrella nueva.',
      },
      {
        icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
        label: 'Eliminar (P)',
        description: 'Hacé clic en una estrella o conexión y confirmá el borrado.',
      },
      {
        icon: <Eraser className="h-4 w-4" aria-hidden="true" />,
        label: 'Limpiar Todo (O)',
        description: 'Borra todo el lienzo; pide confirmación antes de hacerlo.',
      },
      {
        icon: <Database className="h-4 w-4" aria-hidden="true" />,
        label: 'Ver matriz',
        description: 'Abrí la matriz de adyacencia del grafo actual.',
      },
      {
        icon: <List className="h-4 w-4" aria-hidden="true" />,
        label: 'Ver lista',
        description: 'Abrí la lista de adyacencia del grafo actual.',
      },
      {
        icon: <Download className="h-4 w-4" aria-hidden="true" />,
        label: 'Guardar JSON',
        description: 'Descargá el grafo con sus datos para volver a importarlo.',
      },
      {
        icon: <Upload className="h-4 w-4" aria-hidden="true" />,
        label: 'Cargar JSON',
        description: 'Importá un grafo validado desde un archivo.',
      },
    ],
    notes: [
      'Si abriste una constelación, la forma está bloqueada: podés renombrar estrellas y cambiar pesos o direcciones, pero no agregar, mover ni borrar estructura. «Restaurar original» vuelve a la plantilla.',
      'En el editor de un proyecto, «Todas dirigidas» y «Todas no dirigidas» cambian la dirección de todas las conexiones sin alterar la forma.',
      'En un proyecto guardado, los cambios se guardan en localStorage; el editor suelto (/editor) no está asociado a un proyecto, así que usá «Guardar JSON» si querés conservarlo.',
      'El árbol y los resultados de los algoritmos viven en stores de sesión, así que no se pierden al navegar.',
    ],
    shortcuts: [
      { keys: 'Q', label: 'Interactuar' },
      { keys: 'W', label: 'Conectar' },
      { keys: 'E', label: 'Añadir nodo' },
      { keys: 'P', label: 'Eliminar' },
      { keys: 'O', label: 'Limpiar todo' },
      { keys: 'H', label: 'Abrir o cerrar esta ayuda' },
      { keys: 'Esc', label: 'Volver a Interactuar' },
    ],
  },

  constellations: {
    id: 'constellations',
    eyebrow: 'Catálogo estelar',
    title: 'Constelaciones famosas',
    summary:
      'Son plantillas de figuras reales. Al abrirlas se copian a un proyecto propio y conservan la forma original.',
    fabLabel: 'Constelaciones',
    icon: <Sparkles className="h-5 w-5" aria-hidden="true" />,
    steps: [
      {
        title: 'Elegí una tarjeta',
        detail:
          'Cada tarjeta muestra la figura, su descripción y la cantidad de estrellas. Si una tarjeta falla, podés reintentar el catálogo sin perder las demás.',
      },
      {
        title: 'Abrí la constelación',
        detail:
          'Usá «Abrir constelación» para crear una copia nueva. Si ya existe un proyecto de esa figura, elegí «Continuar» o «Crear copia nueva».',
      },
      {
        title: 'Editá lo permitido',
        detail:
          'En el editor podés renombrar estrellas, cambiar pesos, invertir direcciones y completar roles, ofertas o demandas. La forma de la figura no se toca.',
      },
      {
        title: 'Probá los algoritmos',
        detail:
          'Desde el panel derecho corré JOHNSON, ASIGNACION, ARBOLES, NORTHWEST o SORT sobre la copia. La plantilla original nunca se modifica.',
      },
      {
        title: 'Volvé a la figura original',
        detail:
          'Si necesitás recuperar la plantilla, abrí el proyecto y usá «Restaurar original» en el editor.',
      },
    ],
    controls: [
      {
        icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
        label: 'Abrir constelación',
        description: 'Copiá la plantilla a un proyecto nuevo listo para editar.',
      },
      {
        icon: <ArrowRight className="h-4 w-4" aria-hidden="true" />,
        label: 'Continuar',
        description: 'Abrí el proyecto que ya existe para esa constelación.',
      },
      {
        icon: <Plus className="h-4 w-4" aria-hidden="true" />,
        label: 'Crear copia nueva',
        description: 'Creá otra copia de la figura sin tocar el proyecto anterior.',
      },
      {
        icon: <RefreshCw className="h-4 w-4" aria-hidden="true" />,
        label: 'Reintentar',
        description: 'Volvé a cargar el catálogo si una tarjeta no pudo leer su archivo.',
      },
      {
        icon: <RotateCcw className="h-4 w-4" aria-hidden="true" />,
        label: 'Restaurar original',
        description: 'En el editor, devolvé la forma y los datos de la plantilla.',
      },
    ],
    notes: [
      'El catálogo es de solo lectura: vive en public/constellations y no se edita desde la aplicación.',
      'La forma protegida se aplica en el store, no solo en los botones: agregar, mover o borrar estructura se rechaza aunque se intente por otro camino.',
      'Exportar el proyecto a JSON te permite conservar una copia fuera del navegador.',
    ],
  },

  johnson: {
    id: 'johnson',
    eyebrow: 'Algoritmo de caminos mínimos',
    title: 'JOHNSON · todos contra todos',
    summary:
      'Calcula la distancia mínima entre todos los pares de nodos de un grafo dirigido, incluso con pesos negativos.',
    fabLabel: 'Johnson',
    icon: <Route className="h-5 w-5" aria-hidden="true" />,
    steps: [
      {
        title: 'Prepará el grafo',
        detail:
          'Abrí un proyecto con nodos y conexiones. Johnson necesita aristas dirigidas: si hace falta, usá «Todas dirigidas» en el editor de un proyecto.',
      },
      {
        title: 'Entrá a JOHNSON',
        detail:
          'Tocá «JOHNSON» en el panel derecho. La página muestra el grafo y los controles de origen y destino.',
      },
      {
        title: 'Completá los nombres',
        detail:
          'Si hay estrellas sin nombre, la tarjeta de aviso te deja completarlos antes de calcular.',
      },
      {
        title: 'Elegí «Origen» y «Destino»',
        detail:
          'Esos dos selects eligen el camino que se resalta en la pizarra cuando vuelvas.',
      },
      {
        title: 'Presioná «Calcular»',
        detail:
          'El resultado vuelve al editor: el camino queda resaltado y el resumen flota abajo con las distancias.',
      },
      {
        title: 'Consultá la matriz completa',
        detail:
          'Usá «Ver matriz» en la barra superior para revisar todas las distancias y los infinitos.',
      },
    ],
    controls: [
      {
        icon: <Play className="h-4 w-4" aria-hidden="true" />,
        label: 'Calcular',
        description: 'Ejecutá Johnson y volvé a la pizarra con el camino resaltado.',
      },
      {
        icon: <Route className="h-4 w-4" aria-hidden="true" />,
        label: 'Origen / Destino',
        description: 'El par de nodos cuyo camino se quiere ver.',
      },
      {
        icon: <Database className="h-4 w-4" aria-hidden="true" />,
        label: 'Ver matriz',
        description: 'Mostrá la matriz de distancias completa del resultado.',
      },
      {
        icon: <ChartNoAxesColumn className="h-4 w-4" aria-hidden="true" />,
        label: 'JOHNSON',
        description: 'Abrí esta sección desde el panel de algoritmos.',
      },
    ],
    notes: [
      'Johnson agrega una fuente artificial, usa Bellman-Ford para detectar ciclos negativos y luego ejecuta Dijkstra desde cada nodo.',
      'Los pesos negativos están permitidos. Si hay un ciclo negativo, no se pueden definir distancias mínimas y el cálculo lo informa.',
      'El símbolo ∞ significa que no existe camino entre ese par de nodos.',
      'El resultado se guarda en la sesión y sobrevive al cambiar de sección. Si editás el grafo, el resultado deja de mostrarse para no quedar desactualizado.',
      'Si el grafo es una constelación, la forma está bloqueada; los pesos y las direcciones sí se pueden editar.',
    ],
  },

  assignment: {
    id: 'assignment',
    eyebrow: 'Algoritmo de asignación',
    title: 'Asignación húngara',
    summary:
      'Resuelve una matriz de costos o beneficios para repartir tareas entre recursos, sin usar los nodos del grafo.',
    fabLabel: 'Asignación',
    icon: <Crosshair className="h-5 w-5" aria-hidden="true" />,
    steps: [
      {
        title: 'Definí el tamaño',
        detail:
          'Ajustá «Filas» y «Columnas». El máximo es 20 × 20 y las matrices rectangulares se completan con filas o columnas ficticias.',
      },
      {
        title: 'Elegí el objetivo',
        detail:
          'En «Objetivo» seleccioná «Minimizar costo» o «Maximizar beneficio».',
      },
      {
        title: 'Completá la matriz',
        detail:
          'Editá cada costo y los nombres de fila y columna. Si venís de una constelación, la matriz se traduce automáticamente desde sus conexiones.',
      },
      {
        title: 'Calculá',
        detail:
          'Presioná «Calcular asignación». El resultado muestra los pares asignados y el costo o beneficio total.',
      },
      {
        title: 'Mirá el proceso',
        detail:
          'Usá «Ver proceso paso a paso» para abrir la traza. Avanzá con «Anterior», «Siguiente» o el slider «Paso del algoritmo».',
      },
    ],
    controls: [
      {
        icon: <ListOrdered className="h-4 w-4" aria-hidden="true" />,
        label: 'Filas / Columnas',
        description: 'Definen el tamaño de la matriz; el máximo es 20 × 20.',
      },
      {
        icon: <Crosshair className="h-4 w-4" aria-hidden="true" />,
        label: 'Objetivo',
        description: 'Elegí entre minimizar costo y maximizar beneficio.',
      },
      {
        icon: <Play className="h-4 w-4" aria-hidden="true" />,
        label: 'Calcular asignación',
        description: 'Resolvé la matriz y mostrá la asignación óptima.',
      },
      {
        icon: <ChartNoAxesColumn className="h-4 w-4" aria-hidden="true" />,
        label: 'Ver proceso paso a paso',
        description: 'Abrí la traza didáctica; se puede cerrar con «Ocultar proceso».',
      },
      {
        icon: <SkipBack className="h-4 w-4" aria-hidden="true" />,
        label: 'Anterior / Siguiente',
        description: 'Recorré los pasos de la traza o del resultado.',
      },
    ],
    notes: [
      'Esta pantalla no usa los nodos del grafo: es una matriz independiente. Al traducir una constelación, las aristas dirigidas completan [origen][destino] y las no dirigidas completan ambos sentidos.',
      'Las celdas sin conexión aparecen como prohibidas y no se envían como costo real. Un 0 sí es una conexión válida de costo cero.',
      'Para maximizar, cada valor se transforma como máximo − valor.',
      'La traza es didáctica; la asignación final la resuelve el solver de asignación lineal del backend.',
    ],
  },

  northwest: {
    id: 'northwest',
    eyebrow: 'Método de transporte',
    title: 'Esquina Noroeste',
    summary:
      'Construye una solución inicial de transporte desde la celda superior izquierda. Es un punto de partida: no optimiza el costo.',
    fabLabel: 'Noroeste',
    icon: <Truck className="h-5 w-5" aria-hidden="true" />,
    steps: [
      {
        title: 'Cargá un grafo',
        detail:
          'Abrí un proyecto con nodos y conexiones; después entrá a NORTHWEST desde el panel derecho.',
      },
      {
        title: 'Asigná los roles',
        detail:
          'En cada tarjeta elegí «Origen», «Destino» o «No participa». Los roles también se pueden inferir de las aristas.',
      },
      {
        title: 'Completá oferta y demanda',
        detail:
          'Los orígenes usan el campo «Oferta» y los destinos el campo «Demanda». Los totales deben ser mayores que cero.',
      },
      {
        title: 'Calculá la solución inicial',
        detail:
          'Presioná «Calcular solución inicial». El resultado muestra la tabla de asignaciones y los totales restantes.',
      },
      {
        title: 'Recorré los pasos',
        detail:
          'Avanzá con «Anterior», «Siguiente» o el slider «Paso actual» para ver cómo se asigna cada cantidad.',
      },
    ],
    controls: [
      {
        icon: <Truck className="h-4 w-4" aria-hidden="true" />,
        label: 'Rol',
        description: 'Marcá cada nodo como «Origen», «Destino» o «No participa».',
      },
      {
        icon: <ListOrdered className="h-4 w-4" aria-hidden="true" />,
        label: 'Oferta / Demanda',
        description: 'Cantidades disponibles en cada origen y pedidas por cada destino.',
      },
      {
        icon: <Play className="h-4 w-4" aria-hidden="true" />,
        label: 'Calcular solución inicial',
        description: 'Ejecutá la esquina noroeste y armá la tabla de transporte.',
      },
      {
        icon: <SkipBack className="h-4 w-4" aria-hidden="true" />,
        label: 'Anterior / Siguiente',
        description: 'Recorré la asignación paso a paso.',
      },
      {
        icon: <Gauge className="h-4 w-4" aria-hidden="true" />,
        label: 'Paso actual',
        description: 'El slider permite saltar a cualquier paso de la solución.',
      },
    ],
    notes: [
      'En cada paso se asigna el mínimo entre la oferta y la demanda restantes, y se cierra la fila o la columna que se agota.',
      'Una celda sin arista es una ruta bloqueada (—), no un costo cero. Si recibe cantidad, el resultado se marca NO FACTIBLE.',
      'Si la oferta y la demanda no coinciden, se agrega un origen o destino ficticio (dummy) para balancear la tabla.',
      'La solución inicial no minimiza el costo; para optimizar hace falta otro método de transporte.',
      'Cuando oferta y demanda se agotan a la vez, se marca una celda básica degenerada con asignación cero.',
    ],
  },

  trees: {
    id: 'trees',
    eyebrow: 'Árbol binario de búsqueda',
    title: 'Construir y recorrer',
    summary:
      'Crea un ABB, recorre sus nodos en el orden que elijas y, si querés, envíalo al editor como grafo.',
    fabLabel: 'Árboles',
    icon: <GitBranch className="h-5 w-5" aria-hidden="true" />,
    steps: [
      {
        title: 'Elegí el modo de carga',
        detail:
          'Usá «Valores individuales» para escribir números o «Aleatorio» para generar una cantidad.',
      },
      {
        title: 'Cargá los valores',
        detail:
          'En modo manual, separá los números con comas y presioná «Agregar». En aleatorio, elegí la cantidad y presioná «Generar árbol».',
      },
      {
        title: 'Mirá el dibujo',
        detail:
          'El panel derecho muestra el árbol y los tres recorridos posibles.',
      },
      {
        title: 'Elegí el orden',
        detail:
          'En el select «Orden» elegí Pre-order, In-order o Post-order.',
      },
      {
        title: 'Recorré',
        detail:
          'Presioná «Recorrer» para iniciar la visita. Avanzá con «Anterior», «Siguiente» o el slider «Visita actual».',
      },
      {
        title: 'Llevalo al editor',
        detail:
          '«Enviar al editor» reemplaza el grafo actual por el árbol. Si ya hay contenido, pide confirmación.',
      },
    ],
    controls: [
      {
        icon: <ListOrdered className="h-4 w-4" aria-hidden="true" />,
        label: 'Valores individuales',
        description: 'Entrá en modo manual para escribir los números separados por comas.',
      },
      {
        icon: <Dices className="h-4 w-4" aria-hidden="true" />,
        label: 'Aleatorio',
        description: 'Generá un árbol con la cantidad de nodos que indiques.',
      },
      {
        icon: <Plus className="h-4 w-4" aria-hidden="true" />,
        label: 'Agregar',
        description: 'Insertá en el ABB los valores escritos, en el orden ingresado.',
      },
      {
        icon: <RefreshCw className="h-4 w-4" aria-hidden="true" />,
        label: 'Reiniciar / Generar árbol',
        description: 'Vaciá el árbol actual o generá uno aleatorio nuevo.',
      },
      {
        icon: <Workflow className="h-4 w-4" aria-hidden="true" />,
        label: 'Usar el grafo del editor',
        description: 'Convertí el grafo actual en un árbol; si no es ABB, lo recorre como árbol general.',
      },
      {
        icon: <Play className="h-4 w-4" aria-hidden="true" />,
        label: 'Recorrer',
        description: 'Iniciá la visita con el orden elegido.',
      },
      {
        icon: <SendHorizontal className="h-4 w-4" aria-hidden="true" />,
        label: 'Enviar al editor',
        description: 'Reemplazá el grafo actual con el árbol construido.',
      },
    ],
    notes: [
      'El máximo práctico es de 31 nodos. En un ABB los valores no se repiten; los menores van a la izquierda y los mayores a la derecha.',
      'Si cargás un grafo que no cumple la propiedad de búsqueda, se usa como árbol binario general.',
      'El árbol se guarda en el grafo como aristas dirigidas padre → hijo con los metadatos treeValue y treeSide.',
      'El árbol y su recorrido se conservan al cambiar de sección.',
    ],
  },

  sort: {
    id: 'sort',
    eyebrow: 'Algoritmos de ordenamiento',
    title: 'SORT · ordenar en barras',
    summary:
      'Ordena una lista con burbuja, selección o inserción y mirá cada comparación y cada movimiento.',
    fabLabel: 'Sort',
    icon: <ArrowUpDown className="h-5 w-5" aria-hidden="true" />,
    steps: [
      {
        title: 'Elegí el algoritmo',
        detail:
          'En el panel Sort elegí «Burbuja», «Selección» o «Inserción». Los tres ordenan de menor a mayor.',
      },
      {
        title: 'Cargá los números',
        detail:
          'En «Manual», escribí los valores separados por comas o espacios y presioná «Aplicar lista». En «Aleatorio», elegí la cantidad y presioná «Generar números».',
      },
      {
        title: 'Reproducí la animación',
        detail:
          'Usá «Reproducir» para avanzar solo y «Pausar» para detenerte. También podés usar «Paso anterior», «Paso siguiente» o arrastrar el slider «Progreso del ordenamiento».',
      },
      {
        title: 'Ajustá la velocidad',
        detail:
          'El control «Velocidad de la animación» va de 0.5× a 6×. La transición de las barras se sincroniza con cada paso.',
      },
      {
        title: 'Leé la escena',
        detail:
          'La leyenda inferior explica los colores y el contador muestra comparaciones y movimientos. Al terminar, el botón cambia a «Repetir».',
      },
    ],
    controls: [
      {
        icon: <ListOrdered className="h-4 w-4" aria-hidden="true" />,
        label: 'Manual / Aleatorio',
        description: 'Cambian entre una lista escrita y una generada al azar.',
      },
      {
        icon: <Check className="h-4 w-4" aria-hidden="true" />,
        label: 'Aplicar lista / Vaciar',
        description: 'Aplican los números escritos o limpian la lista actual.',
      },
      {
        icon: <Dices className="h-4 w-4" aria-hidden="true" />,
        label: 'Generar números',
        description: 'Creá valores únicos entre 5 y 99 con la cantidad elegida.',
      },
      {
        icon: <Play className="h-4 w-4" aria-hidden="true" />,
        label: 'Reproducir / Pausar / Repetir',
        description: 'Controlá la reproducción automática de los pasos.',
      },
      {
        icon: <SkipBack className="h-4 w-4" aria-hidden="true" />,
        label: 'Paso anterior / Paso siguiente',
        description: 'Mové la animación un paso hacia atrás o hacia adelante.',
      },
      {
        icon: <RotateCcw className="h-4 w-4" aria-hidden="true" />,
        label: 'Reiniciar animación',
        description: 'Volvé al primer paso sin borrar la lista.',
      },
      {
        icon: <Gauge className="h-4 w-4" aria-hidden="true" />,
        label: 'Velocidad de la animación',
        description: 'Ajustá la duración de cada paso entre 0.5× y 6×.',
      },
      {
        icon: <ChartNoAxesColumn className="h-4 w-4" aria-hidden="true" />,
        label: 'Progreso del ordenamiento',
        description: 'Permite saltar a cualquier paso de la animación.',
      },
    ],
    notes: [
      'Se permiten entre 2 y 40 valores, con repetidos. Cada valor manual debe ser un entero entre 1 y 999.',
      'El modo aleatorio genera valores únicos entre 5 y 99 para que las barras se distingan.',
      'Burbuja empuja el mayor al final de cada pasada; selección lleva el mínimo al frente; inserción desliza cada número a la zona ordenada.',
      'Amarillo = comparación; violeta = movimiento; celeste = mínimo o clave; turquesa = zona ordenada. En burbuja y selección esa zona ya es definitiva; en inserción todavía puede correrse al insertar el siguiente número.',
      'La lista, el algoritmo, el progreso y la velocidad se conservan al cambiar de sección.',
    ],
  },
};

const ROUTE_SECTIONS: Record<string, HelpSectionId> = {
  '/editor': 'editor',
  '/constellations': 'constellations',
  '/johnson': 'johnson',
  '/assignment': 'assignment',
  '/northwest': 'northwest',
  '/trees': 'trees',
  '/sort': 'sort',
};

/**
 * Devuelve la guía de la sección actual. Los proyectos guardados
 * (`/galaxy/:id`) comparten la guía del editor; cualquier ruta desconocida
 * cae en el editor para no dejar el botón flotante sin contenido.
 */
export const getHelpSection = (pathname: string): HelpSection => {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (normalized.startsWith('/galaxy/')) return HELP_SECTIONS.editor;

  const id = ROUTE_SECTIONS[normalized] ?? 'editor';
  return HELP_SECTIONS[id];
};
