/**
 * Normaliza el error de una llamada axios/FastAPI a un mensaje
 * presentable para el usuario.
 *
 * No conoce errores de dominio (por ejemplo GraphFileParseError):
 * eso lo resuelve cada modulo antes de delegar aca. Este util solo
 * se ocupa de la forma de la respuesta del backend.
 */

interface ErrorLike {
  response?: {
    data?: {
      detail?: unknown;
      message?: unknown;
    };
  };
  code?: string;
}

const stringifyDetail = (detail: unknown): string | null => {
  if (typeof detail === 'string' && detail.trim() !== '') {
    return detail;
  }

  if (detail && typeof detail === 'object') {
    try {
      return JSON.stringify(detail);
    } catch {
      return null;
    }
  }

  return null;
};

export const extractApiErrorMessage = (
  err: unknown,
  fallback: string
): string => {
  if (typeof err !== 'object' || err === null) {
    return fallback;
  }

  const error = err as ErrorLike;

  if (error.code === 'ECONNABORTED') {
    return 'La solicitud tardo demasiado y fue cancelada.';
  }

  const data = error.response?.data;

  if (data) {
    const fromDetail = stringifyDetail(data.detail);
    if (fromDetail) return fromDetail;

    const fromMessage = stringifyDetail(data.message);
    if (fromMessage) return fromMessage;
  }

  if (!error.response) {
    return 'No se pudo conectar con el servidor.';
  }

  return fallback;
};