import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AdvanceListComponent } from './advance-list';

describe('AdvanceListComponent', () => {
  let component: AdvanceListComponent;
  let fixture: ComponentFixture<AdvanceListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvanceListComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdvanceListComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct displayed columns', () => {
    expect(component.displayedColumns).toContain('supplierName');
    expect(component.displayedColumns).toContain('amount');
    expect(component.displayedColumns).toContain('remainingAdvance');
    expect(component.displayedColumns).toContain('method');
    expect(component.displayedColumns).toContain('reference');
    expect(component.displayedColumns).toContain('createdAt');
    expect(component.displayedColumns).toContain('actions');
  });

  it('should have page size options', () => {
    expect(component.pageSizeOptions).toEqual([10, 20, 30]);
  });

  it('should translate method labels', () => {
    expect(component.methodLabel('EFECTIVO')).toBe('Efectivo');
    expect(component.methodLabel('TRANSFERENCIA')).toBe('Transferencia');
    expect(component.methodLabel('CHEQUE')).toBe('Cheque');
  });

  it('should classify remaining advance correctly', () => {
    expect(component.remainingClass(0)).toBe('chip-exhausted');
    expect(component.remainingClass(-100)).toBe('chip-exhausted');
    expect(component.remainingClass(50)).toBe('chip-low');
    expect(component.remainingClass(99)).toBe('chip-low');
    expect(component.remainingClass(100)).toBe('chip-available');
    expect(component.remainingClass(5000)).toBe('chip-available');
  });
});
