export interface PurchaseRetentionConfigRequest {
  code: string;
  name: string;
  description: string | null;
  rate: number;
  baseMin: number;
  appliesToTaxRegime: string | null;
  appliesToPersonType: string | null;
  sortOrder: number;
}

export interface PurchaseRetentionConfig {
  id: string;
  code: string;
  name: string;
  description: string | null;
  rate: number;
  baseMin: number;
  appliesToTaxRegime: string | null;
  appliesToPersonType: string | null;
  active: boolean;
  sortOrder: number;
}
