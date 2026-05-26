export const SLAUGHTER_SOURCE_TYPE = {
  MANUAL: 'MANUAL',
  AUTOMATIC: 'AUTOMATIC',
} as const;

export type SlaughterSourceType =
  (typeof SLAUGHTER_SOURCE_TYPE)[keyof typeof SLAUGHTER_SOURCE_TYPE];

export interface Slaughter {
  id: string;
  animalId: string;
  batchId: string;
  sourceType: SlaughterSourceType;
  carcassWeight: number;
  liveWeight: number;
  yieldPct: number;
  justification: string;
  purchaseCost: number;
  notes: string | null;
  createdAt: string;
}

export interface SlaughterRequest {
  animalId: string;
  sourceType: SlaughterSourceType;
  manualJustification: string;
  carcassWeight: number;
  purchaseCost: number;
  notes: string | null;
}

export interface SlaughterResponse {
  id: string;
  animalId: string;
  batchId: string;
  yieldPct: number;
  carcassWeight: number;
  liveWeight: number;
  purchaseCost: number;
  createdAt: string;
}
