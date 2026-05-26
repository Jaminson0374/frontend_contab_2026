export interface ProductPresentation {
  id: string;
  productId: string;
  code: string;
  name: string;
  unitOfMeasureId: string;
  unitOfMeasureName: string;
  conversionFactor: number;
  salePrice: number | null;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPresentationRequest {
  code: string;
  name: string;
  unitOfMeasureId: string;
  conversionFactor: number;
  salePrice: number | null;
  isDefault: boolean;
}
