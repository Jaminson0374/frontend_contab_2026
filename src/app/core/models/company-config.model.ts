export interface CompanyConfigRequest {
  companyName: string;
  nit: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  economicActivity: string | null;
  taxRegime: string | null;
  currency: string;
  mainWarehouseId: string | null;
  logoUrl: string | null;
  moratoryInterestRate: number | null;
  interestGraceDays: number | null;
  interestCompoundFrequency: string | null;
  costingMethod: string | null;
  overheadAllocationBase: string | null;
  overheadRate: number | null;
  dianResolutionId: string | null;
  softwarePin: string | null;
  certificateId: string | null;
  purchaseRetefuenteRate: number | null;
}

export interface CompanyConfigResponse {
  id: number;
  companyName: string;
  nit: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  economicActivity: string | null;
  taxRegime: string | null;
  currency: string;
  mainWarehouseId: string | null;
  logoUrl: string | null;
  moratoryInterestRate: number | null;
  interestGraceDays: number | null;
  interestCompoundFrequency: string | null;
  costingMethod: string | null;
  overheadAllocationBase: string | null;
  overheadRate: number | null;
  dianResolutionId: string | null;
  softwarePin: string | null;
  certificateId: string | null;
  purchaseRetefuenteRate: number | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}
