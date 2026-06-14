export interface AccountingTemplateEntry {
  id: string;
  templateId: string;
  eventType: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  isDebit: boolean;
  priority: number;
}

export interface AccountingTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: 'SALE' | 'PURCHASE';
  isDefault: boolean;
  isActive: boolean;
  entries: AccountingTemplateEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountingTemplateRequest {
  code: string;
  name: string;
  description: string | null;
  module: string;
  isDefault: boolean;
  isActive: boolean;
  entries: AccountingTemplateEntryRequest[];
}

export interface AccountingTemplateEntryRequest {
  eventType: string;
  accountId: string;
  isDebit: boolean;
  priority: number;
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  SALE_RECEIVABLE: 'Cuenta por cobrar',
  SALE_INCOME: 'Ingreso por venta',
  SALE_COGS: 'Costo de venta',
  SALE_INVENTORY_OUT: 'Salida de inventario',
  SALE_TAX: 'IVA generado',
  SALE_RETENTION: 'Retención en la fuente',
  SALE_DISCOUNT: 'Descuento comercial',
  PURCHASE_INVENTORY: 'Entrada de inventario',
  PURCHASE_PAYABLE: 'Cuenta por pagar',
  PURCHASE_TAX: 'IVA descontable',
  PURCHASE_RETENTION: 'Retención por pagar',
  PURCHASE_DISCOUNT: 'Descuento en compras',
};

export const MODULE_LABELS: Record<string, string> = {
  SALE: 'Ventas',
  PURCHASE: 'Compras',
};
