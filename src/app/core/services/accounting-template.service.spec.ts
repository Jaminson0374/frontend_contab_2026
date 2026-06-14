import '@angular/compiler';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AccountingTemplateService } from './accounting-template.service';
import {
  AccountingTemplate,
  AccountingTemplateRequest,
  AccountingTemplateEntryRequest,
} from '../models/accounting-template.model';

describe('AccountingTemplateService', () => {
  let service: AccountingTemplateService;
  let httpMock: HttpTestingController;

  const mockTemplate: AccountingTemplate = {
    id: 'tpl-1',
    code: 'DEFAULT_SALE',
    name: 'Plantilla Venta por Defecto',
    description: 'Plantilla base para ventas',
    module: 'SALE',
    isDefault: true,
    isActive: true,
    entries: [
      {
        id: 'entry-1',
        templateId: 'tpl-1',
        eventType: 'SALE_RECEIVABLE',
        accountId: 'acc-1',
        accountCode: '1305',
        accountName: 'Cuentas por cobrar',
        isDebit: true,
        priority: 1,
      },
    ],
    createdAt: '2026-05-31T10:00:00Z',
    updatedAt: '2026-05-31T10:00:00Z',
  };

  const mockRequest: AccountingTemplateRequest = {
    code: 'DEFAULT_SALE',
    name: 'Plantilla Venta por Defecto',
    description: null,
    module: 'SALE',
    isDefault: true,
    isActive: true,
    entries: [
      {
        eventType: 'SALE_RECEIVABLE',
        accountId: 'acc-1',
        isDebit: true,
        priority: 1,
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AccountingTemplateService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AccountingTemplateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getById()', () => {
    it('should GET /api/v1/accounting-templates/{id} and return template', () => {
      service.getById('tpl-1').subscribe((result) => {
        expect(result).toEqual(mockTemplate);
        expect(result.module).toBe('SALE');
        expect(result.entries.length).toBe(1);
      });

      const req = httpMock.expectOne('/api/v1/accounting-templates/tpl-1');
      expect(req.request.method).toBe('GET');
      req.flush(mockTemplate);
    });

    it('should return entry details when template has entries', () => {
      service.getById('tpl-2').subscribe((result) => {
        expect(result.entries[0].eventType).toBe('PURCHASE_PAYABLE');
        expect(result.entries[0].isDebit).toBe(false);
      });

      const req = httpMock.expectOne('/api/v1/accounting-templates/tpl-2');
      const purchaseTemplate = {
        ...mockTemplate,
        id: 'tpl-2',
        module: 'PURCHASE' as const,
        entries: [{ ...mockTemplate.entries[0], eventType: 'PURCHASE_PAYABLE', isDebit: false }],
      };
      req.flush(purchaseTemplate);
    });
  });

  describe('create()', () => {
    it('should POST to /api/v1/accounting-templates with request body', () => {
      service.create(mockRequest).subscribe((result) => {
        expect(result.id).toBe('tpl-new');
        expect(result.code).toBe('DEFAULT_SALE');
      });

      const req = httpMock.expectOne('/api/v1/accounting-templates');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockRequest);
      req.flush({ ...mockTemplate, id: 'tpl-new' });
    });

    it('should POST with description as null when not provided', () => {
      const requestWithoutDesc = { ...mockRequest, description: null };
      service.create(requestWithoutDesc).subscribe();

      const req = httpMock.expectOne('/api/v1/accounting-templates');
      expect(req.request.body.description).toBeNull();
      req.flush({});
    });
  });

  describe('update()', () => {
    it('should PUT to /api/v1/accounting-templates/{id} with request body', () => {
      service.update('tpl-1', mockRequest).subscribe((result) => {
        expect(result.code).toBe('DEFAULT_SALE');
      });

      const req = httpMock.expectOne('/api/v1/accounting-templates/tpl-1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(mockRequest);
      req.flush(mockTemplate);
    });
  });

  describe('delete()', () => {
    it('should DELETE /api/v1/accounting-templates/{id}', () => {
      service.delete('tpl-1').subscribe((result) => {
        expect(result).toBeNull();
      });

      const req = httpMock.expectOne('/api/v1/accounting-templates/tpl-1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
