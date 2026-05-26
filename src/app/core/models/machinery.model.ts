export type MachineryType =
  | 'MOLINO'
  | 'MEZCLADORA'
  | 'EMBUTIDORA'
  | 'AHUMADOR'
  | 'EMPACADORA'
  | 'SELLADORA'
  | 'BASCULA'
  | 'OTHER';
export type MachineryStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'DECOMMISSIONED';

export interface Machinery {
  id: string;
  code: string;
  name: string;
  machineryType: MachineryType;
  status: MachineryStatus;
  createdAt: string;
}
