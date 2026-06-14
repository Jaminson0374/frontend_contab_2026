import '@angular/compiler';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DevolutionService } from './devolution.service';
import { DevolutionRequest, DevolutionResponse } from '../models/devolution.model';

describe('DevolutionService', () => {
  let service: DevolutionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DevolutionService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DevolutionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('submit()', () => {
    it('should POST to /api/v1/pos/devolutions with correct body and return response', () => {
      const request: DevolutionRequest = {
        invoiceId: 'inv-123',
        items: [{ productId: 'prod-1', quantity: 2 }],
        reason: 'Producto defectuoso',
      };

      const mockResponse: DevolutionResponse = {
        creditNoteId: 'cn-1',
        documentNumber: 'CN-001',
        items: [],
        totalReturned: 50000,
        stockReversed: true,
        totalAmount: -50000,
        reversedItems: 2,
        arAdjustment: -50000,
      };

      service.submit(request).subscribe((result) => {
        expect(result.creditNoteId).toBe('cn-1');
        expect(result.documentNumber).toBe('CN-001');
        expect(result.totalAmount).toBe(-50000);
        expect(result.reversedItems).toBe(2);
        expect(result.arAdjustment).toBe(-50000);
      });

      const req = httpMock.expectOne('/api/v1/pos/devolutions');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should POST with multiple items', () => {
      const request: DevolutionRequest = {
        invoiceId: 'inv-456',
        items: [
          { productId: 'prod-a', quantity: 1 },
          { productId: 'prod-b', quantity: 3 },
        ],
        reason: 'Cambio de producto',
      };

      service.submit(request).subscribe((result) => {
        expect(result.reversedItems).toBe(3);
      });

      const req = httpMock.expectOne('/api/v1/pos/devolutions');
      expect(req.request.body.items).toHaveLength(2);
      req.flush({ reversedItems: 3 });
    });
  });

  describe('error handling', () => {
    it('should propagate HTTP errors from submit()', () => {
      const request: DevolutionRequest = {
        invoiceId: 'inv-err',
        items: [{ productId: 'prod-1', quantity: 2 }],
        reason: 'Producto defectuoso',
      };

      service.submit(request).subscribe({
        error: (err) => {
          expect(err.status).toBe(500);
        },
      });

      const req = httpMock.expectOne('/api/v1/pos/devolutions');
      req.flush('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      });
    });
  });

  describe('getByInvoice()', () => {
    it('should GET /api/v1/pos/devolutions with invoiceId param', () => {
      const invoiceId = 'inv-789';

      service.getByInvoice(invoiceId).subscribe();

      const req = httpMock.expectOne(`/api/v1/pos/devolutions?invoiceId=${invoiceId}`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should return array of SalesDocument', () => {
      const invoiceId = 'inv-999';
      const mockDocuments = [
        {
          id: 'cn-1',
          documentNumber: 'CN-001',
          totalAmount: -30000,
          type: 'CREDIT_NOTE',
          status: 'ISSUED',
        },
        {
          id: 'cn-2',
          documentNumber: 'CN-002',
          totalAmount: -15000,
          type: 'CREDIT_NOTE',
          status: 'ISSUED',
        },
      ];

      service.getByInvoice(invoiceId).subscribe((result) => {
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('cn-1');
        expect(result[1].documentNumber).toBe('CN-002');
      });

      const req = httpMock.expectOne(`/api/v1/pos/devolutions?invoiceId=${invoiceId}`);
      req.flush(mockDocuments);
    });
  });
});
