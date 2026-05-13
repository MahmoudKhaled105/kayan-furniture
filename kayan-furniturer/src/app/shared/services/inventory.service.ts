import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface InventoryItem {
  id: number;
  name: string;
  category?: string;
  location_id?: number;
  location_name?: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductItem {
  id: number;
  shipment_id?: number;
  location_id: number;
  location_name?: string;
  name: string;
  category?: string;
  description?: string;
  purchase_value: number;
  sale_price: number;
  status: 'in_storage' | 'sold' | 'reserved' | 'in_transit';
  thumbnail_url?: string;
  images?: string[];
  part_ids?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClientService);

  // Bulk Inventory
  getInventory(params?: any): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>('/inventory', params);
  }

  getInventoryItem(id: number): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(`/inventory/${id}`);
  }

  createInventoryItem(item: Partial<InventoryItem>): Observable<InventoryItem> {
    return this.http.post<InventoryItem>('/inventory', item);
  }

  updateInventoryItem(id: number, item: Partial<InventoryItem>): Observable<InventoryItem> {
    return this.http.patch<InventoryItem>(`/inventory/${id}`, item);
  }

  deleteInventoryItem(id: number): Observable<any> {
    return this.http.delete<any>(`/inventory/${id}`);
  }

  // Products / Items
  getItems(params?: any): Observable<ProductItem[]> {
    return this.http.get<ProductItem[]>('/items', params);
  }

  getItem(id: number): Observable<ProductItem> {
    return this.http.get<ProductItem>(`/items/${id}`);
  }

  createItem(item: Partial<ProductItem>): Observable<ProductItem> {
    return this.http.post<ProductItem>('/items', item);
  }

  updateItem(id: number, item: Partial<ProductItem>): Observable<ProductItem> {
    return this.http.patch<ProductItem>(`/items/${id}`, item);
  }

  deleteItem(id: number): Observable<any> {
    return this.http.delete<any>(`/items/${id}`);
  }

  transferItem(id: number, data: { to_location_id: number, transfer_date: string, transport_cost?: number, notes?: string }): Observable<any> {
    return this.http.post<any>(`/items/${id}/transfer`, data);
  }

  getStockValue(locationId?: number): Observable<any> {
    return this.http.get<any>('/inventory/stock-value', locationId ? { location_id: locationId } : {});
  }

  getLocations(): Observable<any[]> {
    return this.http.get<any[]>('/inventory/locations');
  }

  getItemTransfers(id: number): Observable<any[]> {
    return this.http.get<any[]>(`/items/${id}/transfers`);
  }
}
