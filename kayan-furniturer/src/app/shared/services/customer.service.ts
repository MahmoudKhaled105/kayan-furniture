import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  notes?: string;
  created_at?: string;
}

export interface CustomerOrder {
  id: number;
  customer_id: number;
  customer_name: string;
  location_id: number;
  location_name: string;
  order_date: string;
  agreed_price: number;
  total_paid: number;
  remaining_balance: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private http = inject(HttpClientService);

  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>('/customers');
  }

  getCustomer(id: number): Observable<Customer> {
    return this.http.get<Customer>(`/customers/${id}`);
  }

  createCustomer(customer: Partial<Customer>): Observable<Customer> {
    return this.http.post<Customer>('/customers', customer);
  }

  updateCustomer(id: number, customer: Partial<Customer>): Observable<Customer> {
    return this.http.patch<Customer>(`/customers/${id}`, customer);
  }

  getCustomerOrders(id: number): Observable<CustomerOrder[]> {
    return this.http.get<CustomerOrder[]>(`/customers/${id}/orders`);
  }

  getCustomerPayments(id: number): Observable<any[]> {
    return this.http.get<any[]>(`/customers/${id}/payments`);
  }
}
