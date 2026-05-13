import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  type: 'CHINA' | 'TURKEY' | 'LOCAL';
}

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private http = inject(HttpClientService);

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>('/suppliers');
  }

  getSupplier(id: number): Observable<Supplier> {
    return this.http.get<Supplier>(`/suppliers/${id}`);
  }

  createSupplier(supplier: Partial<Supplier>): Observable<Supplier> {
    return this.http.post<Supplier>('/suppliers', supplier);
  }

  updateSupplier(id: number, supplier: Partial<Supplier>): Observable<Supplier> {
    return this.http.patch<Supplier>(`/suppliers/${id}`, supplier);
  }

  deleteSupplier(id: number): Observable<any> {
    return this.http.delete<any>(`/suppliers/${id}`);
  }
}
