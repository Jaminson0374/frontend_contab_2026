export type CollectionStatus = 'PENDING' | 'CONTACTED' | 'PROMISED' | 'PAID' | 'DISPUTED';

export interface CollectionEntry {
  id: string;
  clientId: string;
  clientName: string | null;
  arId: string;
  documentNumber: string | null;
  dueDate: string;
  status: CollectionStatus;
  lastContactDate: string | null;
  contactMethod: string | null;
  contactNotes: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LogContactRequest {
  contactMethod: string;
  contactNotes: string;
  newStatus: CollectionStatus;
}
