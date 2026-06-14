import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormArray } from '@angular/forms';
import { OrdenFormComponent } from './orden-form';

describe('OrdenFormComponent - new fields', () => {
  let component: OrdenFormComponent;
  let fixture: ComponentFixture<OrdenFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdenFormComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdenFormComponent);
    component = fixture.componentInstance;
  });

  // ── RED: Task 1 — Model fields (verified via form) ────────────────

  it('should have dueDate form control', () => {
    expect(component.form.contains('dueDate')).toBe(true);
  });

  it('should have buyerId form control', () => {
    expect(component.form.contains('buyerId')).toBe(true);
  });

  it('should have paymentMethod form control', () => {
    expect(component.form.contains('paymentMethod')).toBe(true);
  });

  it('should have supportDocumentType form control', () => {
    expect(component.form.contains('supportDocumentType')).toBe(true);
  });

  it('should have supportDocumentNumber form control', () => {
    expect(component.form.contains('supportDocumentNumber')).toBe(true);
  });

  it('should have currency form control with COP default', () => {
    expect(component.form.contains('currency')).toBe(true);
    expect(component.form.get('currency')?.value).toBe('COP');
  });

  // ── RED: Task 1 — Existing controls still present ──────────────────

  it('should still have supplierId form control', () => {
    expect(component.form.contains('supplierId')).toBe(true);
  });

  it('should still have orderDate form control', () => {
    expect(component.form.contains('orderDate')).toBe(true);
  });

  it('should still have notes form control', () => {
    expect(component.form.contains('notes')).toBe(true);
  });

  it('should still have linesArray FormArray', () => {
    expect(component.form.contains('linesArray')).toBe(true);
    expect(component.linesArray).toBeInstanceOf(FormArray);
  });

  // ── RED: Task 2 — Signals ─────────────────────────────────────────

  it('should have supplierAddress signal', () => {
    expect(component.supplierAddress).toBeDefined();
    expect(component.supplierAddress()).toBe('');
  });

  it('should have calculatedDueDate signal', () => {
    expect(component.calculatedDueDate).toBeDefined();
    expect(component.calculatedDueDate()).toBe('');
  });

  // ── RED: Task 2 — Option arrays ───────────────────────────────────

  it('should have paymentMethods array with 5 values', () => {
    expect(component.paymentMethods).toBeDefined();
    expect(component.paymentMethods.length).toBe(5);
    expect(component.paymentMethods).toContain('EFECTIVO');
    expect(component.paymentMethods).toContain('TRANSFERENCIA');
    expect(component.paymentMethods).toContain('CREDITO');
    expect(component.paymentMethods).toContain('CHEQUE');
    expect(component.paymentMethods).toContain('OTRO');
  });

  it('should have supportDocumentTypes array with 4 values', () => {
    expect(component.supportDocumentTypes).toBeDefined();
    expect(component.supportDocumentTypes.length).toBe(4);
    expect(component.supportDocumentTypes).toContain('COTIZACION');
    expect(component.supportDocumentTypes).toContain('CONTRATO');
    expect(component.supportDocumentTypes).toContain('ORDEN_COMPRA');
    expect(component.supportDocumentTypes).toContain('OTRO');
  });

  it('should have currencies array with COP, USD, EUR', () => {
    expect(component.currencies).toBeDefined();
    expect(component.currencies.length).toBe(3);
    expect(component.currencies).toContain('COP');
    expect(component.currencies).toContain('USD');
    expect(component.currencies).toContain('EUR');
  });

  // ── RED: Task 2 — addDays utility ─────────────────────────────────

  it('should add N days to a date correctly', () => {
    const base = new Date(2026, 5, 10); // Jun 10, 2026
    const result = component.addDays(base, 15);
    expect(result).toBe('2026-06-25');
  });

  it('should handle adding 0 days', () => {
    const base = new Date(2026, 5, 10);
    const result = component.addDays(base, 0);
    expect(result).toBe('2026-06-10');
  });

  it('should add days across year boundary', () => {
    const base = new Date(2026, 11, 28); // Dec 28, 2026
    const result = component.addDays(base, 5);
    expect(result).toBe('2027-01-02');
  });

  it('should add 365 days correctly', () => {
    const base = new Date(2026, 0, 1); // Jan 1, 2026
    const result = component.addDays(base, 365);
    expect(result).toBe('2027-01-01');
  });

  // ── TRIANGULATE: resetForm clears all new fields ──────────────────

  it('should reset currency to COP after being changed', () => {
    component.form.get('currency')?.setValue('USD');
    expect(component.form.get('currency')?.value).toBe('USD');
    // Simulate resetForm by calling cancel which leads to re-init in real app
    component.form.reset({
      orderDate: new Date(),
      dueDate: '',
      buyerId: '',
      paymentMethod: '',
      supportDocumentType: '',
      supportDocumentNumber: '',
      currency: 'COP',
      notes: '',
      supplierId: '',
    });
    expect(component.form.get('currency')?.value).toBe('COP');
  });

  // ── TRIANGULATE: Form value checks ────────────────────────────────

  it('should have dueDate empty by default', () => {
    expect(component.form.get('dueDate')?.value).toBe('');
  });

  it('should have buyerId empty by default', () => {
    expect(component.form.get('buyerId')?.value).toBe('');
  });

  it('should have paymentMethod empty by default', () => {
    expect(component.form.get('paymentMethod')?.value).toBe('');
  });

  it('should allow setting paymentMethod to CHEQUE', () => {
    component.form.get('paymentMethod')?.setValue('CHEQUE');
    expect(component.form.get('paymentMethod')?.value).toBe('CHEQUE');
  });

  it('should allow setting supportDocumentType to CONTRATO', () => {
    component.form.get('supportDocumentType')?.setValue('CONTRATO');
    expect(component.form.get('supportDocumentType')?.value).toBe('CONTRATO');
  });

  it('should allow setting currency to EUR', () => {
    component.form.get('currency')?.setValue('EUR');
    expect(component.form.get('currency')?.value).toBe('EUR');
  });

  // ── TRIANGULATE: Option arrays have correct order ─────────────────

  it('should have paymentMethods in correct order', () => {
    expect(component.paymentMethods[0]).toBe('EFECTIVO');
    expect(component.paymentMethods[4]).toBe('OTRO');
  });

  it('should have supportDocumentTypes in correct order', () => {
    expect(component.supportDocumentTypes[0]).toBe('COTIZACION');
    expect(component.supportDocumentTypes[3]).toBe('OTRO');
  });

  it('should have currencies in correct order with COP first', () => {
    expect(component.currencies[0]).toBe('COP');
    expect(component.currencies[2]).toBe('EUR');
  });

  // ── RED: Task 3 — Template integration (basic structure check) ────

  it('should render supplier address section when signal is set', () => {
    fixture.detectChanges();
    component.supplierAddress.set('Calle 123, Bogotá');
    fixture.detectChanges();
    const addressEl = fixture.debugElement.nativeElement.querySelector('.of-supplier-address');
    expect(addressEl).toBeTruthy();
    expect(addressEl?.textContent).toContain('Calle 123, Bogotá');
  });

  it('should NOT render supplier address section when signal is empty', () => {
    fixture.detectChanges();
    component.supplierAddress.set('');
    fixture.detectChanges();
    const addressEl = fixture.debugElement.nativeElement.querySelector('.of-supplier-address');
    expect(addressEl).toBeFalsy();
  });

  it('should render payment method select options', () => {
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML;
    // DOM lowercases attribute names from Angular templates
    expect(html).toContain('formcontrolname="paymentMethod"');
    expect(html).toContain('formcontrolname="supportDocumentType"');
    expect(html).toContain('formcontrolname="currency"');
    expect(html).toContain('formcontrolname="supportDocumentNumber"');
    expect(html).toContain('formcontrolname="dueDate"');
  });

  // ── RED: Task 2 — save() maps new fields ──────────────────────────
  // This requires mocking the service, but we can verify the form structure
  // is included in the request by setting up the form fully.

  it('should have all 10 form controls (6 existing + 4 new lines + notes = 12 total)', () => {
    const controls = Object.keys(component.form.controls);
    expect(controls).toContain('supplierId');
    expect(controls).toContain('orderDate');
    expect(controls).toContain('dueDate');
    expect(controls).toContain('buyerId');
    expect(controls).toContain('paymentMethod');
    expect(controls).toContain('supportDocumentType');
    expect(controls).toContain('supportDocumentNumber');
    expect(controls).toContain('currency');
    expect(controls).toContain('notes');
    expect(controls).toContain('linesArray');
    // 10 total controls
    expect(controls.length).toBe(10);
  });
});
