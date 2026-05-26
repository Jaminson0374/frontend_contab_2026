export interface CustomPrice {
  id: string;
  clientId: string;
  clientName: string;
  productId: string;
  productName: string;
  price: number;
  taxType: string;
  taxRate: number;
}

export interface CustomPriceRequest {
  clientId: string;
  productId: string;
  price: number;
  taxType: string;
  taxRate: number;
}
