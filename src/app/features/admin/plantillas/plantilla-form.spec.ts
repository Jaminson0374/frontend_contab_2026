import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormArray } from '@angular/forms';
import { PlantillaFormComponent } from './plantilla-form';

describe('PlantillaFormComponent', () => {
  let component: PlantillaFormComponent;
  let fixture: ComponentFixture<PlantillaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlantillaFormComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PlantillaFormComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should create form with required fields', () => {
    expect(component.form.contains('code')).toBe(true);
    expect(component.form.contains('name')).toBe(true);
    expect(component.form.contains('description')).toBe(true);
    expect(component.form.contains('module')).toBe(true);
    expect(component.form.contains('isDefault')).toBe(true);
    expect(component.form.contains('isActive')).toBe(true);
  });

  it('should have entries FormArray', () => {
    expect(component.form.contains('entries')).toBe(true);
    expect(component.entriesArray).toBeInstanceOf(FormArray);
  });

  it('should validate code as required', () => {
    const codeControl = component.form.get('code')!;
    expect(codeControl.valid).toBe(false);
    expect(codeControl.hasError('required')).toBe(true);

    codeControl.setValue('TPL_001');
    expect(codeControl.valid).toBe(true);
    expect(codeControl.hasError('required')).toBe(false);
  });

  it('should validate name as required', () => {
    const nameControl = component.form.get('name')!;
    expect(nameControl.valid).toBe(false);
    expect(nameControl.hasError('required')).toBe(true);

    nameControl.setValue('Plantilla Test');
    expect(nameControl.valid).toBe(true);
    expect(nameControl.hasError('required')).toBe(false);
  });

  it('should validate module as required with default SALE', () => {
    const moduleControl = component.form.get('module')!;
    // Module has default 'SALE', so it's valid initially
    expect(moduleControl.value).toBe('SALE');
    expect(moduleControl.hasError('required')).toBe(false);

    // Clearing should trigger required error
    moduleControl.setValue('');
    expect(moduleControl.hasError('required')).toBe(true);

    // Setting a valid value clears the error
    moduleControl.setValue('PURCHASE');
    expect(moduleControl.hasError('required')).toBe(false);
  });

  it('should be in create mode by default', () => {
    expect(component.isEdit()).toBe(false);
    expect(component.editId()).toBeNull();
  });

  it('should add entry to FormArray', () => {
    component.addEntry();
    expect(component.entriesArray.length).toBe(1);

    const entry = component.entriesArray.at(0);
    expect(entry.get('eventType')?.value).toBe('');
    expect(entry.get('accountId')?.value).toBe('');
    expect(entry.get('isDebit')?.value).toBe(true);
    expect(entry.get('priority')?.value).toBe(0);
  });

  it('should remove entry from FormArray at given index', () => {
    component.addEntry();
    component.addEntry();
    expect(component.entriesArray.length).toBe(2);

    component.removeEntry(0);
    expect(component.entriesArray.length).toBe(1);
  });

  it('should provide module options', () => {
    expect(component.moduleOptions.length).toBe(2);
    expect(component.moduleOptions[0].value).toBe('SALE');
    expect(component.moduleOptions[1].value).toBe('PURCHASE');
  });

  it('should expose event type labels constant', () => {
    expect(component.eventTypeLabels['SALE_INCOME']).toBe('Ingreso por venta');
    expect(component.eventTypeLabels['PURCHASE_PAYABLE']).toBe('Cuenta por pagar');
  });

  it('should expose event type keys', () => {
    expect(component.eventTypeKeys).toContain('SALE_RECEIVABLE');
    expect(component.eventTypeKeys).toContain('PURCHASE_INVENTORY');
    expect(component.eventTypeKeys.length).toBeGreaterThan(0);
  });
});
