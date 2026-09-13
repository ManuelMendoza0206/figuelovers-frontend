import { MarkerType } from 'reactflow';


import type {
  GraphPayloadSchema,
  GraphFileSchema,
  NodeSchema,
  EdgeSchema,
} from '../types/graph';


import type { AppNode, AppEdge, AppNodeData } from '../store/useGraphStore';


// ==========================================
// CONSTRUIR PAYLOAD DESDE EL ESTADO DEL CANVAS
// ==========================================
export const buildGraphPayload = (
  nodes: AppNode[],
  edges: AppEdge[]
): GraphPayloadSchema => ({
  nodes: nodes.map((node): NodeSchema => ({
    id: node.id,
    label: node.data?.label || node.id,
    position: node.position,
    data: node.data ? { ...node.data } as Record<string, unknown> : undefined,
  })),


  edges: edges.map((edge): EdgeSchema => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    weight: edge.data?.weight ?? 1.0,
    is_directed: edge.data?.is_directed ?? false,
    label: edge.label as string | undefined,
  })),
});


// ==========================================
// TIPOS MÍNIMOS PARA LA FILE SYSTEM ACCESS API
// ==========================================
//
// TypeScript (lib.dom) todavía no incluye estos tipos
// de forma estable en todas las versiones, así que se
// declaran acá los mínimos necesarios para usar
// `window.showSaveFilePicker` sin recurrir a `any`.
//

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: {
    description?: string;
    accept: Record<string, string[]>;
  }[];
}

interface FileSystemWritableStream {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
}

interface FileSystemFileHandleLike {
  createWritable: () => Promise<FileSystemWritableStream>;
}

type ShowSaveFilePicker = (
  options?: SaveFilePickerOptions
) => Promise<FileSystemFileHandleLike>;

const getShowSaveFilePicker = (): ShowSaveFilePicker | undefined => {
  return (
    window as unknown as {
      showSaveFilePicker?: ShowSaveFilePicker;
    }
  ).showSaveFilePicker;
};

// ==========================================
// RESPALDO: DESCARGA CLÁSICA CON <a download>
// ==========================================
//
// Se usa cuando el navegador no soporta la File System
// Access API (Firefox, Safari) o cuando el usuario
// cancela el diálogo nativo. Descarga directo con el
// nombre sugerido, sin preguntar ubicación.
//

const downloadWithAnchorFallback = (
  blob: Blob,
  fileName: string
): void => {
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName.trim().replace(/\s+/g, '-')}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

// ==========================================
// EXPORTAR: GENERAR Y GUARDAR EL .JSON
// ==========================================
//
// Si el navegador soporta `window.showSaveFilePicker`
// (Chrome, Edge y similares basados en Chromium), se abre
// el diálogo nativo del sistema operativo para que el
// usuario elija nombre y ubicación del archivo.
//
// Si no está disponible, o si algo falla que no sea una
// cancelación explícita del usuario, se recurre al método
// anterior (`<a download>`), que descarga directo con el
// nombre sugerido a la carpeta de descargas del navegador.
//
// `fileName` sigue siendo el nombre SUGERIDO (lo que antes
// era el nombre final); ahora, con el diálogo nativo, el
// usuario puede cambiarlo ahí mismo antes de guardar.
//

