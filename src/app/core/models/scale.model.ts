export const SCALE_STATUS = {
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR',
} as const;

export type ScaleStatus = (typeof SCALE_STATUS)[keyof typeof SCALE_STATUS];

export interface ScaleReading {
  weight: number;
  unit: string;
  stable: boolean;
  timestamp: string;
}

export interface ScaleState {
  status: ScaleStatus;
  currentReading: ScaleReading | null;
  errorMessage: string | null;
}
