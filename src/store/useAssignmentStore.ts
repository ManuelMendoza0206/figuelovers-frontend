import { create } from 'zustand';
import type { SetStateAction } from 'react';

import type { AssignmentResultData } from '../types/graph';

const makeMatrix = (rows: number, cols: number): number[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => 1));

const initialState = () => ({
  rows: 3,
  cols: 3,
  maximize: false,
  matrix: makeMatrix(3, 3),
  rowLabels: ['Trabajador 1', 'Trabajador 2', 'Trabajador 3'],
  colLabels: ['Tarea A', 'Tarea B', 'Tarea C'],
  result: null as AssignmentResultData | null,
  resultSignature: null as string | null,
  showProcess: false,
  currentStep: 0,
  boardSource: false,
  appliedBoard: null as string | null,
});

type AssignmentState = ReturnType<typeof initialState> & {
  setRows: (value: SetStateAction<number>) => void;
  setCols: (value: SetStateAction<number>) => void;
  setMaximize: (value: SetStateAction<boolean>) => void;
  setMatrix: (value: SetStateAction<number[][]>) => void;
  setRowLabels: (value: SetStateAction<string[]>) => void;
  setColLabels: (value: SetStateAction<string[]>) => void;
  setResult: (value: AssignmentResultData | null) => void;
  setResultSignature: (value: string | null) => void;
  setShowProcess: (value: SetStateAction<boolean>) => void;
  setCurrentStep: (value: SetStateAction<number>) => void;
  setBoardSource: (value: boolean) => void;
  setAppliedBoard: (value: string | null) => void;
  reset: () => void;
};

const resolve = <T,>(value: SetStateAction<T>, current: T): T =>
  typeof value === 'function'
    ? (value as (previous: T) => T)(current)
    : value;

export const useAssignmentStore = create<AssignmentState>((set) => ({
  ...initialState(),
  setRows: (value) => set((state) => ({ rows: resolve(value, state.rows) })),
  setCols: (value) => set((state) => ({ cols: resolve(value, state.cols) })),
  setMaximize: (value) =>
    set((state) => ({ maximize: resolve(value, state.maximize) })),
  setMatrix: (value) =>
    set((state) => ({ matrix: resolve(value, state.matrix) })),
  setRowLabels: (value) =>
    set((state) => ({ rowLabels: resolve(value, state.rowLabels) })),
  setColLabels: (value) =>
    set((state) => ({ colLabels: resolve(value, state.colLabels) })),
  setResult: (result) => set({ result }),
  setResultSignature: (resultSignature) => set({ resultSignature }),
  setShowProcess: (value) =>
    set((state) => ({ showProcess: resolve(value, state.showProcess) })),
  setCurrentStep: (value) =>
    set((state) => ({ currentStep: resolve(value, state.currentStep) })),
  setBoardSource: (boardSource) => set({ boardSource }),
  setAppliedBoard: (appliedBoard) => set({ appliedBoard }),
  reset: () => set(initialState()),
}));