export const downloadGraphAsJson = async (
  payload: GraphPayloadSchema,
  fileName?: string
): Promise<void> => {
  const suggestedName = fileName ?? 'grafo';

  const file: GraphFileSchema = {
    metadata: {
      version: '1.0.0',
      name: fileName ?? 'Grafo Aristografos',
      created_at: new Date().toISOString(),
    },
    graph: payload,
  };

  const jsonString = JSON.stringify(file, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  const showSaveFilePicker = getShowSaveFilePicker();

  if (showSaveFilePicker) {
    try {
      const handle = await showSaveFilePicker({
        suggestedName: `${suggestedName
          .trim()
          .replace(/\s+/g, '-')}.json`,

        types: [
          {
            description: 'Archivo de grafo (JSON)',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      return;
    } catch (error) {
      // El usuario canceló el diálogo: no es un error real,
      // simplemente no se guarda nada (igual que si cancelara
      // una descarga). No se recurre al respaldo en este caso.

      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return;
      }

      // Cualquier otro fallo (navegador que dice soportarlo
      // pero falla en runtime, permisos, etc.) sí cae al
      // método de respaldo.

      downloadWithAnchorFallback(blob, suggestedName);
      return;
    }
  }

  // Navegador sin soporte para la File System Access API.

  downloadWithAnchorFallback(blob, suggestedName);
};


// ==========================================
// IMPORTAR: LEER Y VALIDAR LA FORMA DEL ARCHIVO
// ==========================================
export class GraphFileParseError extends Error {}


const isValidGraphFileShape = (
  value: unknown
): value is GraphFileSchema => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }


  const candidate = value as Record<string, unknown>;


  if (
    typeof candidate.graph !== 'object' ||
    candidate.graph === null
  ) {
    return false;
  }


  const graph = candidate.graph as Record<string, unknown>;


  return (
    Array.isArray(graph.nodes) &&
    Array.isArray(graph.edges)
  );
};


export const parseGraphFile = (
  file: File
): Promise<GraphFileSchema> => {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      reject(
        new GraphFileParseError(
          'El archivo debe tener extensión .json'
        )
      );
      return;
    }


    const reader = new FileReader();


    reader.onerror = () => {
      reject(
        new GraphFileParseError(
          'No se pudo leer el archivo seleccionado.'
        )
      );
    };


    reader.onload = () => {
      try {
        const parsed = JSON.parse(
          reader.result as string
        );


        if (!isValidGraphFileShape(parsed)) {
          reject(
            new GraphFileParseError(
              'El archivo no tiene el formato esperado de un grafo (falta "graph.nodes" o "graph.edges").'
            )
          );
          return;
        }


        resolve(parsed);
      } catch {
        reject(
          new GraphFileParseError(
            'El archivo no contiene un JSON válido.'
          )
        );
      }
    };


    reader.readAsText(file);
  });
};


// ==========================================
// Extrae folio desde el data crudo del nodo importado,
// solo si es un número válido. Si no viene (JSON viejo
// o externo sin folio), devuelve undefined — el store
// (loadGraph -> ensureFolios) se encarga de asignar uno
// nuevo secuencial en ese caso.
// ==========================================
const extractFolio = (
  rawData: unknown
): number | undefined => {
  if (typeof rawData !== 'object' || rawData === null) {
    return undefined;
  }

  const folio = (rawData as Record<string, unknown>).folio;

  return typeof folio === 'number' ? folio : undefined;
};


// ==========================================
// CONVERTIR PAYLOAD (BACKEND) -> FORMATO REACT FLOW
// ==========================================
export const graphPayloadToFlow = (
  payload: GraphPayloadSchema
): { nodes: AppNode[]; edges: AppEdge[] } => {
  const nodes: AppNode[] = payload.nodes.map((node, index) => {
    const folio = extractFolio(node.data);

    const data: AppNodeData = {
      label: node.label || node.id,
      // Si el JSON no traía folio, lo dejamos ausente aquí;
      // el store se lo asigna al hacer loadGraph. El cast
      // es intencional: AppNodeData exige folio: number,
      // pero ensureFolios lo completa antes de que se use.
      ...(folio !== undefined ? { folio } : {}),
    } as AppNodeData;

    return {
      id: node.id,
      position: node.position ?? {
        x: 100 + (index % 5) * 150,
        y: 100 + Math.floor(index / 5) * 150,
      },
      data,
    };
  });


  const edges: AppEdge[] = payload.edges.map((edge) => {
    const isDirected = edge.is_directed ?? false;
    const weight = edge.weight ?? 1.0;


    return {
      id: edge.id,
      type: 'straight',
      source: edge.source,
      target: edge.target,
      label: weight.toString(),
      data: {
        weight,
        is_directed: isDirected,
      },
      markerEnd: isDirected
        ? { type: MarkerType.ArrowClosed }
        : undefined,
      style: {
        stroke: '#05A8AA',
        strokeWidth: 2.5,
        zIndex: 10,
      },
    };
  });


  return { nodes, edges };
};