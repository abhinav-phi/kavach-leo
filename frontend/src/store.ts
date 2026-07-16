import { create } from "zustand";
import type { ConjunctionAlert, Satellite, ScreeningParams, ScreeningResult } from "./types";

interface AppState {
  satellites: Satellite[];
  alerts: ConjunctionAlert[];
  positions: ScreeningResult["positions"];
  selectedAlertId: string | null;
  params: ScreeningParams;
  stale: boolean;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  setSatellites: (satellites: Satellite[], stale: boolean) => void;
  setParams: (params: Partial<ScreeningParams>) => void;
  setResult: (result: ScreeningResult) => void;
  selectAlert: (id: string | null) => void;
  setStatus: (status: AppState["status"], error?: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  satellites: [],
  alerts: [],
  positions: {},
  selectedAlertId: null,
  params: { windowHours: 24, stepMinutes: 5, thresholdKm: 50, satelliteGroup: "starlink" },
  stale: false,
  status: "idle",
  error: null,
  setSatellites: (satellites, stale) => set({ satellites, stale }),
  setParams: (params) => set((state) => ({ params: { ...state.params, ...params } })),
  setResult: (result) => set({ alerts: result.alerts, positions: result.positions, params: result.params, stale: result.stale, status: "ready", error: null }),
  selectAlert: (selectedAlertId) => set({ selectedAlertId }),
  setStatus: (status, error = null) => set({ status, error }),
}));
