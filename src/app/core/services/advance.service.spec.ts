import '@angular/compiler';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AdvanceService } from './advance.service';
import { Advance, AdvanceRequest, ApplyAdvanceRequest } from '../models/advance.model';

describe('AdvanceService', () => {
  let service: AdvanceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdvanceService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdvanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('create()', () => {
    it('should POST to /api/v1/payments/advances and return the created advance', () => {
      const request: AdvanceRequest = {
        supplierId: 'supplier-1',
        amount: 5000,
        paymentDate: '2026-05-23',
        method: 'EFECTIVO',
        reference: 'REF-001',
        notes: 'Anticipo inicial',
      };

      const mockResponse: Advance = {
        id: 'adv-1',
        supplierId: 'supplier-1',
        supplierName: 'Proveedor A',
        amount: 5000,
        remainingAdvance: 5000,
        method: 'EFECTIVO',
        reference: 'REF-001',
        createdAt: '2026-05-23T10:00:00Z',
      };

      service.create(request).subscribe((result) => {
        expect(result).toEqual(mockResponse);
        expect(result.remainingAdvance).toBe(5000);
      });

      const req = httpMock.expectOne('/api/v1/payments/advances');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should POST with optional fields as null when omitted', () => {
      const request: AdvanceRequest = {
        supplierId: 'supplier-2',
        amount: 3000,
        paymentDate: '2026-05-23',
        method: 'TRANSFERENCIA',
      };

      service.create(request).subscribe();

      const req = httpMock.expectOne('/api/v1/payments/advances');
      expect(req.request.body.reference).toBeUndefined();
      expect(req.request.body.notes).toBeUndefined();
      req.flush({});
    });
  });

  describe('apply()', () => {
    it('should POST to /api/v1/payments/advances/{id}/apply and return updated advance', () => {
      const applyRequest: ApplyAdvanceRequest = {
        advancePaymentId: 'adv-1',
        invoiceId: 'inv-1',
        appliedAmount: 2000,
      };

      const mockResponse: Advance = {
        id: 'adv-1',
        supplierId: 'supplier-1',
        supplierName: 'Proveedor A',
        amount: 5000,
        remainingAdvance: 3000,
        method: 'EFECTIVO',
        reference: 'REF-001',
        createdAt: '2026-05-23T10:00:00Z',
      };

      service.apply(applyRequest).subscribe((result) => {
        expect(result).toEqual(mockResponse);
        expect(result.remainingAdvance).toBe(3000);
      });

      const req = httpMock.expectOne('/api/v1/payments/advances/adv-1/apply');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(applyRequest);
      req.flush(mockResponse);
    });
  });

  describe('signals', () => {
    it('should initialize page to 0', () => {
      expect(service.page()).toBe(0);
    });

    it('should initialize size to 20', () => {
      expect(service.size()).toBe(20);
    });

    it('should initialize supplierId to null', () => {
      expect(service.supplierId()).toBeNull();
    });

    it('should update page signal when set', () => {
      service.page.set(2);
      expect(service.page()).toBe(2);
    });

    it('should update supplierId signal when set', () => {
      service.supplierId.set('sup-123');
      expect(service.supplierId()).toBe('sup-123');
      // Reset back to null for triangulation
      service.supplierId.set(null);
      expect(service.supplierId()).toBeNull();
    });
  });
});
