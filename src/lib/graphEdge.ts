/**
 * Re-export de la factorizacion de aristas.
 *
 * Antes este archivo definiia las constantes de color y estilo, y toda
 * la logica de aristas se acumulo en el store. Ahora vive en
 * `edgeFactory.ts`, que ademas es testeable sin montar React. Este
 * modulo queda como fachada para no romper los imports existentes.
 */
export {
  BEAM_COLOR,
  BEAM_OPACITY,
  BEAM_OPACITY_DIMMED,
  BRAND_COLOR,
  PATH_COLOR,
  EDGE_STROKE_WIDTH,
  EDGE_Z_INDEX,
  createEdgeMarker,
  createEdgeStyle,
} from './edgeFactory';