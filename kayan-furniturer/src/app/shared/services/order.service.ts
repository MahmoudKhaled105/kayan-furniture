import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface Order {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  item_id?: number;
  location_id: number;
  location_name: string;
  agreed_price: number;
  total_paid: number;
  remaining_balance: number;
  status: string;
  is_backorder: boolean;
  backorder_description?: string;
  order_date: string;
  expected_arrival?: string;
  delivery_status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClientService);

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>('/orders');
  }

  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`/orders/${id}`);
  }

  createOrder(order: any): Observable<Order> {
    return this.http.post<Order>('/orders', order);
  }

  addPayment(orderId: number, payment: any): Observable<any> {
    return this.http.post<any>(`/orders/${orderId}/payments`, payment);
  }

  fulfillOrder(orderId: number, itemId: number): Observable<Order> {
    return this.http.post<Order>(`/orders/${orderId}/fulfill`, { item_id: itemId });
  }

  updateDeliveryStatus(orderId: number, status: string): Observable<Order> {
    return this.http.patch<Order>(`/orders/${orderId}`, { delivery_status: status });
  }

  getBackorders(): Observable<Order[]> {
    return this.http.get<Order[]>('/orders/backorders');
  }

  getOrderPayments(orderId: number): Observable<any[]> {
    return this.http.get<any[]>(`/orders/${orderId}/payments`);
  }
}
