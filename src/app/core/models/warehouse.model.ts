export type WarehouseType = 'CANAL' | 'CORTES' | 'VISCERAS' | 'EMBUTIDOS' | 'DECOMISOS' | 'GENERAL';

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  warehouseType: WarehouseType;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  CANAL: 'Canal',
  CORTES: 'Cortes',
  VISCERAS: 'Vísceras',
  EMBUTIDOS: 'Embutidos',
  DECOMISOS: 'Decomisos',
  GENERAL: 'General',
};
