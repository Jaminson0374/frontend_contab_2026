export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  userId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogFilter {
  entityType?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
}
