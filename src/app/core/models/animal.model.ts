export type Species = 'PORCINO' | 'BOVINO' | 'OVINO';

export type AnimalStatus = 'RECEIVED' | 'IN_SLAUGHTER' | 'SLAUGHTERED';

export interface Animal {
  id: string;
  supplierId: string;
  icaLotNumber: string;
  species: Species;
  liveWeight: number;
  status: AnimalStatus;
  receptionDate: string;
  notes: string | null;
  createdAt: string;
}

export interface AnimalRequest {
  supplierId: string;
  icaLotNumber: string;
  species: Species;
  liveWeight: number;
  receptionDate: string;
  notes: string | null;
}
