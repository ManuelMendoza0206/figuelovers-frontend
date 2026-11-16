import { Download, Upload } from 'lucide-react';
import React, { useRef, useState } from 'react';

import { Button } from '../ui';
import {
  downloadAlgorithmFile,
  parseAlgorithmFile,
  type AlgorithmFileKind,
} from '../utils/algorithmFiles';

interface AlgorithmFileActionsProps {
  algorithm: AlgorithmFileKind;
  label: string;
  data: unknown;
  onLoad: (data: unknown) => string | null | Promise<string | null>;
  canSave?: boolean;
  disabled?: boolean;
}

const defaultFileNameFor = (label: string): string => {
  const slug = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'algoritmo'}-entrada`;
};

/**
 * Par Guardar/Cargar JSON para las pantallas de algoritmos.
 *
 * El componente solo se ocupa del archivo; la página decide qué datos
 * guarda y cómo aplica lo que llega. Si `onLoad` devuelve un mensaje, se
 * muestra como error sin romper la pantalla.
 */
export const AlgorithmFileActions: React.FC<AlgorithmFileActionsProps> = ({
  algorithm,
  label,
  data,
  onLoad,
  canSave = true,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState(() => defaultFileNameFor(label));

  const save = async (): Promise<void> => {
    if (busy || disabled || !canSave || !fileName.trim()) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await downloadAlgorithmFile(algorithm, data, fileName);
    } catch {
      setErrorMessage('No se pudo guardar el archivo JSON.');
    } finally {
      setBusy(false);
    }
  };

  const load = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setErrorMessage(null);
    try {
      const envelope = await parseAlgorithmFile(file, algorithm);
      const loadError = await onLoad(envelope.data);
      if (loadError) setErrorMessage(loadError);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo cargar el archivo JSON.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 items-center rounded-lg border border-border bg-surface px-2.5 py-1.5 focus-within:border-brand">
          <span className="sr-only">Nombre del archivo de {label}</span>
          <input
            type="text"
            value={fileName}
            maxLength={80}
            aria-label={`Nombre del archivo de ${label}`}
            className="w-28 min-w-0 bg-transparent font-mono text-xs text-ink outline-none placeholder:text-ink-muted sm:w-36"
            placeholder="nombre"
            onChange={(event) =>
              setFileName(event.target.value.replace(/\.json$/i, ''))
            }
          />
          <span className="shrink-0 font-mono text-[10px] text-ink-subtle">.json</span>
        </label>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-label={`Guardar ${label} en JSON`}
          leftIcon={<Download className="h-3.5 w-3.5" />}
          onClick={() => void save()}
          disabled={busy || disabled || !canSave || !fileName.trim()}
        >
          Guardar JSON
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-label={`Cargar ${label} desde JSON`}
          leftIcon={<Upload className="h-3.5 w-3.5" />}
          onClick={() => inputRef.current?.click()}
          disabled={busy || disabled}
        >
          Cargar JSON
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          aria-label={`Archivo JSON de ${label}`}
          className="sr-only"
          onChange={(event) => void load(event)}
        />
      </div>

      {errorMessage && (
        <p role="alert" className="max-w-sm text-xs leading-4 text-red-300">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
