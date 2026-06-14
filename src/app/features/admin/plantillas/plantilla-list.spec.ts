import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PlantillaListComponent } from './plantilla-list';

describe('PlantillaListComponent', () => {
  let component: PlantillaListComponent;
  let fixture: ComponentFixture<PlantillaListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlantillaListComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PlantillaListComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct displayed columns', () => {
    expect(component.displayedColumns).toContain('code');
    expect(component.displayedColumns).toContain('name');
    expect(component.displayedColumns).toContain('module');
    expect(component.displayedColumns).toContain('entriesCount');
    expect(component.displayedColumns).toContain('isDefault');
    expect(component.displayedColumns).toContain('actions');
  });

  it('should provide module labels', () => {
    expect(component.moduleLabel('SALE')).toBe('Ventas');
    expect(component.moduleLabel('PURCHASE')).toBe('Compras');
  });

  it('should return unknown for unrecognized module', () => {
    expect(component.moduleLabel('UNKNOWN')).toBe('Desconocido');
  });

  it('should provide event type labels', () => {
    expect(component.eventTypeLabel('SALE_INCOME')).toBe('Ingreso por venta');
    expect(component.eventTypeLabel('PURCHASE_PAYABLE')).toBe('Cuenta por pagar');
  });

  it('should return raw event type for unknown type', () => {
    expect(component.eventTypeLabel('UNKNOWN_EVENT')).toBe('UNKNOWN_EVENT');
  });
});
