import type { BatchStatus } from './batch.model';

export const DESPOSTE_SOURCE_TYPE = {
  MANUAL: 'MANUAL',
} as const;

export type DesposteSourceType = (typeof DESPOSTE_SOURCE_TYPE)[keyof typeof DESPOSTE_SOURCE_TYPE];

export const SOURCE_BATCH_ACTION = {
  CLOSE: 'CLOSE',
  KEEP_PROCESSING: 'KEEP_PROCESSING',
} as const;

export type SourceBatchAction = (typeof SOURCE_BATCH_ACTION)[keyof typeof SOURCE_BATCH_ACTION];

export interface ManualDesposteCutInput {
  productId: string;
  warehouseId: string;
  weight: number;
  suggestedSalePrice: number;
  expirationDate?: string | null;
}

export interface ManualDesposteRequest {
  sourceBatchId: string;
  sourceType: DesposteSourceType;
  manualJustification: string;
  wasteWeight: number;
  shrinkWeight: number;
  notes: string | null;
  cuts: readonly ManualDesposteCutInput[];
}

export interface DesposteMassBalance {
  inputWeight: number;
  totalCutsWeight: number;
  wasteWeight: number;
  shrinkWeight: number;
  deviation: number;
  tolerance: number;
  withinTolerance: boolean;
}

export interface ManualDesposteCutResult extends ManualDesposteCutInput {
  commercialValue: number;
  allocatedCost: number;
  unitCost: number;
}

export interface StockUpsertDraft {
  productId: string;
  batchId: string;
  warehouseId: string;
  quantityDelta: number;
  unitCost: number;
}

export interface SourceBatchTransition {
  batchId: string;
  previousStatus: BatchStatus;
  nextStatus: BatchStatus;
  action: SourceBatchAction;
}

export interface ManualDesposteResult {
  id?: string;
  sourceBatchId: string;
  massBalance: DesposteMassBalance;
  totalCommercialValue: number;
  totalAllocatedCost: number;
  cuts: readonly ManualDesposteCutResult[];
  stockUpserts: readonly StockUpsertDraft[];
  sourceBatchTransition: SourceBatchTransition;
  childBatchIds?: string[];
  createdAt?: string;
  createdBy?: string;
}
