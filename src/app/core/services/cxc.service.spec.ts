import '@angular/compiler';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CxcService } from './cxc.service';
import { AccountsReceivable } from '../models/cxc.model';

describe('CxcService', () => {
  let service: CxcService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CxcService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CxcService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateInterest()', () => {
    it('should POST to /api/v1/accounts-receivable/calculate-interest with empty body', () => {
      const mockResponse = {
        processedCount: 3,
        totalInterestAccrued: 15000,
        skippedCount: 1,
      };

      service.calculateInterest().subscribe((result) => {
        expect(result.processedCount).toBe(3);
        expect(result.totalInterestAccrued).toBe(15000);
        expect(result.skippedCount).toBe(1);
      });

      const req = httpMock.expectOne('/api/v1/accounts-receivable/calculate-interest');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });

    it('should return processedCount, totalInterestAccrued, and skippedCount', () => {
      const mockResponse = {
        processedCount: 5,
        totalInterestAccrued: 23000,
        skippedCount: 2,
      };

      service.calculateInterest().subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/v1/accounts-receivable/calculate-interest');
      req.flush(mockResponse);
    });

    it('should handle all-zero response when no ARs are eligible', () => {
      const mockResponse = {
        processedCount: 0,
        totalInterestAccrued: 0,
        skippedCount: 0,
      };

      service.calculateInterest().subscribe((result) => {
        expect(result.processedCount).toBe(0);
        expect(result.totalInterestAccrued).toBe(0);
        expect(result.skippedCount).toBe(0);
      });

      const req = httpMock.expectOne('/api/v1/accounts-receivable/calculate-interest');
      req.flush(mockResponse);
    });

    it('should propagate HTTP errors', () => {
      service.calculateInterest().subscribe({
        error: (err) => {
          expect(err.status).toBe(500);
        },
      });

      const req = httpMock.expectOne('/api/v1/accounts-receivable/calculate-interest');
      req.flush('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      });
    });
  });

  describe('getIntereses()', () => {
    const mockAccounts: AccountsReceivable[] = [
      {
        id: 'ar-1',
        clientId: 'client-1',
        clientName: 'Cliente A',
        documentId: 'inv-1',
        documentNumber: 'FAC-001',
        totalAmount: 500000,
        paidAmount: 0,
        outstanding: 500000,
        dueDate: '2026-01-15',
        status: 'OVERDUE',
        createdAt: '2025-12-15T10:00:00Z',
        updatedAt: '2026-05-20T10:00:00Z',
        interestRate: 3.0,
        interestAmount: 15000,
        lastInterestCalcDate: '2026-06-10',
      },
      {
        id: 'ar-2',
        clientId: 'client-1',
        clientName: 'Cliente A',
        documentId: 'inv-2',
        documentNumber: 'FAC-002',
        totalAmount: 300000,
        paidAmount: 100000,
        outstanding: 200000,
        dueDate: '2026-02-01',
        status: 'OVERDUE',
        createdAt: '2026-01-01T10:00:00Z',
        updatedAt: '2026-05-20T10:00:00Z',
        interestRate: null,
        interestAmount: 6000,
        lastInterestCalcDate: '2026-06-10',
      },
    ];

    it('should GET /api/v1/accounts-receivable/intereses without clientId param', () => {
      service.getIntereses().subscribe();

      const req = httpMock.expectOne('/api/v1/accounts-receivable/intereses');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should GET /api/v1/accounts-receivable/intereses?clientId={id} when clientId provided', () => {
      service.getIntereses('client-1').subscribe();

      const req = httpMock.expectOne('/api/v1/accounts-receivable/intereses?clientId=client-1');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should return AccountsReceivable[] with interest fields populated', () => {
      service.getIntereses('client-1').subscribe((result) => {
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('ar-1');
        expect(result[0].interestAmount).toBe(15000);
        expect(result[0].lastInterestCalcDate).toBe('2026-06-10');
        expect(result[1].interestAmount).toBe(6000);
      });

      const req = httpMock.expectOne('/api/v1/accounts-receivable/intereses?clientId=client-1');
      req.flush(mockAccounts);
    });

    it('should return empty array when no intereses exist', () => {
      service.getIntereses().subscribe((result) => {
        expect(result).toHaveLength(0);
      });

      const req = httpMock.expectOne('/api/v1/accounts-receivable/intereses');
      req.flush([]);
    });
  });
});
