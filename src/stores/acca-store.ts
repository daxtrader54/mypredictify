import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BetMarket = 'home' | 'draw' | 'away' | 'btts_yes' | 'btts_no' | 'over_2_5' | 'under_2_5';

export interface AccaSelection {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  market: BetMarket;
  selection: string;
  odds: number;
  probability: number;
}

interface AccaState {
  selections: AccaSelection[];
  maxSelections: number;
  addSelection: (selection: AccaSelection) => void;
  removeSelection: (fixtureId: number, market: BetMarket) => void;
  clearSelections: () => void;
  hasSelection: (fixtureId: number, market: BetMarket) => boolean;
  getSelectionForFixture: (fixtureId: number) => AccaSelection | undefined;
  getCombinedOdds: () => number;
  getCombinedProbability: () => number;
}

export const useAccaStore = create<AccaState>()(
  persist(
    (set, get) => ({
      selections: [],
      maxSelections: 10,

      addSelection: (selection) => {
        const { selections, maxSelections } = get();
        const existingIndex = selections.findIndex(
          (s) => s.fixtureId === selection.fixtureId
        );

        if (existingIndex !== -1) {
          const newSelections = [...selections];
          newSelections[existingIndex] = selection;
          set({ selections: newSelections });
        } else if (selections.length < maxSelections) {
          set({ selections: [...selections, selection] });
        }
      },

      removeSelection: (fixtureId, market) => {
        set({
          selections: get().selections.filter(
            (s) => !(s.fixtureId === fixtureId && s.market === market)
          ),
        });
      },

      clearSelections: () => set({ selections: [] }),

      hasSelection: (fixtureId, market) => {
        return get().selections.some(
          (s) => s.fixtureId === fixtureId && s.market === market
        );
      },

      getSelectionForFixture: (fixtureId) => {
        return get().selections.find((s) => s.fixtureId === fixtureId);
      },

      getCombinedOdds: () => {
        const { selections } = get();
        if (selections.length === 0) return 0;
        return selections.reduce((acc, s) => acc * s.odds, 1);
      },

      getCombinedProbability: () => {
        const { selections } = get();
        if (selections.length === 0) return 0;
        return selections.reduce((acc, s) => acc * (s.probability / 100), 1) * 100;
      },
    }),
    {
      name: 'acca-selections',
    }
  )
);
