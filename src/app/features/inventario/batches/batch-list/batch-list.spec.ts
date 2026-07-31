import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BatchListComponent } from './batch-list';

describe('BatchListComponent', () => {
  let component: BatchListComponent;
  let fixture: ComponentFixture<BatchListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchListComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BatchListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should include productName and supplierName in displayedColumns', () => {
    expect(component.displayedColumns).toContain('productName');
    expect(component.displayedColumns).toContain('supplierName');
  });

  it('should place productName and supplierName before status in column order', () => {
    const idxProduct = component.displayedColumns.indexOf('productName');
    const idxSupplier = component.displayedColumns.indexOf('supplierName');
    const idxStatus = component.displayedColumns.indexOf('status');

    expect(idxProduct).toBeGreaterThan(-1);
    expect(idxSupplier).toBeGreaterThan(-1);
    expect(idxProduct).toBeLessThan(idxSupplier);
    expect(idxSupplier).toBeLessThan(idxStatus);
  });

  it('should have exactly 10 displayed columns after adding batchType', () => {
    expect(component.displayedColumns).toHaveLength(10);
  });

  it('should NOT contain warehouseName in displayedColumns despite being in Batch interface', () => {
    expect(component.displayedColumns).not.toContain('warehouseName');
  });

  it('should have existing columns preserved', () => {
    expect(component.displayedColumns).toContain('entryDate');
    expect(component.displayedColumns).toContain('status');
    expect(component.displayedColumns).toContain('initialWeight');
    expect(component.displayedColumns).toContain('purchaseCost');
    expect(component.displayedColumns).toContain('trazabilidad');
    expect(component.displayedColumns).toContain('notes');
    expect(component.displayedColumns).toContain('actions');
  });

  it('should have batchType column between trazabilidad and notes', () => {
    const idxTrazabilidad = component.displayedColumns.indexOf('trazabilidad');
    const idxBatchType = component.displayedColumns.indexOf('batchType');
    const idxNotes = component.displayedColumns.indexOf('notes');

    expect(idxBatchType).toBeGreaterThan(idxTrazabilidad);
    expect(idxBatchType).toBeLessThan(idxNotes);
  });

  it('should have status options for filtering', () => {
    expect(component.statusOptions).toHaveLength(4);
    expect(component.statusOptions[0]).toEqual({ value: null, label: 'Todos' });
    expect(component.statusOptions[1]).toEqual({ value: 'OPEN', label: 'Abierto' });
    expect(component.statusOptions[2]).toEqual({ value: 'PROCESSING', label: 'En proceso' });
    expect(component.statusOptions[3]).toEqual({ value: 'CLOSED', label: 'Cerrado' });
  });

  it('should have batchType options for filtering', () => {
    expect(component.batchTypeOptions).toHaveLength(4);
    expect(component.batchTypeOptions[0]).toEqual({ value: null, label: 'Todos los tipos' });
    expect(component.batchTypeOptions[1]).toEqual({ value: 'PARENT', label: 'Padre' });
    expect(component.batchTypeOptions[2]).toEqual({ value: 'CHILD', label: 'Hijo' });
    expect(component.batchTypeOptions[3]).toEqual({ value: 'STANDARD', label: 'Estándar' });
  });

  it('should return human-readable status labels', () => {
    expect(component.getStatusLabel('OPEN')).toBe('Abierto');
    expect(component.getStatusLabel('PROCESSING')).toBe('En proceso');
    expect(component.getStatusLabel('CLOSED')).toBe('Cerrado');
    expect(component.getStatusLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('should return human-readable batch type labels', () => {
    expect(component.getBatchTypeLabel('PARENT')).toBe('Padre');
    expect(component.getBatchTypeLabel('CHILD')).toBe('Hijo');
    expect(component.getBatchTypeLabel('STANDARD')).toBe('Estándar');
    expect(component.getBatchTypeLabel(undefined)).toBe('—');
  });

  it('should identify child batches via isChildBatch', () => {
    expect(component.isChildBatch({ batchType: 'CHILD' } as never)).toBe(true);
    expect(component.isChildBatch({ batchType: 'PARENT' } as never)).toBe(false);
    expect(component.isChildBatch({ batchType: 'STANDARD' } as never)).toBe(false);
    expect(component.isChildBatch({} as never)).toBe(false);
  });

  it('should identify parent batches via isParentBatch', () => {
    expect(component.isParentBatch({ batchType: 'PARENT' } as never)).toBe(true);
    expect(component.isParentBatch({ batchType: 'CHILD' } as never)).toBe(false);
    expect(component.isParentBatch({ batchType: 'STANDARD' } as never)).toBe(false);
  });

  it('should truncate parentBatchId to 8 chars in getParentRef', () => {
    expect(
      component.getParentRef({ parentBatchId: '12345678-1234-1234-1234-123456789abc' } as never),
    ).toBe('12345678...');
  });

  it('should return null from getParentRef when parentBatchId is absent', () => {
    expect(component.getParentRef({} as never)).toBeNull();
  });

  it('should initialize batchTypeFilter to null', () => {
    expect(component.batchTypeFilter()).toBeNull();
  });
});
