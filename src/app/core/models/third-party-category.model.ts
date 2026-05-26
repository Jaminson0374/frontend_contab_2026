export interface ThirdPartyCategory {
  id: string;
  name: string;
  baseType: 'CLIENT' | 'SUPPLIER' | 'EMPLOYEE' | 'BOTH';
  active: boolean;
}

export interface ThirdPartyCategoryRequest {
  name: string;
  baseType: string;
}
