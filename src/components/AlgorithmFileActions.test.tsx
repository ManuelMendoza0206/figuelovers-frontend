import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlgorithmFileActions } from './AlgorithmFileActions';
import {
  createAlgorithmFile,
  downloadAlgorithmFile,
} from '../utils/algorithmFiles';

vi.mock('../utils/algorithmFiles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/algorithmFiles')>();
  return {
    ...actual,
    downloadAlgorithmFile: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const jsonFile = (name: string, data: unknown): File =>
  new File([JSON.stringify(data)], name, { type: 'application/json' });

describe('AlgorithmFileActions', () => {
  it('carga un archivo del algoritmo correcto', async () => {
    const onLoad = vi.fn().mockReturnValue(null);
    render(
      <AlgorithmFileActions
        algorithm="sort"
        label="Sort"
        data={{}}
        onLoad={onLoad}
      />
    );

    const payload = { values: [9, 3, 7], algorithm: 'selection' };
    const file = jsonFile('sort.json', createAlgorithmFile('sort', payload));

    fireEvent.change(screen.getByLabelText('Archivo JSON de Sort'), {
      target: { files: [file] },
    });

    await waitFor(() => expect(onLoad).toHaveBeenCalledWith(payload));
  });

  it('muestra el error cuando el archivo es de otro algoritmo', async () => {
    const onLoad = vi.fn();
    render(
      <AlgorithmFileActions
        algorithm="trees"
        label="Árboles"
        data={{}}
        onLoad={onLoad}
      />
    );

    const file = jsonFile(
      'sort.json',
      createAlgorithmFile('sort', { values: [1, 2], algorithm: 'bubble' })
    );

    fireEvent.change(screen.getByLabelText('Archivo JSON de Árboles'), {
      target: { files: [file] },
    });

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Este archivo es de Sort'
    );
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('permite elegir el nombre del archivo antes de guardar', async () => {
    vi.mocked(downloadAlgorithmFile).mockResolvedValue(undefined);
    render(
      <AlgorithmFileActions
        algorithm="sort"
        label="Sort"
        data={{ values: [3, 1], algorithm: 'bubble' }}
        onLoad={() => null}
      />
    );

    const nameInput = screen.getByLabelText(
      'Nombre del archivo de Sort'
    ) as HTMLInputElement;
    expect(nameInput.value).toBe('sort-entrada');

    fireEvent.change(nameInput, { target: { value: 'mi-lista.json' } });
    expect(nameInput.value).toBe('mi-lista');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Sort en JSON' }));

    await waitFor(() =>
      expect(downloadAlgorithmFile).toHaveBeenCalledWith(
        'sort',
        { values: [3, 1], algorithm: 'bubble' },
        'mi-lista'
      )
    );
  });

  it('no permite guardar cuando no hay datos', () => {
    render(
      <AlgorithmFileActions
        algorithm="sort"
        label="Sort"
        data={{}}
        onLoad={() => null}
        canSave={false}
      />
    );

    expect(
      (screen.getByRole('button', { name: 'Guardar Sort en JSON' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });
});
