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

  it('should have exactly 9 displayed columns after adding productName and supplierName', () => {
    expect(component.displayedColumns).toHaveLength(9);
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

  it('should have status options for filtering', () => {
    expect(component.statusOptions).toHaveLength(4);
    expect(component.statusOptions[0]).toEqual({ value: null, label: 'Todos' });
    expect(component.statusOptions[1]).toEqual({ value: 'OPEN', label: 'Abierto' });
    expect(component.statusOptions[2]).toEqual({ value: 'PROCESSING', label: 'En proceso' });
    expect(component.statusOptions[3]).toEqual({ value: 'CLOSED', label: 'Cerrado' });
  });

  it('should return human-readable status labels', () => {
    expect(component.getStatusLabel('OPEN')).toBe('Abierto');
    expect(component.getStatusLabel('PROCESSING')).toBe('En proceso');
    expect(component.getStatusLabel('CLOSED')).toBe('Cerrado');
    expect(component.getStatusLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});
