import { create } from 'zustand';

import type { NorthwestResult } from '../types/graph';

interface NorthwestState {
  result: NorthwestResult | null;
  resultSignature: string | null;
  stepIndex: number;
  setResult: (result: NorthwestResult | null, signature: string | null) => void;
  setStepIndex: (stepIndex: number | ((current: number) => number)) => void;
  reset: () => void;
}

export const useNorthwestStore = create<NorthwestState>((set) => ({
  result: null,
  resultSignature: null,
  stepIndex: 0,
  setResult: (result, resultSignature) =>
    set({ result, resultSignature, stepIndex: 0 }),
  setStepIndex: (stepIndex) =>
    set((state) => ({
      stepIndex:
        typeof stepIndex === 'function' ? stepIndex(state.stepIndex) : stepIndex,
    })),
  reset: () => set({ result: null, resultSignature: null, stepIndex: 0 }),
}));
