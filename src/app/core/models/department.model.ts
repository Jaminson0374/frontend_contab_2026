export interface Department {
  id: string;
  code: string;
  name: string;
}

export interface City {
  id: string;
  code: string;
  name: string;
  departmentId: string;
}
