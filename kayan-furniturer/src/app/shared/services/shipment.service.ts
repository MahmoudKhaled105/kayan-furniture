import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface Shipment {
  id: number;
  supplier_id: number;
  container_number?: string;
  estimated_arrival?: string;
  date_received: string;
  declared_value: number;
  amount_paid: number;
  remaining_balance: number;
  payment_status: 'unpaid' | 'partial' | 'settled';
  partial_delivery: 0 | 1;
  status: 'PENDING' | 'IN_TRANSIT' | 'ARRIVED';
  delivery_status?: 'pending' | 'in_transit' | 'received';
  image_url?: string;
  notes?: string;
  account_notes?: string;
  supplier_name?: string;
  installments?: any[];
}

export interface ShipmentStats {
  status_distribution: { payment_status: string; count: number }[];
  financial_summary: {
    total_declared: number;
    total_paid: number;
    total_outstanding: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ShipmentService {
  private http = inject(HttpClientService);

  getShipments(): Observable<Shipment[]> {
    return this.http.get<Shipment[]>('/shipments');
  }

  getShipment(id: number): Observable<Shipment> {
    return this.http.get<Shipment>(`/shipments/${id}`);
  }

  getShipmentStats(): Observable<ShipmentStats> {
    return this.http.get<ShipmentStats>('/shipments/stats');
  }

  createShipment(shipment: Partial<Shipment>): Observable<Shipment> {
    return this.http.post<Shipment>('/shipments', shipment);
  }

  updateShipment(id: number, shipment: Partial<Shipment>): Observable<Shipment> {
    return this.http.patch<Shipment>(`/shipments/${id}`, shipment);
  }

  deleteShipment(id: number): Observable<any> {
    return this.http.delete<any>(`/shipments/${id}`);
  }

  uploadFile(formData: FormData): Observable<any> {
    return this.http.post<any>('/upload', formData);
  }
}
