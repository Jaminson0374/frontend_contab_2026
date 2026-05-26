export type WarehouseType = 'CANAL' | 'CORTES' | 'VISCERAS' | 'EMBUTIDOS' | 'DECOMISOS' | 'GENERAL';

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  warehouseType: WarehouseType;
  active: boolean;
  createdAt: string;
}

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  CANAL:     'Canal',
  CORTES:    'Cortes',
  VISCERAS:  'Vísceras',
  EMBUTIDOS: 'Embutidos',
  DECOMISOS: 'Decomisos',
  GENERAL:   'General',
};
