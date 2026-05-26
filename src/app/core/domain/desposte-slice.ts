import type { Batch } from '../models/batch.model';
import {
  SOURCE_BATCH_ACTION,
  type DesposteMassBalance,
  type ManualDesposteCutInput,
  type ManualDesposteCutResult,
  type ManualDesposteRequest,
  type ManualDesposteResult,
} from '../models/desposte.model';

const ROUND_SCALE = 1_000_000;

export class DesposteDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DesposteDomainError';
  }
}

export function planManualDesposteForExistingBatch(
  batch: Batch,
  request: ManualDesposteRequest,
): ManualDesposteResult {
  validateProcessableBatch(batch, request.sourceBatchId);
  validateManualRequest(request);

  const massBalance = validateMassBalance(
    batch.initialWeight,
    request.cuts,
    request.wasteWeight,
    request.shrinkWeight,
  );
  const costing = calculateYieldCosting(batch.purchaseCost, request.cuts);

  return {
    sourceBatchId: batch.id,
    massBalance,
    totalCommercialValue: costing.totalCommercialValue,
    totalAllocatedCost: costing.totalAllocatedCost,
    cuts: costing.cuts,
    stockUpserts: costing.cuts.map((cut) => ({
      productId: cut.productId,
      batchId: batch.id,
      warehouseId: cut.warehouseId,
      quantityDelta: cut.weight,
      unitCost: cut.unitCost,
    })),
    sourceBatchTransition: {
      batchId: batch.id,
      previousStatus: batch.status,
      nextStatus: 'CLOSED',
      action: SOURCE_BATCH_ACTION.CLOSE,
    },
  };
}

export function validateMassBalance(
  inputWeight: number,
  cuts: readonly ManualDesposteCutInput[],
  wasteWeight: number,
  shrinkWeight: number,
): DesposteMassBalance {
  ensurePositiveNumber(inputWeight, 'El peso inicial del lote debe ser mayor a cero');
  ensureNonNegativeNumber(wasteWeight, 'La merma operativa no puede ser negativa');
  ensureNonNegativeNumber(shrinkWeight, 'La merma tecnica no puede ser negativa');

  const totalCutsWeight = roundAmount(cuts.reduce((sum, cut) => sum + cut.weight, 0));
  const deviation = roundAmount(
    Math.abs(inputWeight - (totalCutsWeight + wasteWeight + shrinkWeight)),
  );
  const tolerance = roundAmount(inputWeight * 0.005);
  const withinTolerance = deviation <= tolerance;

  const result: DesposteMassBalance = {
    inputWeight: roundAmount(inputWeight),
    totalCutsWeight,
    wasteWeight: roundAmount(wasteWeight),
    shrinkWeight: roundAmount(shrinkWeight),
    deviation,
    tolerance,
    withinTolerance,
  };

  if (!withinTolerance) {
    throw new DesposteDomainError(
      `MVM excedida: desviacion ${deviation} kg sobre tolerancia ${tolerance} kg`,
    );
  }

  return result;
}

export function calculateYieldCosting(
  purchaseCost: number,
  cuts: readonly ManualDesposteCutInput[],
): {
  totalCommercialValue: number;
  totalAllocatedCost: number;
  cuts: readonly ManualDesposteCutResult[];
} {
  ensurePositiveNumber(purchaseCost, 'El costo del lote debe ser mayor a cero');
  if (cuts.length === 0) {
    throw new DesposteDomainError('El desposte manual requiere al menos un corte');
  }

  cuts.forEach((cut, index) => validateCut(cut, index));

  const totalCommercialValue = roundAmount(
    cuts.reduce((sum, cut) => sum + cut.weight * cut.suggestedSalePrice, 0),
  );

  if (totalCommercialValue <= 0) {
    throw new DesposteDomainError('El valor comercial total debe ser mayor a cero');
  }

  let allocatedCostAccumulator = 0;
  const resolvedCuts = cuts.map((cut, index) => {
    const commercialValue = roundAmount(cut.weight * cut.suggestedSalePrice);
    const isLastCut = index === cuts.length - 1;
    const allocatedCost = isLastCut
      ? roundAmount(purchaseCost - allocatedCostAccumulator)
      : roundAmount((purchaseCost * commercialValue) / totalCommercialValue);

    allocatedCostAccumulator = roundAmount(allocatedCostAccumulator + allocatedCost);

    return {
      ...cut,
      commercialValue,
      allocatedCost,
      unitCost: roundAmount(allocatedCost / cut.weight),
    } satisfies ManualDesposteCutResult;
  });

  const totalAllocatedCost = roundAmount(
    resolvedCuts.reduce((sum, cut) => sum + cut.allocatedCost, 0),
  );

  if (totalAllocatedCost !== roundAmount(purchaseCost)) {
    throw new DesposteDomainError('Yield Costing inconsistente: el costo distribuido no cierra');
  }

  return {
    totalCommercialValue,
    totalAllocatedCost,
    cuts: resolvedCuts,
  };
}

function validateProcessableBatch(batch: Batch, sourceBatchId: string): void {
  if (batch.id !== sourceBatchId) {
    throw new DesposteDomainError('El lote origen del request no coincide con el lote recibido');
  }

  if (batch.status === 'CLOSED') {
    throw new DesposteDomainError('Un lote cerrado no puede volver a despostarse');
  }
}

function validateManualRequest(request: ManualDesposteRequest): void {
  if (request.sourceType !== 'MANUAL') {
    throw new DesposteDomainError('Este slice inicial solo admite desposte manual');
  }

  if (!request.manualJustification.trim()) {
    throw new DesposteDomainError('La justificacion manual es obligatoria');
  }

  ensureNonNegativeNumber(request.wasteWeight, 'La merma operativa no puede ser negativa');
  ensureNonNegativeNumber(request.shrinkWeight, 'La merma tecnica no puede ser negativa');

  if (request.cuts.length === 0) {
    throw new DesposteDomainError('Debe registrar al menos un corte resultante');
  }
}

function validateCut(cut: ManualDesposteCutInput, index: number): void {
  if (!cut.productId.trim()) {
    throw new DesposteDomainError(`El corte ${index + 1} requiere productId`);
  }

  if (!cut.warehouseId.trim()) {
    throw new DesposteDomainError(`El corte ${index + 1} requiere warehouseId`);
  }

  ensurePositiveNumber(cut.weight, `El corte ${index + 1} debe tener peso mayor a cero`);
  ensurePositiveNumber(
    cut.suggestedSalePrice,
    `El corte ${index + 1} debe tener precio sugerido mayor a cero`,
  );
}

function ensurePositiveNumber(value: number, message: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DesposteDomainError(message);
  }
}

function ensureNonNegativeNumber(value: number, message: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new DesposteDomainError(message);
  }
}

function roundAmount(value: number): number {
  return Math.round(value * ROUND_SCALE) / ROUND_SCALE;
}
