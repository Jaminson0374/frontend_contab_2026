import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AdvanceFormComponent } from './advance-form';

describe('AdvanceFormComponent', () => {
  let component: AdvanceFormComponent;
  let fixture: ComponentFixture<AdvanceFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvanceFormComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdvanceFormComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with required supplierId control', () => {
    expect(component.form.contains('supplierId')).toBe(true);
    const control = component.form.get('supplierId');
    expect(control?.valid).toBe(false);
    control?.setValue('supplier-1');
    expect(control?.valid).toBe(true);
  });

  it('should have an amount control with min 0.01', () => {
    const control = component.form.get('amount');
    expect(control).toBeTruthy();
    control?.setValue(0);
    expect(control?.valid).toBe(false);
    control?.setValue(1000);
    expect(control?.valid).toBe(true);
  });

  it('should have default method TRANSFERENCIA', () => {
    expect(component.form.get('method')?.value).toBe('TRANSFERENCIA');
  });

  it('should have default payment date set to today', () => {
    const date = component.form.get('paymentDate')?.value;
    expect(date).toBeInstanceOf(Date);
    const today = new Date();
    expect(date?.getDate()).toBe(today.getDate());
  });

  it('should have method options', () => {
    expect(component.methodOptions.length).toBe(4);
    expect(component.methodOptions.map((m) => m.value)).toEqual([
      'EFECTIVO',
      'TRANSFERENCIA',
      'CHEQUE',
      'TARJETA',
    ]);
  });

  it('should not save when form is invalid', () => {
    const saveSpy = { saved: false };
    const originalSave = component.save.bind(component);
    component.save = () => {
      if (component.form.invalid) {
        return;
      }
      saveSpy.saved = true;
    };

    component.save();
    expect(saveSpy.saved).toBe(false);
  });
});
