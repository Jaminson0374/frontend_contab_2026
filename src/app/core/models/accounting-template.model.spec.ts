import { describe, expect, it } from 'vitest';
import { EVENT_TYPE_LABELS, MODULE_LABELS } from './accounting-template.model';

describe('AccountingTemplateModel — Constants', () => {
  describe('EVENT_TYPE_LABELS', () => {
    it('should have labels for all SALE event types', () => {
      expect(EVENT_TYPE_LABELS['SALE_RECEIVABLE']).toBe('Cuenta por cobrar');
      expect(EVENT_TYPE_LABELS['SALE_INCOME']).toBe('Ingreso por venta');
      expect(EVENT_TYPE_LABELS['SALE_COGS']).toBe('Costo de venta');
      expect(EVENT_TYPE_LABELS['SALE_INVENTORY_OUT']).toBe('Salida de inventario');
      expect(EVENT_TYPE_LABELS['SALE_TAX']).toBe('IVA generado');
      expect(EVENT_TYPE_LABELS['SALE_RETENTION']).toBe('Retención en la fuente');
      expect(EVENT_TYPE_LABELS['SALE_DISCOUNT']).toBe('Descuento comercial');
    });

    it('should have labels for all PURCHASE event types', () => {
      expect(EVENT_TYPE_LABELS['PURCHASE_INVENTORY']).toBe('Entrada de inventario');
      expect(EVENT_TYPE_LABELS['PURCHASE_PAYABLE']).toBe('Cuenta por pagar');
      expect(EVENT_TYPE_LABELS['PURCHASE_TAX']).toBe('IVA descontable');
      expect(EVENT_TYPE_LABELS['PURCHASE_RETENTION']).toBe('Retención por pagar');
      expect(EVENT_TYPE_LABELS['PURCHASE_DISCOUNT']).toBe('Descuento en compras');
    });

    it('should have exactly 12 event type entries', () => {
      expect(Object.keys(EVENT_TYPE_LABELS).length).toBe(12);
    });
  });

  describe('MODULE_LABELS', () => {
    it('should have SALE label', () => {
      expect(MODULE_LABELS['SALE']).toBe('Ventas');
    });

    it('should have PURCHASE label', () => {
      expect(MODULE_LABELS['PURCHASE']).toBe('Compras');
    });

    it('should have exactly 2 module entries', () => {
      expect(Object.keys(MODULE_LABELS).length).toBe(2);
    });
  });
});
